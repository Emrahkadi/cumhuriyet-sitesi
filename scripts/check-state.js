// Check current app state and bundles
const { google } = require('googleapis');

async function checkState() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    // 1. List existing edits
    try {
        const edits = await play.edits.list({ packageName: 'com.cumhuriyetsitesi.app' });
        console.log('Existing edits:', JSON.stringify(edits.data, null, 2));
    } catch (e) {
        console.log('edits.list HATA:', e.code, e.message);
    }

    // 2. Get app details
    try {
        const app = await play.applications.get({ packageName: 'com.cumhuriyetsitesi.app' });
        console.log('\nApp details:');
        console.log('  Package:', app.data.packageName);
        console.log('  Default language:', app.data.defaultLanguage);
        console.log('  Contact email:', app.data.contactEmail);
    } catch (e) {
        console.log('applications.get HATA:', e.code, e.response?.status, JSON.stringify(e.response?.data || e.message));
    }

    // 3. List existing bundles via inappproducts? No - we use edit artifacts
    // Try edit artifacts
    try {
        const artifacts = await play.edits.artifacts.list({
            packageName: 'com.cumhuriyetsitesi.app',
            editId: '08388931159673513006'
        });
        console.log('\nArtifacts in current edit:', JSON.stringify(artifacts.data, null, 2));
    } catch (e) {
        console.log('artifacts.list HATA:', e.code, e.response?.status, JSON.stringify(e.response?.data || e.message));
    }
}

checkState();
