// Inspect AAB proto fields
const { google } = require('googleapis');
const fs = require('fs');
const { execSync } = require('child_process');

const AAB_PATH = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\twa-project\\app\\build\\outputs\\bundle\\release\\app-release.aab';

// Read protoBundleConfig.pb
const { spawnSync } = require('child_process');
const r = spawnSync('powershell', ['-NoProfile', '-Command', `
$zip = [System.IO.Compression.ZipFile]::OpenRead('${AAB_PATH}');
foreach ($e in $zip.Entries) {
  if ($e.FullName -like '*BundleConfig*' -or $e.FullName -like '*resources.pb*') {
    Write-Host $e.FullName $e.Length
  }
}
$zip.Dispose();
`], { encoding: 'utf8' });
console.log('Files:', r.stdout);
