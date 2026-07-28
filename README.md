# Cumhuriyet Sitesi Web Portalı

Site sakinleri için duyuru, iletişim, kentsel dönüşüm ve üyelik yönetimi sunan çoklu sayfalı web sitesi. Node.js + Express + SQLite ile geliştirilmiştir.

## Özellikler

- 🏠 **Ana sayfa** – güncel duyurular
- 📢 **Duyurular** – kategori ve önem etiketleriyle listeleme + detay sayfası
- ℹ️ **Hakkımızda** sayfası
- 🏗️ **Kentsel Dönüşüm** – zaman çizelgesi (timeline) görünümü
- ✉️ **İletişim** – form ile mesaj gönderimi
- 💬 **tawk.to canlı destek** – yer tutucu olarak eklendi (etkinleştirilmesi gerekir)
- 👥 **Üyelik sistemi** – ad soyad, daire no ve telefon ile kayıt/giriş (yönetici onaylı)
- 🔐 **Yönetici paneli** – duyuru, üye, mesaj ve kentsel dönüşüm yönetimi

## Kurulum

```powershell
cd cumhuriyet-sitesi
npm install
npm start
```

Site: http://localhost:3000
Yönetim paneli: http://localhost:3000/yonetim/giris

## Varsayılan Yönetici Girişi

- **Kullanıcı adı:** `admin`
- **Şifre:** `admin123`

> Bu bilgileri `.env` dosyasından değiştirebilirsiniz (veritabanı ilk oluşturulurken kullanılır).

## Üyelik Akışı

1. Ziyaretçi `/kayit` sayfasından ad soyad, daire no, telefon ve şifre ile kayıt olur.
2. Kayıt "onay bekliyor" durumunda oluşur.
3. Yönetici, panelden (**Üyeler**) üyeyi onaylar.
4. Üye artık `/giris` üzerinden telefon + şifre ile giriş yapabilir.

## tawk.to Canlı Destek Kurulumu

`views/partials/footer.ejs` dosyasındaki tawk.to script bloğunu bulun:

1. https://dashboard.tawk.to adresinden hesap oluşturun.
2. Property ID ve Widget ID değerlerini alın.
3. `YOUR_PROPERTY_ID/YOUR_WIDGET_ID` kısmını kendi kodunuzla değiştirin.
4. Script bloğunun yorum işaretlerini (`<!-- -->`) kaldırın.

## Proje Yapısı

```
cumhuriyet-sitesi/
├── server.js          # Express sunucu ve rotalar
├── database.js        # SQLite şema + varsayılan veriler
├── .env               # Ayarlar (port, session, admin bilgileri)
├── data/              # SQLite veritabanı (otomatik oluşur)
├── public/
│   ├── css/           # style.css, admin.css
│   └── js/            # main.js
└── views/
    ├── partials/      # header, footer
    ├── admin/         # yönetim paneli sayfaları
    └── *.ejs          # genel sayfalar
```

## Teknolojiler

- Express 4
- EJS (şablon motoru)
- better-sqlite3 (veritabanı)
- express-session + connect-flash (oturum ve bildirimler)
- bcryptjs (şifre hashleme)
