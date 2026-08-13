# List all entries in AAB
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$aab = "C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-project\app\build\outputs\bundle\release\app-release.aab"
Write-Host "=== AAB Contents ==="
$zip = [System.IO.Compression.ZipFile]::OpenRead($aab)
foreach ($entry in $zip.Entries) {
    Write-Host ("  {0,-60} {1,10}" -f $entry.FullName, $entry.Length)
}
$zip.Dispose()
