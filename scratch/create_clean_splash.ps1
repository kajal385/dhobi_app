Add-Type -AssemblyName System.Drawing

$path = 'C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\splash-full.png'
$outPath = 'C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\splash-clean.png'

$img = [System.Drawing.Bitmap]::FromFile($path)
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)

# Inpaint status bar (y from 15 to 65):
# At y=15 and y=65, the gradient is smooth vertical.
# For each x, we can smoothly interpolate between y=15 and y=65!
for ($x = 0; $x -lt $bmp.Width; $x++) {
    $cTop = $bmp.GetPixel($x, 15)
    $cBottom = $bmp.GetPixel($x, 65)
    for ($y = 16; $y -lt 65; $y++) {
        $t = ($y - 15) / 50.0
        $r = [int]($cTop.R + ($cBottom.R - $cTop.R) * $t)
        $gCol = [int]($cTop.G + ($cBottom.G - $cTop.G) * $t)
        $b = [int]($cTop.B + ($cBottom.B - $cTop.B) * $t)
        $newColor = [System.Drawing.Color]::FromArgb(255, $r, $gCol, $b)
        $bmp.SetPixel($x, $y, $newColor)
    }
}

# Now let's check subtitle between y=730 and y=765
# Background around y=730 is a peach/pink-lavender gradient:
$cSubTop = $bmp.GetPixel(375, 730)
$cSubBottom = $bmp.GetPixel(375, 765)
Write-Host "Subtitle background top: $($cSubTop.R), $($cSubTop.G), $($cSubTop.B)"
Write-Host "Subtitle background bottom: $($cSubBottom.R), $($cSubBottom.G), $($cSubBottom.B)"

# Replace "Laundry Management Simpliffed" with clean background interpolation
# Subtitle is roughly between x=190 and x=560
for ($x = 180; $x -lt 570; $x++) {
    $cT = $bmp.GetPixel($x, 730)
    $cB = $bmp.GetPixel($x, 765)
    for ($y = 731; $y -lt 765; $y++) {
        $t = ($y - 730) / 35.0
        $r = [int]($cT.R + ($cB.R - $cT.R) * $t)
        $gCol = [int]($cT.G + ($cB.G - $cT.G) * $t)
        $b = [int]($cT.B + ($cB.B - $cT.B) * $t)
        $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $gCol, $b))
    }
}

# Draw properly spelled "Laundry Management Simplified"
$font = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Regular)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 35, 30, 45))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF(0, 730, $bmp.Width, 35)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.DrawString("Laundry Management Simplified", $font, $brush, $rect, $format)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved clean splash image to: $outPath"

$font.Dispose()
$brush.Dispose()
$format.Dispose()
$img.Dispose()
$bmp.Dispose()
$g.Dispose()
