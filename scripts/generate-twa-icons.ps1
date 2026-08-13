Add-Type -AssemblyName System.Drawing

# TWA app icon'lar
$sourceIcon = Join-Path $PSScriptRoot "..\public\icons\icon-512.png"
if (-not (Test-Path $sourceIcon)) {
    Write-Host "HATA: icon-512.png bulunamadi!" -ForegroundColor Red
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($sourceIcon)

# Farkli boyutlar
$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($dpi in $sizes.Keys) {
    $size = $sizes[$dpi]
    $dir = Join-Path $PSScriptRoot "..\twa-project\app\src\main\res\$dpi"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    
    $resized = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($sourceImg, 0, 0, $size, $size)
    $g.Dispose()
    
    $outPath = Join-Path $dir "ic_launcher.png"
    $resized.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    Write-Host "  $outPath ($size x $size)" -ForegroundColor Green
    
    # Round icon (ayni boyut)
    $outPathRound = Join-Path $dir "ic_launcher_round.png"
    $resized2 = New-Object System.Drawing.Bitmap $size, $size
    $g2 = [System.Drawing.Graphics]::FromImage($resized2)
    $g2.DrawImage($sourceImg, 0, 0, $size, $size)
    $g2.Dispose()
    $resized2.Save($outPathRound, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized2.Dispose()
}

$sourceImg.Dispose()
Write-Host "Tum app icon'lar olusturuldu" -ForegroundColor Green