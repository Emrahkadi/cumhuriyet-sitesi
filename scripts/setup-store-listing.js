// Upload screenshots, feature graphic, and store listing to Play Console
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.cumhuriyetsitesi.app';
const STORE_DIR = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\public\\store';

async function setupStoreListing() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    console.log('=== Store Listing Kurulumu ===\n');

    // 1. Edit oluştur
    const editRes = await play.edits.insert({ packageName: PACKAGE_NAME });
    const editId = editRes.data.id;
    console.log('OK Edit ID:', editId);

    // 2. Listing bilgilerini güncelle (Türkçe - Türkiye)
    console.log('\n=== Listing Bilgileri ===');
    try {
        await play.edits.listings.update({
            packageName: PACKAGE_NAME,
            editId: editId,
            language: 'tr-TR',
            requestBody: {
                title: 'Cumhuriyet Sitesi',
                shortDescription: 'Site yönetimi, duyurular, kentsel dönüşüm ve canlı destek.',
                fullDescription: `Cumhuriyet Sitesi sakinlerine özel resmi yönetim portalıdır.

🏢 SİTE YÖNETİMİ
Şeffaf ve erişilebilir yönetim anlayışıyla tüm site işlemlerinizi tek noktadan takip edin.

📢 ANLIK DUYURULAR
Site ile ilgili tüm önemli gelişmelerden, bakım ve aidat bildirimlerinden ilk siz haberdar olun. Push bildirimlerle hiçbir duyuruyu kaçırmayın.

👥 ÜYELİK SİSTEMİ
Daire numaranız ve telefonunuzla kolayca kayıt olun. Site sakinlerine özel alanlara erişim sağlayın.

🏗️ KENTSEL DÖNÜŞÜM
Sitemizin dönüşüm sürecini adım adım takip edin. Süreç hakkında detaylı bilgilendirme ve belgeler.

💬 CANLI DESTEK
Sorularınız için yönetim ile canlı sohbet üzerinden anında iletişime geçin.

📱 PWA TEKNOLOJİSİ
Web Push bildirimleri, çevrimdışı çalışma desteği ve hızlı erişim için "Ana Ekrana Ekle" özelliği.

İLETİŞİM
📍 Yenişehir, 34912 Pendik/İstanbul
📞 +90 532 308 33 31
✉️ info@cumhuriyetsitesi.org`
            }
        });
        console.log('OK Listing güncellendi');
    } catch (e) {
        console.log('Listing HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }

    // 3. Phone screenshots
    console.log('\n=== Phone Screenshots ===');
    const screenshots = [
        'screenshot-1-home.png',
        'screenshot-2-duyurular.png',
        'screenshot-3-kentsel.png',
        'screenshot-4-login.png'
    ];

    for (const ss of screenshots) {
        const filePath = path.join(STORE_DIR, ss);
        try {
            await play.edits.images.upload({
                packageName: PACKAGE_NAME,
                editId: editId,
                language: 'tr-TR',
                imageType: 'phoneScreenshots',
                media: {
                    mimeType: 'image/png',
                    body: fs.createReadStream(filePath)
                }
            });
            console.log('OK', ss);
        } catch (e) {
            console.log('Screenshot HATA:', ss, '-', e.code || e.response?.status);
            console.log('  Body:', JSON.stringify(e.response?.data || e.message));
        }
    }

    // 4. Feature graphic
    console.log('\n=== Feature Graphic ===');
    const fgPath = path.join(STORE_DIR, 'feature-graphic.png');
    try {
        await play.edits.images.upload({
            packageName: PACKAGE_NAME,
            editId: editId,
            language: 'tr-TR',
            imageType: 'featureGraphic',
            media: {
                mimeType: 'image/png',
                body: fs.createReadStream(fgPath)
            }
        });
        console.log('OK feature-graphic.png');
    } catch (e) {
        console.log('Feature graphic HATA:', e.code || e.response?.status);
        console.log('  Body:', JSON.stringify(e.response?.data || e.message));
    }

    // 5. App icon (high-res icon, 512x512)
    console.log('\n=== App Icon ===');
    const iconPath = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\public\\icons\\icon-512.png';
    try {
        await play.edits.images.upload({
            packageName: PACKAGE_NAME,
            editId: editId,
            language: 'tr-TR',
            imageType: 'icon',
            media: {
                mimeType: 'image/png',
                body: fs.createReadStream(iconPath)
            }
        });
        console.log('OK icon-512.png');
    } catch (e) {
        console.log('Icon HATA:', e.code || e.response?.status);
        console.log('  Body:', JSON.stringify(e.response?.data || e.message));
    }

    // 6. Commit
    console.log('\n=== COMMIT ===');
    try {
        const commitRes = await play.edits.commit({
            packageName: PACKAGE_NAME,
            editId: editId
        });
        console.log('OK Commit edildi:', commitRes.data.id);
        console.log('\n=== BAŞARILI ===');
        console.log('Store listing ve görseller yüklendi!');
    } catch (e) {
        console.log('Commit HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }
}

setupStoreListing().catch(e => {
    console.error('GENEL HATA:', e.message);
    if (e.response) {
        console.error('Status:', e.response.status);
        console.error('Body:', JSON.stringify(e.response.data, null, 2));
    }
});
