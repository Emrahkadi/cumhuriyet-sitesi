// Google Play Developer API - AAB yükle (uygulama zaten oluşturulmuş olmalı)
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEY_PATH = 'C:\\Users\\emrah\\Desktop\\play-service-account.json';
const PACKAGE_NAME = 'com.cumhuriyetsitesi.app';

async function upload() {
    console.log('=== Google Play Developer API - AAB Yükleme ===');
    console.log('Paket:', PACKAGE_NAME);
    console.log('');

    const auth = new google.auth.JWT({
        keyFile: KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    await auth.authorize();
    console.log('OK: Auth');

    const play = google.androidpublisher({ version: 'v3', auth });

    // 1. Edit oluştur
    console.log('\n=== EDIT OLUŞTUR ===');
    const editRes = await play.edits.insert({ packageName: PACKAGE_NAME });
    const editId = editRes.data.id;
    console.log('OK: editId =', editId);

    // 2. AAB yükle
    const aabPath = path.resolve(
        __dirname, '..', 'twa-project', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'
    );
    console.log('AAB:', aabPath, '(' + fs.statSync(aabPath).size + ' bytes)');

    console.log('\n=== AAB YÜKLE ===');
    const upRes = await play.edits.bundles.upload({
        packageName: PACKAGE_NAME,
        editId: editId,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(aabPath)
        },
        ackBundleInstallationWarning: true
    });
    const versionCode = upRes.data.versionCode;
    console.log('OK: versionCode =', versionCode);

    // 3. Internal test track
    console.log('\n=== INTERNAL TEST TRACK ===');
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
    console.log('OK');

    // 4. Commit
    console.log('\n=== COMMIT ===');
    const commitRes = await play.edits.commit({
        packageName: PACKAGE_NAME,
        editId: editId
    });
    console.log('OK: Edit commit edildi, ID =', commitRes.data.id);

    console.log('\n=== BAŞARILI ===');
    console.log('AAB Internal test track\'a yüklendi!');
    console.log('Test kullanıcıları ekleyerek test edebilirsiniz.');
    console.log('URL: https://play.google.com/console/u/0/developers/CUMHURIYET/app/' + PACKAGE_NAME);
}

upload().catch(err => {
    console.error('HATA:', err.message);
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Body:', JSON.stringify(err.response.data));
    }
    process.exit(1);
});
