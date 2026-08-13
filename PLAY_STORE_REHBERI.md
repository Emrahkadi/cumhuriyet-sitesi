# 📱 Cumhuriyet Sitesi - Play Store Yayınlama Kılavuzu

**Yöntem:** TWA (Trusted Web Activity) — PWA'nızı APK olarak paketler.

---

## 🎯 Önkoşullar

- ✅ Google Play Console hesabı (açıldı, onay bekleniyor)
- ✅ Node.js 18+ kurulu
- ✅ JDK 17+ kurulu (Android için)
- ✅ Android Studio (opsiyonel, build için)

---

## 📋 Adım Adım Kurulum

### 1️⃣ Geliştirme Ortamı Hazırlama

#### Android SDK Kurulumu (henüz yoksa)
```bash
# Android Studio'yu indir: https://developer.android.com/studio
# Kurulum sırasında SDK Manager'dan:
#   - Android SDK Platform 34
#   - Android SDK Build-Tools 34.0.0
#   - Android SDK Platform-Tools
#   - Android SDK Command-line Tools (latest)
```

#### ANDROID_HOME ayarla
**Windows PowerShell**:
```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\emrah\AppData\Local\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools", "User")
```

#### Bubblewrap Kurulumu
```bash
npm install -g @nicejob/nicejob-bubblewrap
# veya
npm install --save-dev @nicejob/nicejob-bubblewrap
```

#### Java JDK Kontrol
```bash
java -version
# 17.x.x görmeli
```

---

### 2️⃣ TWA Projesi Oluşturma

Proje dizininde (terminal açıkken):
```bash
npm run twa:init
```

**Sorulacak Sorular**:
- Application package name: `com.cumhuriyetsitesi.app` (Enter)
- Application name: `Cumhuriyet Sitesi` (Enter)
- Display mode: `standalone` (Enter)
- Orientation: `portrait` (Enter)
- Theme color: `#1e5aa8` (Enter)
- Background color: `#ffffff` (Enter)
- Start URL: `/?utm_source=twa` (Enter)
- **Icon URL**: Manifest'ten otomatik alınır (`/icons/icon-512.png`)

**Çıktı**: `twa-project/` dizini oluşur.

---

### 3️⃣ Release Key Oluşturma (Play Store için ZORUNLU)

**Keytool ile**:
```bash
keytool -genkey -v -keystore twa-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias twa
```

**Sorulacaklar**:
- **Şifre**: 2 kez (12+ karakter, **GÜVENLİ YERE KAYDET!**)
- **Ad Soyad**: Cumhuriyet Sitesi
- **Organizasyon**: Cumhuriyet Sitesi
- **Şehir**: Pendik
- **İl**: Istanbul
- **Ülke kodu**: TR

**ÖNEMLİ**: Bu .jks dosyası ve şifresi = UYGULAMANIZIN KİMLİĞİ. **Kaybederseniz** bir daha güncelleyemezsiniz. **Güvenli bir yere yedekleyin** (şifreli disk, 1Password, KeePass).

---

### 4️⃣ Digital Asset Links (Doğrulama)

#### A) SHA-256 Parmak İzi Alma
```bash
keytool -list -v -keystore twa-release-key.jks -alias twa | findstr "SHA1"
# veya powershell
keytool -list -v -keystore twa-release-key.jks -alias twa | Select-String "SHA1"
```

**Çıktıdaki SHA1: değerini** `BURAYA_RELEASE_KEY_SHA256_FINGERPRINT` ile **değiştirin** (`.well-known/assetlinks.json`).

