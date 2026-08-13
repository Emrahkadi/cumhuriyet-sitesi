# TWA Build - Manuel Kurulum (Android Studio GUI)

## 📋 Durum
✅ JDK 17 kurulu (Temurin)
✅ Android SDK 34 kurulu
✅ Release Key oluşturuldu (twa-release-key.jks, şifre: changeit)
✅ Bubblewrap kuruldu
✅ assetlinks.json SHA-256 ile güncellendi
✅ Feature Graphic hazır (public/store/feature-graphic.png)

## 🎯 Android Studio ile Build

### 1️⃣ Android Studio'yu İndir
https://developer.android.com/studio adresinden **Android Studio Koala (2024.3.2)** indir.

### 2️⃣ Kurulum
- Setup Wizard takip et
- Standard kurulum
- SDK zaten kurulu (C:\Users\emrah\Desktop\android-sdk), Android Studio otomatik algılar

### 3️⃣ Projeyi Aç
- File → Open → `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-project`
- VEYA: Build → New Project → Empty Activity → Min SDK 24, Target SDK 34

### 4️⃣ Signing Config Ekle (build.gradle)
**app/build.gradle** dosyasında:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("../twa-release-key.jks")
            storePassword "changeit"
            keyAlias "twa"
            keyPassword "changeit"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 5️⃣ Build AAB
- Build → Generate Signed Bundle / APK
- **Android App Bundle** seç → Next
- Release → keystore: `twa-release-key.jks`, password: `changeit`
- Finish
- Çıktı: `app/release/app-release.aab`

### 6️⃣ Play Store'a Yükle
- Play Console → Cumhuriyet Sitesi uygulaması → Üretim → Yeni sürüm
- `app-release.aab` dosyasını yükle
- Sürüm notları: "İlk sürüm"
- Review için gönder

---

## 🐛 Bubblewrap CLI Çalışmıyor (Windows)

Bubblewrap'ın interaktif prompt'ları terminal ortamında çalışmıyor.
**Çözüm**: Android Studio GUI kullanmak (yukarıdaki adımlar).

Alternatif: **TWA projesini GitHub'dan klonla** ve manifest'i değiştir:
```
git clone https://github.com/nicejob/nicejob-bubblewrap
```

---

## 📂 Dosya Konumları

| Dosya | Konum |
|---|---|
| Release Key | `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-release-key.jks` |
| Manifest | `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\public\manifest.json` |
| TWA Config | `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-manifest.json` |
| assetlinks | `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\public\.well-known\assetlinks.json` |
| Feature Graphic | `C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\public\store\feature-graphic.png` |
| Android SDK | `C:\Users\emrah\Desktop\android-sdk` |
| JAVA_HOME | `C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot` |

---

## ✅ Deploy Sonrası Doğrulama

`https://cumhuriyetsitesi.org/.well-known/assetlinks.json` → 200 OK JSON dönmeli

`adb shell pm list packages | grep com.cumhuriyetsitesi` → App listelenmeli

`adb shell am start -n com.cumhuriyetsitesi.app/.MainActivity` → Uygulama açılmalı