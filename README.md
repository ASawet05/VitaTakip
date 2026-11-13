# VitaTakip

Vitamin, takviye, ilaç ve tahlil takibi için sağlık uygulaması. Arayüz `app/src/main/assets/vita_web` klasöründeki web uygulamasıdır; Android uygulaması bunu bir WebView içinde gösterir.

- Veriler yalnızca cihazda tutulur (localStorage / IndexedDB); uygulamanın sunucusu yoktur.
- İsteğe bağlı Google Gemini: kullanıcı kendi API anahtarını Ayarlar'a girerse ve onay verirse kullanılır; aksi hâlde yerel yanıt motoru çalışır.

## Web sitesi
`main` dalına her gönderimde `.github/workflows/deploy-web.yml` yalnızca `vita_web` klasörünü GitHub Pages'e yayınlar (Pages kaynağı: GitHub Actions).
Web dosyalarını değiştirdiğinizde `vita_web/sw.js` içindeki `CACHE_VERSION` değerini artırın.

## Android derleme
Gereken: JDK 21, Android SDK.

- **Debug:** depo kökünde `debug.keystore` bulunmalıdır (gizlilik için depoya eklenmez). Yoksa oluşturun:
  ```
  keytool -genkeypair -keystore debug.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
  ./gradlew assembleDebug
  ```
- **Yayın (release):** imza anahtarı depo dışında saklanır; şu ortam değişkenleriyle derlenir:
  `KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD` (anahtar adı `upload`) → `./gradlew assembleRelease`.
  Her yeni sürümde `app/build.gradle.kts` içindeki `versionCode` artırılmalı ve **aynı anahtarla** imzalanmalıdır; aksi hâlde güncelleme kurulmaz.
- Testler: `./gradlew testDebugUnitTest` (Windows'ta `JAVA_TOOL_OPTIONS=-Duser.language=en` gerekebilir).

## Uçtan uca testler
`tests/README.md` dosyasına bakın.