**Gerçek SHA-256 parmak izi** almak için (Play Store'un istediği):
```bash
# Play Store'a yükledikten sonra App Integrity bölümünden alın
# İlk yükleme için SHA-1 yeterli (Play Store otomatik dönüştürür)
```

#### B) Dosyayı Canlıya Yükleme
`public/.well-known/assetlinks.json` Hostinger'a deploy edildiğinde otomatik olarak `https://cumhuriyetsitesi.org/.well-known/assetlinks.json` adresinde erişilebilir olacak.

**Doğrulama**:
```bash
curl -s https://cumhuriyetsitesi.org/.well-known/assetlinks.json
```

---

### 5️⃣ TWA Build (APK/AAB Oluşturma)

#### AAB (Android App Bundle) — Play Store için ÖNERİLEN
```bash
npm run twa:build
```

**Çıktılar**:
- `twa-project/app/build/outputs/bundle/release/app-release.aab`

#### APK (Test için)
```bash
cd twa-project
./gradlew assembleRelease
# Çıktı: app/build/outputs/apk/release/app-release.apk
```

---

### 6️⃣ Test (Lokal Cihaz)

#### Android Studio Emulator
```bash
npm run twa:install
# veya
adb install app/build/outputs/apk/release/app-release.apk
```

#### Fiziksel Cihaz
```bash
# USB bağla, USB Debug aç
adb devices
adb install -r app-release.apk
```

---

### 7️⃣ Play Store'a Yükleme

#### A) Play Console Giriş
- https://play.google.com/console

#### B) Yeni Uygulama Oluştur
- **"Tüm uygulamalar"** → **"Uygulama oluştur"**
- **Dil**: Türkçe
- **Uygulama adı**: Cumhuriyet Sitesi
- **Varsayılan dil**: Türkçe
- **Uygulama veya oyun**: Uygulama
- **Ücretsiz veya ücretli**: Ücretsiz

#### C) Mağaza Girişi (Store Listing)
`PLAY_STORE_ICERIK.md` dosyasındaki içerikleri kullanın:
- Kısa açıklama
- Uzun açıklama
- Uygulama ikonu (512x512)
- Özellik grafiği (1024x500)
- Ekran görüntüleri (en az 2)

#### D) Sürüm (Release)
- **"Üretim"** → **"Yeni sürüm oluştur"**
- **`app-release.aab`** dosyasını yükle
- **Sürüm adı**: 1.0.0
- **Sürüm kodu**: 1
- **Sürüm notları**: "İlk sürüm"

#### E) İçerik Derecelendirmesi
- Anketi doldurun (uygunsuz içerik yok)
- **"Herkese uygun"** seçin

#### F) Hedef Kitle ve İçerik
- **Hedef yaş**: Tüm yaşlar
- **Reklam**: Hayır
- **Veri toplama**: EVET (uygulama analytics) — gerekli seçin

#### G) Uygulama İçeriği
- **Gizlilik politikası**: https://cumhuriyetsitesi.org/gizlilik
- **Reklam yok** onayı
- **Tüm bölümleri** doldurun

#### H) Gözden Geçirme için Gönder
- **"Gözden geçirme için gönder"** butonuna tıklayın
- **1-7 gün** içinde onay/red gelir

---

## 🔄 Güncelleme (İleride)

```bash
# Yeni versiyon güncellemesi yapıldıktan sonra:
npm run twa:update
npm run twa:build
# Yeni .aab dosyasını Play Console'dan yükleyin
```

---

## 🐛 Sorun Giderme

### "Package name already exists" hatası
- `twa-manifest.json` içinde `packageId` değiştirilmeli
- Play Store'a yüklenmiş bir app ile aynı isim olamaz

### "SHA256 cert fingerprints mismatch" hatası
- `assetlinks.json` içindeki parmak izi yanlış
- Keytool ile doğru SHA1 alıp buraya yazın

### "Site not verified" hatası
- `assetlinks.json` doğru yere yüklenmemiş
- URL'ye tarayıcıdan erişin ve JSON'un döndüğünü doğrulayın

### "Bubblewrap: java not found"
- JDK 17+ kurulumu gerekli
- `JAVA_HOME` ortam değişkeni ayarlayın

---

## 📊 Yararlı Linkler

- Bubblewrap: https://github.com/nicejob/nicejob-bubblewrap
- TWA Rehberi: https://developer.chrome.com/docs/android/trusted-web-activity/
- Play Console: https://play.google.com/console
- Google Policies: https://play.google.com/about/developer-content-policy/

---

## ✅ Yapılacaklar Özet

| Adım | Süre | Sorumluluk |
|---|---|---|
| Google Play Console onayı | 24-48 saat | Beklemede |
| Android Studio + SDK kurulumu | 1-2 saat | Siz (tek seferlik) |
| Bubblewrap kurulumu | 5 dakika | Siz |
| Release key oluşturma | 2 dakika | Siz |
| TWA başlatma ve build | 30 dakika | Siz |
| SHA-256 alma + assetlinks.json güncelleme | 5 dakika | Siz |
| Play Store'a yükleme | 1-2 saat | Siz |
| Play Store onayı | 1-7 gün | Bekleme |

**Toplam aktif çalışma**: ~4-5 saat
**Toplam süre**: 1-2 hafta (onay dahil)
