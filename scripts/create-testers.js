// Create email list for internal testing
const { google } = require('googleapis');

async function createTestersList() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    console.log('=== Test Kullanıcı Listesi Oluştur ===');

    // 1. Create email list
    try {
        const res = await play.testers.create({
            packageName: 'com.cumhuriyetsitesi.app',
            track: 'internal',
            requestBody: {
                emailLists: [{
                    emailList: 'cumhuriyet-test-users',
                    emails: ['test1@example.com', 'test2@example.com']
                }]
            }
        });
        console.log('OK Email listesi oluşturuldu');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message));
    }
}

createTestersList();
