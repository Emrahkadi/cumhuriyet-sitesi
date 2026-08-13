// Test internal sharing upload
const { google } = require('googleapis');
const fs = require('fs');

async function testInternalSharing() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });
    const aab = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\twa-project\\app\\build\\outputs\\bundle\\release\\app-release.aab';

    try {
        const r = await play.internalappsharingartifacts.upload({
            packageName: 'com.cumhuriyetsitesi.app',
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(aab)
            }
        });
        console.log('OK internal sharing:', JSON.stringify(r.data));
    } catch (e) {
        console.log('Internal sharing HATA:');
        console.log('Status:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message));
    }
}

testInternalSharing();
