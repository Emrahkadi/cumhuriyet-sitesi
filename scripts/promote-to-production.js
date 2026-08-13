// Promote from internal to production
const { google } = require('googleapis');

async function promoteToProduction() {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const c = await auth.getClient();
    const play = google.androidpublisher({ version: 'v3', auth: c });

    console.log('=== Production\'a Terfi ===\n');

    // 1. New edit
    const editRes = await play.edits.insert({ packageName: 'com.cumhuriyetsitesi.app' });
    const editId = editRes.data.id;
    console.log('OK Edit ID:', editId);

    // 2. Promote version 2 to production with rollout 10%
    try {
        const res = await play.edits.tracks.update({
            packageName: 'com.cumhuriyetsitesi.app',
            editId: editId,
            track: 'production',
            requestBody: {
                track: 'production',
                releases: [{
                    versionCodes: ['2'],
                    status: 'completed',
                    userFraction: 0.1,
                    status: 'inProgress',
                    releaseNotes: [{
                        language: 'tr-TR',
                        text: '🎉 Cumhuriyet Sitesi uygulaması Play Store\'da!\n\n• Site yönetim portalı\n• Güncel duyurular\n• Kentsel dönüşüm takibi\n• Anlık push bildirimler\n• Canlı destek'
                    }]
                }]
            }
        });
        console.log('OK Production track updated (10% rollout)');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Production HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
        return;
    }

    // 3. Commit
    try {
        const commitRes = await play.edits.commit({
            packageName: 'com.cumhuriyetsitesi.app',
            editId: editId
        });
        console.log('\nOK Commit:', commitRes.data.id);
        console.log('\n=== BAŞARILI ===');
        console.log('v1.0.1 (versionCode 2) Production\'a %10 rollout ile terfi ettirildi!');
    } catch (e) {
        console.log('Commit HATA:', e.code || e.response?.status);
        console.log('Body:', JSON.stringify(e.response?.data || e.message, null, 2));
    }
}

promoteToProduction();
