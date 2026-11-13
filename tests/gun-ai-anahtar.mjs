import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot({ preload: () => { localStorage.setItem('vita_gemini_api_key', 'AIzaORTAK_eski_ortak_anahtar'); } });
p.setDefaultTimeout(30000);
let dialogs = 0; p.on('dialog', d => { dialogs++; d.accept(); });
await p.evaluate(() => closeProfileModal()); await sleep(1000);
await p.evaluate(() => { try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* Sahte Gemini sunucusu: gerçek Google'a gidilmez. mode: 'ok' | 'fail' | 'model404' */
const G = { mode: 'ok', reqs: [] };
await p.setRequestInterception(true);
p.on('request', req => {
  const url = req.url();
  if (!url.startsWith('https://generativelanguage.googleapis.com/')) return req.continue();
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  G.reqs.push({ url, method: req.method(), key: req.headers()['x-goog-api-key'] || '', body });
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors });
  const json = (status, obj) => req.respond({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(obj) });
  if (url.includes('/models?')) {
    if (req.headers()['x-goog-api-key'] === 'AIzaGECERSIZ_anahtar_00000') return json(400, { error: { message: 'API key not valid', status: 'INVALID_ARGUMENT' } });
    return json(200, { models: [{ name: 'models/gemini-9.9-flash', supportedGenerationMethods: ['generateContent'] }] });
  }
  if (G.mode === 'fail') return json(503, { error: { message: 'overloaded', status: 'UNAVAILABLE' } });
  if (G.mode === 'model404' && !url.includes('gemini-9.9-flash')) return json(404, { error: { message: 'model not found', status: 'NOT_FOUND' } });
  const hasImage = body?.contents?.some(c => c.parts?.some(x => x.inline_data));
  const text = hasImage
    ? JSON.stringify({ urunAdi: 'Testvit D3 1000 IU', marka: 'Testvit', etkenMadde: 'Kolekalsiferol', form: 'Tablet', dozaj: '1000 IU', kutuAdedi: 60 })
    : 'GEMINI_TEST_YANITI: ferritin düşük görünüyor.';
  return json(200, { candidates: [{ content: { parts: [{ text }] } }] });
});
const clearReqs = () => { G.reqs.length = 0; };

/* 1) Anahtar yokken: yerel motor, hiçbir istek gitmez; eski ortak anahtar hesaba taşınır */
const K0 = await p.evaluate(() => ({ migrated: getGeminiApiKey(), sharedGone: localStorage.getItem('vita_gemini_api_key') === null, input: !!document.getElementById('drawerGeminiApiKeyInput') }));
log('Ayarlarda anahtar alanı var', K0.input);
log('Eski ortak anahtar hesaba taşınır, ortak kopya silinir', K0.migrated === 'AIzaORTAK_eski_ortak_anahtar' && K0.sharedGone, K0.migrated);
await p.evaluate(() => clearGeminiApiKeyFromSettings());
clearReqs();
const noKey = await p.evaluate(async () => { VitaAIChat.toggle && VitaAIChat.toggle(true); VitaAIChat.sendPreset('tahlil'); await new Promise(r => setTimeout(r, 1500)); return document.getElementById('ai-runtime-status')?.innerText || ''; });
log('Anahtar yokken Google\'a istek gitmez', G.reqs.length === 0, String(G.reqs.length));
log('Anahtar yokken yerel mod gösterilir', /yerel|yapılandırılmadı/i.test(noKey), noKey);

/* 2) Geçersiz anahtar kaydedilmez; geçerli anahtar doğrulanıp hesaba kaydedilir */
const bad = await p.evaluate(async () => { await saveGeminiApiKey('AIzaGECERSIZ_anahtar_00000'); return getGeminiApiKey(); });
log('Google\'ın reddettiği anahtar kaydedilmez', bad === '', bad);
const good = await p.evaluate(async () => { await saveGeminiApiKey('AIzaGECERLI_anahtar_123456'); return { key: getGeminiApiKey(), stored: localStorage.getItem('vita_gemini_api_key_' + activeUserId), badge: document.getElementById('apiStatusBadge')?.innerText }; });
log('Geçerli anahtar doğrulanıp hesaba özel kaydedilir', good.key === 'AIzaGECERLI_anahtar_123456' && good.stored === good.key, JSON.stringify(good));
log('Anahtar adres satırında değil başlıkta gider', G.reqs.length > 0 && G.reqs.every(r => !/[?&]key=/.test(r.url)) && G.reqs.some(r => r.key === 'AIzaGECERLI_anahtar_123456'));

/* 3) Anahtar var ama onay yok: sağlık verisi gönderilmez */
clearReqs();
const chatLast = () => p.evaluate(() => { const m = document.querySelectorAll('#ai-chat-messages > *'); return m.length ? m[m.length - 1].innerText.replace(/\s+/g, ' ').slice(0, 300) : ''; });
await p.evaluate(() => { document.getElementById('aiHealthDataConsent').checked = false; VitaAIChat.sendPreset('tahlil'); }); await sleep(1500);
const noConsent = await chatLast();
log('Onay yokken soru Google\'a gönderilmez', G.reqs.filter(r => r.url.includes(':generateContent')).length === 0, String(G.reqs.length));
log('Onay yokken yerel yanıt ve nedeni gösterilir', /onay/i.test(noConsent) && /yerel/i.test(noConsent), noConsent.slice(0, 160));

