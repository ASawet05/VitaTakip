# VitaTakip uçtan uca testleri

Gerçek Chrome ile (puppeteer-core) uygulamayı açıp kullanıcı gibi dener.

## Hazırlık
1. Node.js 20+ kurulu olsun, bu klasörde: `npm i puppeteer-core`
2. Web uygulamasını yerelde sunun (örn. `npx serve -l 8080 app/src/main/assets/vita_web`)
3. `lib.mjs` içindeki Chrome yolunu (`executablePath`) kendi makinenize göre düzenleyin.

## Testler
| Dosya | Ne doğrular |
|---|---|
| `smoke.mjs` | Tüm ekranlar/pencereler açılıyor, konsol hatası ve dış istek yok |
| `uygulama-tanilama.mjs` | Uygulamanın kendi 159 testi (`VitaTakipDiagnostics.run()`) |
| `veri-yasam-dongusu.mjs` | Tahlil silme, belirti kaldırma, yenileme sonrası diriliş yok |
| `tahlil-yasam-dongusu.mjs` | Yanlış tahlil → doğru tahlil, alan boşaltma, taslak kaydı temizliği |
| `analiz-5-senaryo.mjs` | Klinik Analiz'in 5 kullanım senaryosu |
| `hasta-guvenligi.mjs` | Acil uyarılar, 18 yaş altı, gebelik uyarısı, yanlış besin eşleşmesi yok |
| `geri-bildirim.mjs` | Geri bildirim: adres görünmez, ad profilden, cihaza kaydedilir, hiçbir sunucuya istek gitmez |
| `esik-hizalama.mjs` | Hb ve kreatinin eşikleri ekrandaki aralıkla aynı (sınır değerler, cinsiyet, gebelik, tüm parametrelerde tutarlılık) |
| `gebelik.mjs` | Gebelik referans seti: Hb (WHO/CDC), kreatinin, ALT, ferritin, eGFR kapatma, emzirme, uçtan uca |
| `neyimvar-son-adim.mjs` | "Sonuçları Gör" düğmesi yalnızca son adımda görünür |
| `yas-evresi.mjs` | Yaş/cinsiyete göre RDA tablosu, yaş notları, Klinik Analiz/Ayarlar/Rapor entegrasyonu |
| `belirti-kontrol.mjs` | Günlük "belirti hâlâ var mı" kartı |
| `gun-ai-anahtar.mjs` | İsteğe bağlı Gemini (sahte sunucuyla, Google'a gitmeden): anahtarsızken istek yok, geçersiz anahtar reddedilir, anahtar başlıkta gider, onaysız sağlık verisi gönderilmez, hata/kotada yerel motora geçiş, kaldırılmış modelde otomatik model bulma, kutu fotoğrafı onaylı tanıma; gece sıfırlama, kompakt yerel yanıt |
| `rapor.mjs` | Kısa doktor özeti |
| `klinik-mantik.mjs` | Takviye adayı güvenlik değişmezleri (yüksek değerde aday yok, böbrek/hiperkalsemi kilidi, gebelik/çocuk, eGFR) |
| `guvenlik-xss.mjs` | Kullanıcı girdisinin kod olarak çalışmaması (XSS) |
| `ana-sayfa-grafik.mjs` | Ana sayfa karşılama kartı ve tahlil gelişim grafiği |
| `denetim-duzeltmeleri.mjs` | Denetim düzeltmeleri: yedeğin Android köprüsüyle kaydı, içe aktarma doğrulaması, sahte fotoğraf tanıma yok, uydurma barkod yok, hesap silme (IndexedDB dahil), tahlil aralık kontrolü, eksik profil/eGFR, ALT, çoklu sekme |
| `web-pwa.mjs` | Web/PWA: servis çalışanı, Chrome yüklenebilirlik denetimi, manifest, 390px telefon ekranında yatay taşma yok, çevrimdışı açılış, Android köprüsü olmadan çalışma. Canlı site için: `node web-pwa.mjs https://asawet05.github.io/VitaTakip/` |
| `sifre.mjs` | Yerel hesap şifresi: PBKDF2 + kullanıcı başına tuz, Türkçe karakter çakışması yok, eski kayıtların girişte taşınması, hesap silme onayında "sil"/"SİL" |
| `fotograf-barkod.mjs` | Fotoğraftan barkod okuma (BarcodeDetector yokken ZXing), 0 ile başlayan EAN-13/UPC-A eşleşmesi, kamera izni olmadan galeriden fotoğraf, barkodsuz fotoğrafta ürün uydurmama, anahtarsızken Gemini onayı sorulmaması ve yapay zekâ düğmelerinin "anahtar gerekli" işareti |

Çalıştırma: `node smoke.mjs` (her biri bağımsızdır).
