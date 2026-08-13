// Check AAB signature
const fs = require('fs');
const { execSync } = require('child_process');
const aab = 'C:\\Users\\emrah\\Desktop\\kurbanciniz\\cumhuriyet-sitesi\\twa-project\\app\\build\\outputs\\bundle\\release\\app-release.aab';
console.log('Size:', fs.statSync(aab).size, 'bytes');

const ps = `
$zip = [System.IO.Compression.ZipFile]::OpenRead('${aab}')
$hasSignature = $false
foreach ($e in $zip.Entries) {
  if ($e.FullName -like 'META-INF/*' -or $e.FullName -like '*BNDLTOOL*') {
    Write-Host "  $($e.FullName)"
    if ($e.FullName -like '*.SF' -or $e.FullName -like '*.RSA' -or $e.FullName -like '*.DSA') {
      $hasSignature = $true
    }
  }
}
$zip.Dispose()
Write-Host ""
Write-Host "Signed: $hasSignature"
`;
console.log(execSync('powershell -NoProfile -Command "' + ps.replace(/"/g, '\\"').replace(/\n/g, '; ') + '"', { shell: 'powershell', encoding: 'utf8' }));
