Add-Type -AssemblyName System.Drawing

# Feature graphic boyutu: 1024x500
$width = 1024
$height = 500
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Arka plan gradyan (mavi tonları)
$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(30, 90, 168),    # #1e5aa8
    [System.Drawing.Color]::FromArgb(60, 130, 200),   # açık mavi
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillRectangle($brush, $rect)
$brush.Dispose()

# Logo (icon-512.png) yerleştir (sol taraf, 256x256 boyutunda)
$logoPath = Join-Path $PSScriptRoot "..\public\icons\icon-512.png"
if (Test-Path $logoPath) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $logoSize = 256
    $logoX = 64
    $logoY = ($height - $logoSize) / 2
    $g.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
    $logo.Dispose()
}

# Ana başlık (sağ taraf)
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 56, [System.Drawing.FontStyle]::Bold)
$brushTitle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$titleText = "Cumhuriyet Sitesi"
$titleX = 360
$titleY = 130
$g.DrawString($titleText, $fontTitle, $brushTitle, $titleX, $titleY)
$brushTitle.Dispose()
$fontTitle.Dispose()

# Alt başlık
$fontSub = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Regular)
$brushSub = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 235, 255))
$subText = "Duyurular, Anketler, Mesajlar"
$subX = 364
$subY = 220
$g.DrawString($subText, $fontSub, $brushSub, $subX, $subY)
$brushSub.Dispose()
$fontSub.Dispose()

# Ek özellikler satırı
$fontSmall = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Italic)
$brushSmall = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 215, 245))
$smallText = "PWA + Push Bildirim + Offline Erişim"
$smallX = 364
$smallY = 290
$g.DrawString($smallText, $fontSmall, $brushSmall, $smallX, $smallY)
$brushSmall.Dispose()
$fontSmall.Dispose()

# Çıkış
$outPath = Join-Path $PSScriptRoot "..\public\store\feature-graphic.png"
$dir = Split-Path $outPath -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$g.Dispose()

Write-Host "Feature graphic olusturuldu: $outPath" -ForegroundColor Green
Write-Host "Boyut: 1024x500" -ForegroundColor Green
