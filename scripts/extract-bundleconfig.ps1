# Decode BundleConfig.pb
$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# Extract BundleConfig.pb
Add-Type -AssemblyName System.IO.Compression.FileSystem
$aab = "C:\Users\emrah\Desktop\kurbanciniz\cumhuriyet-sitesi\twa-project\app\build\outputs\bundle\release\app-release.aab"
$zip = [System.IO.Compression.ZipFile]::OpenRead($aab)
foreach ($entry in $zip.Entries) {
    if ($entry.FullName -eq "BundleConfig.pb") {
        $out = "C:\Users\emrah\Desktop\BundleConfig.pb"
        $stream = [System.IO.File]::Create($out)
        $entry.Open().CopyTo($stream)
        $stream.Close()
        Write-Host "Extracted to $out"
    }
}
$zip.Dispose()
