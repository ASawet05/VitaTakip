/* JSON yedekleme ↔ tarayıcı (localStorage) tam döngüsü: veri gir → "Yedek İndir" → hesabı sil → yeni hesap →
   "Yedekten Geri Yükle" → profil, ilaçlar, takviyeler, sıvı, tahliller, tahlil geçmişi, belirtiler, hekim notu geri gelir
   ve sayfa yenilendikten sonra da localStorage'da kalır. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.on('dialog', d => (d.type() === 'prompt' ? d.accept('SİL') : d.accept()));
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* 1) Veri gir */
await p.evaluate(() => {
  state.user = { ...state.user, age: 52, gender: 'E', height: 178, weight: 81, chronic: ['Metformin', 'Hipertansiyon'] };
  state.supplements = [{ id: 'sup1', name: 'D3 Vitamini 1000 IU', timing: 'Sabah', taken: true }, { id: 'sup2', name: 'Magnezyum', timing: 'Akşam', taken: false }];
  state.hydration = { ...(state.hydration || {}), current: 1500 };
  saveState();
  localStorage.setItem('vitatakip_notes_' + activeUserId, 'Hekime sorulacak: demir takviyesi süresi');
});
/* Tahliller gerçek kullanıcı gibi tahlil formundan girilir */
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabFerritin: '14', inputLabB12: '210', inputLabD3: '18' })) { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } } saveCurrentLabRecordWithDate(); });
await sleep(600);
/* Belirti gerçek kullanıcı gibi NeyimVar? kartına dokunarak seçilir */
const symptomKey = await p.evaluate(async () => {
  navigateToView('view-neyim'); await new Promise(r => setTimeout(r, 400));
  const card = [...document.querySelectorAll('[onclick*="toggleAnamnesisCard"]')].find(c => /toggleAnamnesisCard\(this, '([a-z_]+)'\)/.test(c.getAttribute('onclick')));
  const key = card.getAttribute('onclick').match(/toggleAnamnesisCard\(this, '([a-z_]+)'\)/)[1];
  card.click(); saveState();
  navigateToView('view-home');
  return key;
});

/* 2) Yedek al (indirilen dosyanın içeriği yakalanır) */
const backup = await p.evaluate(() => {
  let captured = null;
  const original = window.vitaSaveTextFile;
  window.vitaSaveTextFile = (name, mime, content) => { captured = { name, content }; return true; };
  try { vitaSaveTextFile = window.vitaSaveTextFile; } catch (_) {}
  exportDataBackup();
  window.vitaSaveTextFile = original; try { vitaSaveTextFile = original; } catch (_) {}
  return captured;
});
const parsed = backup ? JSON.parse(backup.content) : {};
log('Yedek dosyası oluşur (.json)', Boolean(backup) && /\.json$/.test(backup.name), backup?.name);
log('Yedek tüm kayıt türlerini içerir', parsed.user?.age === 52 && parsed.supplements?.length === 2 && parsed.hydration?.current === 1500 && Number(parsed.labValues?.ferritin) === 14 && parsed.labHistory?.length >= 1 && parsed.selectedSymptoms?.includes(symptomKey) && /demir/.test(parsed.doctorNotes || ''),
  Object.keys(parsed).join(','));

/* 3) Hesabı sil, yeni hesap aç, yedeği yükle */
await p.evaluate(() => deleteMyAccountData()); await sleep(1200);
await p.evaluate(() => { openAuthModal(); switchAuthMode('register'); document.getElementById('authInputFullName').value = 'Yeni Cihaz'; document.getElementById('authInputPassword').value = 'yenisifre123'; document.getElementById('authInputPasswordConfirm').value = 'yenisifre123'; document.getElementById('authSubmitBtn').click(); });
await sleep(2500);
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} });
const empty = await p.evaluate(() => ({ sups: state.supplements.length, ferritin: state.labValues?.ferritin ?? null }));
log('Yeni hesap boş başlar', empty.sups === 0 && (empty.ferritin === null || empty.ferritin === ''), JSON.stringify(empty));
await p.evaluate(content => new Promise(resolve => {
  const input = document.getElementById('drawerImportBackupInput') || document.createElement('input');
  const dt = new DataTransfer(); dt.items.add(new File([content], 'yedek.json', { type: 'application/json' }));
  input.files = dt.files;
  importDataBackup({ target: input });
  setTimeout(resolve, 1500);
}), backup.content);

/* 4) Geri geldi mi, yenilemeden sonra localStorage'da kalıyor mu */
const check = async () => p.evaluate(sym => ({
  age: state.user?.age, chronic: (state.user?.chronic || []).join(','), sups: state.supplements.map(s => s.name).join(','),
  water: state.hydration?.current, ferritin: Number(state.labValues?.ferritin), history: state.labHistory?.length,
  symptom: state.selectedSymptoms instanceof Set && state.selectedSymptoms.has(sym), notes: localStorage.getItem('vitatakip_notes_' + activeUserId) || ''
}), symptomKey);
const restored = await check();
const ok = r => r.age === 52 && /Metformin/.test(r.chronic) && /D3/.test(r.sups) && /Magnezyum/.test(r.sups) && r.water === 1500 && r.ferritin === 14 && r.history >= 1 && r.symptom && /demir/.test(r.notes);
log('Yedekten geri yükleme: profil, ilaçlar, takviyeler, sıvı, tahliller, geçmiş, belirti, not geri gelir', ok(restored), JSON.stringify(restored));
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
const afterReload = await check();
log('Geri yüklenen veriler sayfa yenilenince tarayıcıda (localStorage) kalır', ok(afterReload), JSON.stringify(afterReload));
log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
