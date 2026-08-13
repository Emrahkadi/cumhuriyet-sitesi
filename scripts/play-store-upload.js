// Google Play Developer API - Uygulama Olustur (JWT auth)
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEY_PATH = 'C:\\Users\\emrah\\Desktop\\play-service-account.json';
const PACKAGE_NAME = 'com.cumhuriyetsitesi.app';

async function main() {
    console.log('=== Google Play Developer API ===');
    console.log('Paket:', PACKAGE_NAME);
    console.log('');

    // JWT auth - service account icin en iyi yontem
    const auth = new google.auth.JWT({
        keyFile: KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    await auth.authorize();
    console.log('OK: Auth basarili');

    const play = google.androidpublisher({ version: 'v3', auth });

    // 1. Yeni edit olustur
    console.log('\n=== EDIT OLUSTUR ===');
    const insertRes = await play.edits.insert({
        packageName: PACKAGE_NAME
    });
    const editId = insertRes.data.id;
    console.log('OK: Edit olusturuldu, ID =', editId);

    // 2. AAB yolu
    const aabPath = path.join(
        __dirname, '..', 'twa-project', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'
    );
    const aabAbsolute = path.resolve(aabPath);
    console.log('AAB:', aabAbsolute);
    if (!fs.existsSync(aabAbsolute)) {
        throw new Error('AAB dosyasi bulunamadi: ' + aabAbsolute);
    }
    console.log('AAB boyut:', fs.statSync(aabAbsolute).size, 'bytes');

    // 3. AAB yükle
    console.log('\n=== AAB YUKLEME ===');
    const uploadRes = await play.edits.bundles.upload({
        packageName: PACKAGE_NAME,
        editId: editId,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(aabAbsolute)
        },
        ackBundleInstallationWarning: true
    });
    console.log('OK: AAB yuklendi, versionCode =', uploadRes.data.versionCode);
    const versionCode = uploadRes.data.versionCode;

    // 4. Internal test track'a at
    console.log('\n=== TRACK ATA (Internal) ===');
    await play.edits.tracks.update({
        packageName: PACKAGE_NAME,
        editId: editId,
        track: 'internal',
        requestBody: {
            track: 'internal',
            releases: [{
                versionCodes: [versionCode.toString()],
                status: 'completed'
            }]
        }
    });
    console.log('OK: Internal track\'a atandi');

    // 5. Commit
    console.log('\n=== EDIT COMMIT ===');
    const commitRes = await play.edits.commit({
        packageName: PACKAGE_NAME,
        editId: editId
    });
    console.log('OK: Edit commit edildi');
    console.log('Edit ID:', commitRes.data.id);

    console.log('\n=== BASARILI ===');
    console.log('AAB Play Store\'a yuklendi!');
    console.log('Internal test track\'a atandi.');
}

main().catch((err) => {
    console.error('HATA:', err.message);
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else if (err.errors) {
        console.error('Detay:', JSON.stringify(err.errors, null, 2));
    }
    process.exit(1);
});
