/* Hesap kalıcılığı: adında "Örnek", "Deneme", "Test", "Misafir" geçen gerçek hesaplar sayfa yenilenince silinmez.
   (Eski kural bu adları demo sanıp her açılışta hesabı ve tüm verilerini siliyordu.) */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot({ register: false });
p.on('dialog', d => d.accept());
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const names = ['Ayşe Örnek', 'Mehmet Deneme', 'Ali Test', 'Misafir Kaya'];
for (const name of names) {
  await p.evaluate(() => { if (activeUserId) { activeUserId = null; resetApplicationDOMAndState(); } try { closeProfileModal(); } catch (e) {} openAuthModal(); switchAuthMode('register'); });
  await p.evaluate(n => { document.getElementById('authInputFullName').value = n; document.getElementById('authInputPassword').value = 'sifre12345'; document.getElementById('authInputPasswordConfirm').value = 'sifre12345'; document.getElementById('authSubmitBtn').click(); }, name);
  await sleep(2500);
  await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} state.hydration = state.hydration || {}; state.hydration.current = 750; saveState(); });
}
/* Eski sabit kimlikli misafir hesabı yine temizlenmeli */
await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]'); u.push({ id: 'usr_guest_local', fullName: 'Misafir', password: 'x' }); localStorage.setItem('vitatakip_users_db', JSON.stringify(u)); });
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
const after = await p.evaluate(() => JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]').map(u => u.fullName));
for (const name of names) log(`"${name}" hesabı yenilemeden sonra duruyor`, after.includes(name), after.join(', '));
log('Eski sabit kimlikli misafir hesabı (usr_guest_local) temizlenir', !after.includes('Misafir'));
const water = await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('vitatakip_users_db') || '[]').find(x => x.fullName === 'Ayşe Örnek'); return u ? Object.keys(localStorage).filter(k => k.includes(u.id)).length : 0; });
log('"Ayşe Örnek" hesabının verileri de duruyor', water > 0, `${water} kayıt`);
log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
