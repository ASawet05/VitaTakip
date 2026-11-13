/* Yerel hesap şifresi: PBKDF2 + kullanıcı başına tuz, Türkçe karakter çakışması yok, eski kayıtların taşınması. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot({ register: false });
let promptAnswer = 'SİL';
p.on('dialog', d => (d.type() === 'prompt' ? d.accept(promptAnswer) : d.accept()));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

const auth = async (mode, name, pass) => {
  await p.evaluate(m => { try { closeProfileModal(); } catch (e) {} if (activeUserId) { activeUserId = null; resetApplicationDOMAndState(); } openAuthModal(); switchAuthMode(m); }, mode);
  await p.evaluate((n, pw) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set('authInputFullName', n); set('authInputPassword', pw); set('authInputPasswordConfirm', pw);
    document.getElementById('authSubmitBtn').click();
  }, name, pass);
  await sleep(2500);
  return p.evaluate(() => ({ uid: activeUserId, err: document.getElementById('authErrorMsg')?.innerText || '' }));
};
const usersDb = () => p.evaluate(() => JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]'));

/* 1) Kayıt: PBKDF2 biçiminde, tuzlu */
const r1 = await auth('register', 'Şule Işık', 'ışık2345678');
const u1 = (await usersDb()).find(u => u.fullName === 'Şule Işık');
log('Türkçe şifreyle kayıt olunur', Boolean(r1.uid), r1.err);
log('Şifre PBKDF2 + tuz biçiminde saklanır', /^pbkdf2\$310000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]{40,}$/.test(u1?.password || ''), u1?.password?.slice(0, 30));

/* 2) Türkçe karakter çakışması yok: "ı"→"1" benzeri şifre reddedilir */
// Eski fonksiyonda "ı" (ilk konumda) "1" ile aynı sayılıyordu.
const collides = await p.evaluate(() => sha256('ışık2345678') === sha256('1şık2345678'));
const r2 = await auth('login', 'Şule Işık', '1şık2345678');
log('Eski fonksiyonda çakışan şifre artık kabul edilmez', collides && !r2.uid, `eskiÇakışma=${collides} | ${r2.err}`);
const r3 = await auth('login', 'Şule Işık', 'ışık2345678');
log('Doğru Türkçe şifreyle giriş yapılır', Boolean(r3.uid), r3.err);

/* 3) Aynı şifre iki hesapta farklı özet üretir (kullanıcı başına tuz) */
await auth('register', 'Ali Veli', 'ışık2345678');
const db = await usersDb();
const a = db.find(u => u.fullName === 'Şule Işık')?.password, c = db.find(u => u.fullName === 'Ali Veli')?.password;
log('Aynı şifre farklı hesaplarda farklı saklanır', a && c && a !== c);

/* 4) Eski sabit tuzlu sha256 kaydı: doğru şifreyle giriş yapılır ve PBKDF2'ye taşınır */
await p.evaluate(() => {
  const users = JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]');
  users.push({ id: 'usr_eski_1', fullName: 'Eski Kullanici', password: sha256('eskisifre123' + '_vitatakip_salt_2026'), createdDate: new Date().toISOString() });
  localStorage.setItem('vitatakip_users_db', JSON.stringify(users));
});
const r4bad = await auth('login', 'Eski Kullanici', 'yanlis12345');
log('Eski kayıtta yanlış şifre reddedilir', !r4bad.uid);
const r4 = await auth('login', 'Eski Kullanici', 'eskisifre123');
const migrated = (await usersDb()).find(u => u.id === 'usr_eski_1')?.password || '';
log('Eski kayıtla giriş yapılır', r4.uid === 'usr_eski_1', r4.err);
log('Eski kayıt girişte PBKDF2 biçimine taşınır', migrated.startsWith('pbkdf2$'), migrated.slice(0, 20));
const r5 = await auth('login', 'Eski Kullanici', 'eskisifre123');
log('Taşındıktan sonra da giriş yapılır', r5.uid === 'usr_eski_1');

/* 5) Hesap silme onayı: "hayır" iptal eder; küçük harf "sil" de kabul edilir */
promptAnswer = 'hayır';
await p.evaluate(() => deleteMyAccountData()); await sleep(800);
log('Silme onayına "hayır" yazınca hesap kalır', (await usersDb()).some(u => u.id === 'usr_eski_1'));
promptAnswer = 'sil';
await p.evaluate(() => deleteMyAccountData()); await sleep(1200);
log('Silme onayına küçük harf "sil" yazınca hesap silinir', !(await usersDb()).some(u => u.id === 'usr_eski_1'));

log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