/* 4) Anahtar + onay: Gemini yanıt verir */
clearReqs(); G.mode = 'ok';
await p.evaluate(() => { const c = document.getElementById('aiHealthDataConsent'); c.checked = true; VitaAIChat.handleConsentChange(true); VitaAIChat.sendPreset('tahlil'); }); await sleep(2500);
const live = await chatLast();
const sent = G.reqs.find(r => r.method === 'POST' && r.url.includes(':generateContent'));
log('Anahtar + onay: yanıt Gemini\'den gelir', /GEMINI_TEST_YANITI/.test(live), live.slice(0, 120));
log('Gemini isteği sistem talimatı (hasta bağlamı) içerir', Boolean(sent?.body?.systemInstruction), sent ? sent.url.split('/models/')[1] : 'istek yok');

/* 5) Gemini hata verirse yerel motora geçer */
clearReqs(); G.mode = 'fail';
await p.evaluate(() => VitaAIChat.sendPreset('tahlil')); await sleep(2500);
const fb = await chatLast();
log('Gemini hata verince yerel motor yanıt verir', /Yerel Bilgi Modu/i.test(fb) && !/GEMINI_TEST_YANITI/.test(fb), fb.slice(0, 160));

/* 6) Önerilen model kaldırılmışsa hesabın erişebildiği modele otomatik geçer */
clearReqs(); G.mode = 'model404';
await p.evaluate(() => { localStorage.removeItem('vita_gemini_models_cache'); localStorage.removeItem('vita_gemini_model_ok'); VitaAIChat.sendPreset('tahlil'); }); await sleep(3000);
const disc = await chatLast();
log('Model bulunamazsa erişilebilen modele geçilir', /GEMINI_TEST_YANITI/.test(disc) && G.reqs.some(r => r.url.includes('gemini-9.9-flash:generateContent')), disc.slice(0, 100));
G.mode = 'ok';

/* 7) Kutu fotoğrafı: onay sorulur, Gemini ürünü tanır ve forma doldurur */
clearReqs(); dialogs = 0;
await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#3a6'; x.fillRect(0, 0, 300, 200);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); window.__kutu = new File([blob], 'IMG_kutu.png', { type: 'image/png' });
  openAddSupplementModal();
});
await sleep(400);
await p.evaluate(() => { const inp = document.getElementById('addSupAiPhotoInput'); const dt = new DataTransfer(); dt.items.add(window.__kutu); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); });
await sleep(4500);
const photo = await p.evaluate(() => ({ fb: (document.getElementById('addSupBarcodeFeedbackBox')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200), name: document.getElementById('manualSupName')?.value || '' }));
log('Fotoğraf gönderilmeden önce onay sorulur', dialogs >= 1, String(dialogs));
log('Barkodsuz kutu fotoğrafı Gemini ile tanınır ve forma dolar', /Testvit/.test(photo.name) && /Gemini/i.test(photo.fb), JSON.stringify(photo));
const photoPosts = G.reqs.filter(r => r.method === 'POST' && r.url.includes(':generateContent'));
log('Fotoğraf isteğine hasta bağlamı eklenmez', photoPosts.length > 0 && photoPosts.every(r => !r.body?.systemInstruction && r.body?.contents?.[0]?.parts?.some(x => x.inline_data)), String(photoPosts.length));
await p.evaluate(() => { try { closeAddSupplementModal(); } catch (e) {} });

/* 8) Anahtar kaldırılınca yerel moda döner */
await p.evaluate(() => clearGeminiApiKeyFromSettings());
const cleared = await p.evaluate(() => ({ key: getGeminiApiKey(), stored: localStorage.getItem('vita_gemini_api_key_' + activeUserId) }));
log('Anahtar kaldırılınca cihazdan silinir', cleared.key === '' && cleared.stored === null);

/* 9) Gün değişimi: açıkken de sıfırlanır */
const D = await p.evaluate(async () => {
  state.supplements = [{ id: 's1', name: 'Test', timing: 'Sabah', taken: true }]; state.hydration = state.hydration || {}; state.hydration.current = 750; saveState();
  const y = new Date(Date.now() - 86400000).toLocaleDateString('tr-TR');
  localStorage.setItem('vitatakip_lastActiveDate_' + activeUserId, y);
  window.dispatchEvent(new Event('focus')); await new Promise(r => setTimeout(r, 300));
  return { taken: state.supplements[0].taken, water: state.hydration.current, date: localStorage.getItem('vitatakip_lastActiveDate_' + activeUserId) === new Date().toLocaleDateString('tr-TR') };
});
log('Gün değişince su sıfırlanır', D.water === 0, String(D.water));
log('Gün değişince takviye işareti sıfırlanır', D.taken === false);
log('Tarih güncellenir', D.date);

/* 10) Yerel yanıt kısa ve öz */
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 34; document.getElementById('modalInputGender').value = 'K'; document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 62; document.getElementById('modalCustomMedications').value = 'Metformin, Pantoprazol'; saveUserProfileFromModal(); });
await sleep(400);
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabFerritin: '9', inputLabB12: '180', inputLabHb: '10.9', inputLabD3: '14', inputLabMg: '1.5', inputLabCreatinine: '0.9' })) { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } } saveCurrentLabRecordWithDate(); });
await sleep(500);
const C = await p.evaluate(async () => {
  VitaAIChat.toggle && VitaAIChat.toggle(true);
  VitaAIChat.sendPreset('tahlil');
  await new Promise(r => setTimeout(r, 4000));
  const all = document.querySelectorAll('.vita-ai-compact'); const el = all[all.length - 1];
  return { found: !!el, len: el ? el.innerText.length : 0, topics: el ? el.querySelectorAll('.vita-ai-topic').length : 0, text: el ? el.innerText.slice(0, 700) : document.body.innerText.slice(-600) };
});
console.log(C.text);
log('Yerel yanıt kompakt biçimde', C.found);
log('Yerel yanıt kısa (≤ 1000 karakter görünür)', C.found && C.len <= 1000, String(C.len));
log('Konular kaybolmaz (≤ 8)', C.topics >= 1 && C.topics <= 8, String(C.topics));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
