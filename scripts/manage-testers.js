// Manage testers for internal testing
const { google } = require('googleapis');

async function manageTesters() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    console.log('=== Test Kullanıcıları ===\n');

    // Try the testers API
    try {
        // Get current testers
        const res = await play.testers.get({
            packageName: 'com.cumhuriyetsitesi.app',
            track: 'internal'
        });
        console.log('Current testers:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('GET testers HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }

    // Try create with email lists
    try {
        const res = await play.testers.update({
            packageName: 'com.cumhuriyetsitesi.app',
            track: 'internal',
            requestBody: {
                emailLists: [
                    {
                        emailList: 'internal-testers',
                        emails: [
                            'info@cumhuriyetsitesi.org'
                        ]
                    }
                ]
            }
        });
        console.log('\nOK Testers updated:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('\nUPDATE testers HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }
}

manageTesters().catch(e => {
    console.error('GENEL HATA:', e.message);
});
