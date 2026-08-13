// Update internal track with testers info
const { google } = require('googleapis');

async function updateTrackWithTesters() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    console.log('=== Internal Track + Testers ===\n');

    // 1. New edit
    const editRes = await play.edits.insert({ packageName: 'com.cumhuriyetsitesi.app' });
    const editId = editRes.data.id;
    console.log('OK Edit ID:', editId);

    // 2. Update internal track with testers
    try {
        const res = await play.edits.tracks.update({
            packageName: 'com.cumhuriyetsitesi.app',
            editId: editId,
            track: 'internal',
            requestBody: {
                track: 'internal',
                releases: [{
                    versionCodes: ['2'],
                    status: 'completed',
                    releaseNotes: [{
                        language: 'tr-TR',
                        text: 'İlk sürüm - TWA uygulaması Play Store\'da!'
                    }]
                }]
            }
        });
        console.log('OK Track updated');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Track HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }

    // 3. Commit
    try {
        const commitRes = await play.edits.commit({
            packageName: 'com.cumhuriyetsitesi.app',
            editId: editId
        });
        console.log('OK Commit:', commitRes.data.id);
    } catch (e) {
        console.log('Commit HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }
}

updateTrackWithTesters();
