package com.cumhuriyetsitesi.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final String DEFAULT_URL = "https://cumhuriyetsitesi.org/?utm_source=twa";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri url = getIntent() != null && getIntent().getData() != null
                ? getIntent().getData()
                : Uri.parse(DEFAULT_URL);

        // Chrome Custom Tabs TWA - Android System handles this automatically
        // when assetlinks.json is configured correctly
        // Just open the URL in a browser with VIEW action
        Intent intent = new Intent(Intent.ACTION_VIEW, url);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }
}