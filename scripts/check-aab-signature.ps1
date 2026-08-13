# Check AAB signature
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$aab = "C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-project\app\build\outputs\bundle\release\app-release.aab"
Write-Host "AAB: $aab"
Write-Host "Size: $((Get-Item $aab).Length) bytes"

$zip = [System.IO.Compression.ZipFile]::OpenRead($aab)
$hasSignature = $false
Write-Host ""
Write-Host "=== META-INF Contents ==="
foreach ($entry in $zip.Entries) {
    if ($entry.FullName -like 'META-INF/*') {
        Write-Host "  $($entry.FullName)"
        if ($entry.FullName -like '*.SF' -or $entry.FullName -like '*.RSA' -or $entry.FullName -like '*.DSA') {
            $hasSignature = $true
        }
    }
}
$zip.Dispose()
Write-Host ""
Write-Host "=== Signed: $hasSignature ==="
