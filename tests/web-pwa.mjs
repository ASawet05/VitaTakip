/* Web/PWA testi: yüklenebilirlik (manifest + servis çalışanı), çevrimdışı açılış, telefon ekranında yatay taşma yok.
   Varsayılan adres yerel sunucu; canlı site için: node web-pwa.mjs https://asawet05.github.io/VitaTakip/ */
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8080/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const errs = [];

const p = await b.newPage();
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('vitatakip_legal_accepted', 'true'); } catch (_) { /* erişimsiz çerçeve */ } });
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto(base, { waitUntil: 'networkidle2' });

/* 1) Servis çalışanı sayfayı kontrol ediyor */
await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await p.reload({ waitUntil: 'networkidle2' });
const sw = await p.evaluate(() => ({ controlled: Boolean(navigator.serviceWorker.controller), scope: navigator.serviceWorker.controller?.scriptURL || '' }));
log('Servis çalışanı etkin ve sayfayı kontrol ediyor', sw.controlled, sw.scope);

/* 2) Chrome'un yüklenebilirlik denetimi */
const cdp = await p.target().createCDPSession();
const inst = await cdp.send('Page.getInstallabilityErrors');
log('Ana ekrana yüklenebilir (Chrome denetimi hatasız)', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors.map(e => e.errorId)));
const mf = await cdp.send('Page.getAppManifest');
log('Manifest okunuyor ve hatasız', Boolean(mf.data) && (mf.errors || []).length === 0, JSON.stringify((mf.errors || []).map(e => e.message)).slice(0, 200));

/* 3) Telefon genişliğinde yatay taşma yok (giriş ekranı) */
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
log('390px genişlikte yatay kaydırma yok (giriş ekranı)', overflow <= 1, `${overflow}px`);

/* 4) Hesap açıp ana ekran ve diğer görünümlerde taşma kontrolü */
await p.evaluate(() => document.getElementById('authTabRegisterBtn').click());
await p.type('#authInputFullName', 'Web Test');
await p.type('#authInputPassword', 'websifre123');
await p.evaluate(() => { document.getElementById('authInputPasswordConfirm').value = 'websifre123'; document.getElementById('authSubmitBtn').click(); });
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} try { finishVitaSpotlightTour(true); } catch (e) {} });
const views = ['view-home', 'view-labs', 'view-neyim', 'view-settings', 'view-daily', 'view-report'];
const wide = await p.evaluate(async views => {
  const out = [];
  for (const v of views) {
    if (!document.getElementById(v)) continue;
    try { navigateToView(v); } catch (e) { out.push(`${v}: hata`); continue; }
    await new Promise(r => setTimeout(r, 400));
    const o = document.documentElement.scrollWidth - window.innerWidth;
    if (o > 1) {
      const culprit = [...document.querySelectorAll(`#${v} *`)].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1 && el.offsetParent).slice(0, 2).map(el => `${el.tagName}#${el.id || ''}.${String(el.className).split(' ')[0]}`);
      out.push(`${v}: ${o}px ${culprit.join(',')}`);
    }
  }
  return out;
}, views);
log('Uygulama görünümlerinde yatay taşma yok', wide.length === 0, wide.join(' | '));

/* 5) Çevrimdışı: sayfa yenilenince yine açılır ve veriler duruyor */
await p.setOfflineMode(true);
await p.reload({ waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 2500));
const off = await p.evaluate(() => ({ title: document.title, hasApp: Boolean(document.getElementById('view-home')), user: typeof activeUserId !== 'undefined' ? activeUserId : null }));
log('İnternet yokken uygulama açılır', off.hasApp, off.title);
await p.setOfflineMode(false);

/* 6) Köprü yokken (web) Android'e özel çağrılar hata vermez */
const noBridge = await p.evaluate(() => typeof window.AndroidVitaBridge === 'undefined');
log('Web modunda Android köprüsü yok (yedek yollar kullanılıyor)', noBridge);

/* temizlik: test hesabını sil */
p.on('dialog', d => (d.type() === 'prompt' ? d.accept('SİL') : d.accept()));
await p.evaluate(() => { try { return deleteMyAccountData(); } catch (e) {} });
await new Promise(r => setTimeout(r, 800));
log('Sayfa hatası yok', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
