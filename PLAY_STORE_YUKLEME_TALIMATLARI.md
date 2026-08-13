# Play Store'a Yükleme - Cumhuriyet Sitesi TWA

## AAB Hazır ✅

**Dosya**: `twa-project/app/build/outputs/bundle/release/app-release.aab`
**Boyut**: 2.1 MB
**İmza**: `twa-release-key.jks` ile (SHA-256: 2D:DE:D1:A4:95:F7:9A:BF:...)
**Paket**: `com.cumhuriyetsitesi.app`
**Versiyon**: 1.0.0 (versionCode: 1)

## Adım Adım Yükleme

### 1. Google Play Console'a giriş
- https://play.google.com/console
- Hesabınızla giriş yapın (zaten onayladınız)

### 2. Yeni uygulama oluştur
- "Tüm uygulamalar" → **"Uygulama oluştur"**
- **Uygulama adı**: Cumhuriyet Sitesi
- **Varsayılan dil**: Türkçe
- **Uygulama veya oyun**: **Uygulama**
- **Ücretsiz/ücretli**: Ücretsiz
- "Oluştur" tıkla

### 3. Mağaza girişi (Store Listing)
Sol menüden **"Mağaza girişi"** → aşağıdaki bilgileri doldurun:

**Kısa açıklama (80 karakter)**:
```
Site sakinleri için duyuru, anket ve iletişim portalı
```

**Uzun açıklama (4000 karakter)**:
`PLAY_STORE_ICERIK.md` dosyasındaki uzun açıklama metnini kullanın.

**Uygulama ikonu**:
- 512x512 PNG dosyası gerekli
- Mevcut: `public/icons/icon-512.png` veya `public/store/feature-graphic.png` değil, **ayrı 512x512 uygulama ikonu**
- Eğer elinizde yoksa, `scripts/create-feature-graphic.ps1` benzer bir script ile oluşturabilirsiniz

**Özellik grafiği (Feature Graphic)**:
- 1024x500 PNG
- **Zaten hazır**: `public/store/feature-graphic.png` ✅

**Ekran görüntüleri**:
- En az 2, en çok 8
- Telefon veya tablet ekran görüntüsü
- Siteyi ziyaret edip ekran görüntüsü alın: https://cumhuriyetsitesi.org

**Kategori**: **Haberler / Dergi** veya **Topluluk**

**İletişim bilgileri**:
- E-posta: info@cumhuriyetsitesi.org
- Web sitesi: https://cumhuriyetsitesi.org

### 4. Gizlilik ve veri toplama
- "Gizlilik politikası" URL'i: https://cumhuriyetsitesi.org/gizlilik (yoksa oluşturun)
- "Uygulama gizlilik politikası" bölümünde:
  - Veri toplama: **Evet** (üye kayıt, push bildirim için)
  - Veri türleri: Ad-soyad, daire no, telefon, e-posta
- Tüm bölümleri doldurun

### 5. Hedef kitle
- **Yaş grubu**: Tüm yaşlar
- **Hedeflediğiniz cihazlar**: Telefonlar, tabletler

### 6. Sürüm oluşturma
Sol menüden **"Üretim"** → **"Yeni sürüm oluştur"**

- **Sürüm adı**: `1.0.0`
- **Sürüm kodu**: `1` (otomatik)
- **`app-release.aab`** dosyasını yükleyin (drag & drop veya seç)
- **Sürüm notları**: 
```
İlk sürüm:
- Duyurular ve anlık bildirimler
- Anket sistemi (hane bazlı oy)
- İletişim ve mesajlaşma
- Üye ve sakin yönetimi
- Kentsel dönüşüm bilgilendirme
- PWA + TWA (telefonda uygulama gibi çalışır)
```

### 7. İnceleme için gönder
- Tüm zorunlu bölümler dolu ise **"Gözden geçirme için gönder"** butonu aktif olur
- Tıkla ve gönder
- **1-7 gün** içinde Google onay/red verecek

### 8. Onay sonrası
- Onay gelince uygulama Play Store'da görünür olur
- Kullanıcılar indirebilir
- `https://play.google.com/store/apps/details?id=com.cumhuriyetsitesi.app` URL'i aktif olur

## Yapılacaklar Özet

| Adım | Süre |
|---|---|
| Mağaza girişi formu | 10-15 dk |
| Ekran görüntüleri (2-8) | 5-10 dk |
| Uygulama ikonu (512x512) | 5 dk |
| Gizlilik politikası URL'i | 5 dk |
| Sürüm yükleme | 2 dk |
| **Toplam** | **~30-40 dk** |
| Play Store inceleme | 1-7 gün |

## Yapılacaklar (Benim Tarafımdan)

✅ **AAB** derlendi ve imzalandı
✅ **Tüm manifest, build config, kaynak dosyalar** hazır
✅ **assetlinks.json** SHA-256 ile yapılandırıldı
✅ **feature-graphic.png** hazır (1024x500)
✅ **Release key** SHA-256 alındı
✅ **Icon setleri** 5 dpi seviyesinde üretildi

**Size kalan**: Play Console'a dosyaları yüklemek ve formları doldurmak.

## Gizlilik Politikası (Opsiyonel)

Eğer gizlilik politikası URL'i yoksa basit bir tane oluşturmamı isterseniz haber verin, `cumhuriyetsitesi.org/gizlilik` adresinde bir tane hazırlayalım.