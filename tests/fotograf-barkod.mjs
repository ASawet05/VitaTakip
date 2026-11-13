/* Gerçek EAN-13 görseli üretip fotoğraf olarak yükler; fotoğraftan barkod okuma akışlarını doğrular. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot({ preload: () => { delete window.BarcodeDetector; } }); // masaüstü/iOS gibi BarcodeDetector olmayan ortam
let dialogs = 0; p.on('dialog', d => { dialogs++; d.dismiss(); });
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'); localStorage.setItem('vitatakip_camera_app_approved', 'true'); });

const makeFile = (code) => p.evaluate(async code => {
  const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const PAR = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  const d = code.split('').map(Number); let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (PAR[d[0]][i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010'; for (let i = 7; i <= 12; i++) bits += R[d[i]]; bits += '101';
  const m = 4, q = 12 * m, c = document.createElement('canvas'); c.width = bits.length * m + 2 * q; c.height = 260;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000';
  [...bits].forEach((bit, i) => { if (bit === '1') x.fillRect(q + i * m, 20, m, 200); });
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  window.__testFile = new File([blob], 'IMG_20261113_101500.png', { type: 'image/png' });
  return c.width;
}, code);
const feed = (inputId) => p.evaluate(id => { const inp = document.getElementById(id); const dt = new DataTransfer(); dt.items.add(window.__testFile); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); }, inputId);

const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* 1) Takviye ekle → "Fotoğraftan barkod oku" */
const supCode = await p.evaluate(() => {
  const valid = c => { const d = c.split('').map(Number); const s = d.slice(0, 12).reduce((a, x, i) => a + x * (i % 2 ? 3 : 1), 0); return (10 - s % 10) % 10 === d[12]; };
  return (window.VITA_SUPPLEMENT_DB || []).map(x => String(x.barcode)).find(c => /^\d{13}$/.test(c) && valid(c));
});
await makeFile(supCode);
await p.evaluate(() => openAddSupplementModal()); await sleep(400);
await feed('addSupAiPhotoInput'); await sleep(3500);
const r1 = await p.evaluate(() => ({ fb: (document.getElementById('addSupBarcodeFeedbackBox')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160), name: document.getElementById('manualSupName')?.value || document.getElementById('vsAddName')?.value || '' }));
log('Takviye ekle: fotoğraftaki barkod okunur ve ürün bulunur (BarcodeDetector yokken ZXing)', /Tanındı|okundu|bulundu|eşleşti/i.test(r1.fb) && r1.name.length > 0 && !/bulunamadı|okunamadı/i.test(r1.fb), `kod=${supCode} | ${r1.fb} | ad=${r1.name}`);
await p.evaluate(() => closeAddSupplementModal());

/* 2) Barkod penceresi → fotoğraf seçilince otomatik okuma */
await makeFile('8699514010050');
await p.evaluate(() => openBarcodeScannerModal('medication', 'all')); await sleep(500);
await feed('barcodePhotoFile'); await sleep(3500);
const r2 = await p.evaluate(() => ({ manual: document.getElementById('barcodeManualValue')?.value || '', decoded: (document.getElementById('barcodeDecodedResult')?.innerText || '').replace(/\s+/g, ' ').slice(0, 120), status: (document.getElementById('barcodeProductLookupStatus')?.innerText || '').replace(/\s+/g, ' ').slice(0, 140) }));
log('Barkod penceresi: fotoğraf seçilince barkod otomatik okunur', r2.manual === '8699514010050', JSON.stringify(r2));

/* 3) Barkodsuz fotoğraf: dürüst mesaj, ürün uydurulmaz */
await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 400, 300); const blob = await new Promise(r => c.toBlob(r, 'image/png')); window.__testFile = new File([blob], 'IMG_kutu.png', { type: 'image/png' }); });
await p.evaluate(() => { closeBarcodeScannerModal(); openAddSupplementModal(); }); await sleep(400);
await feed('addSupAiPhotoInput'); await sleep(3500);
const r3 = await p.evaluate(() => ({ fb: (document.getElementById('addSupBarcodeFeedbackBox')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200), name: document.getElementById('manualSupName')?.value || '' }));
log('Barkodsuz fotoğrafta ürün uydurulmaz, açık mesaj verilir', /barkod bulunamadı/i.test(r3.fb) && !r3.name, JSON.stringify(r3));

log('Anahtar yokken fotoğraf için Gemini onayı sorulmaz (hiçbir şey gönderilmez)', dialogs === 0, String(dialogs));

/* 4) Gemini anahtarı yokken yapay zekâ düğmeleri soluk ve nedenini açıklar; barkod okuma anahtarsız çalışır */
const r4 = await p.evaluate(() => { updateApiKeyUI(); return [...document.querySelectorAll('[data-vita-requires-gemini]')].map(b => ({ dim: b.classList.contains('opacity-60'), title: b.title })); });
log('Anahtar yokken yapay zekâ düğmeleri "anahtar gerekli" olarak işaretli', r4.length >= 2 && r4.every(x => x.dim && /API anahtarı/.test(x.title)), String(r4.length));
log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
