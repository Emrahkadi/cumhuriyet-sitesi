Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Key bilgileri
$KEY_ALIAS = "twa"
$KEY_VALIDITY = 10000  # 27 yil
$KEY_SIZE = 2048
$KEY_ALGO = "RSA"

# KeyStore dosya yolu
$KEYSTORE = Join-Path $PSScriptRoot "..\twa-release-key.jks"
if (Test-Path $KEYSTORE) {
    Write-Host "KeyStore zaten var: $KEYSTORE" -ForegroundColor Yellow
    Write-Host "Mevcut key bilgileri:" -ForegroundColor Yellow
    & keytool -list -v -keystore $KEYSTORE -alias $KEY_ALIAS -storepass changeit 2>&1 | Select-Object -First 20
    exit 0
}

# Yeni keyStore
Write-Host "Yeni release key olusturuluyor..." -ForegroundColor Green
Write-Host "Bilgi: Play Store icin 25+ yil gecerli key gerekir" -ForegroundColor Cyan
Write-Host ""

# Tum bilgileri tek seferde al
$cn = "CN=Cumhuriyet Sitesi"
$o = "OU=Site Yonetimi, O=Cumhuriyet Sitesi"
$l = "L=Istanbul"
$s = "S=Pendik"
$c = "C=TR"

$dname = "$cn, $o, $l, $s, $c"
$storepass = "changeit"
$keypass = "changeit"

# KeyStore olustur
& keytool -genkeypair `
    -alias $KEY_ALIAS `
    -keyalg $KEY_ALGO `
    -keysize $KEY_SIZE `
    -validity $KEY_VALIDITY `
    -keystore $KEYSTORE `
    -storepass $storepass `
    -keypass $keypass `
    -dname $dname 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: KeyStore olusturulamadi!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== RELEASE KEY OLUSTURULDU ===" -ForegroundColor Green
Write-Host "KeyStore: $KEYSTORE" -ForegroundColor Green
Write-Host ""
Write-Host "ONEMLI: Bu dosyayi ve sifreyi ('changeit') YEDEKLEYIN!" -ForegroundColor Yellow
Write-Host "Kaybederseniz uygulamanizi bir daha guncelleyemezsiniz!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Key bilgileri:" -ForegroundColor Cyan
& keytool -list -v -keystore $KEYSTORE -storepass $storepass 2>&1 | Select-String -Pattern "SHA1|SHA256|Alias|Owner|Valid" | Select-Object -First 10