Add-Type -AssemblyName System.Drawing

$path = 'C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\splash-full.png'
$img = [System.Drawing.Bitmap]::FromFile($path)

# Let's inspect where dark pixels exist between y=0 and y=120 (status bar)
$minY = 9999; $maxY = 0; $minX = 9999; $maxX = 0
for ($y = 0; $y -lt 120; $y++) {
    for ($x = 0; $x -lt $img.Width; $x++) {
        $c = $img.GetPixel($x, $y)
        # Background is around R=214..220, G=211..216, B=248..252.
        # Text/icons are dark: R < 100
        if ($c.R -lt 120 -and $c.G -lt 120 -and $c.B -lt 120) {
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
        }
    }
}
Write-Host "Status bar dark pixels found in: X=[$minX, $maxX], Y=[$minY, $maxY]"

# Let's check where the "DhobiPro" and "Laundry Management Simpliffed" are located
$textMinY = 9999; $textMaxY = 0
for ($y = 600; $y -lt 900; $y++) {
    for ($x = 100; $x -lt 650; $x++) {
        $c = $img.GetPixel($x, $y)
        if ($c.R -lt 100 -and $c.G -lt 100 -and $c.B -lt 100) {
            if ($y -lt $textMinY) { $textMinY = $y }
            if ($y -gt $textMaxY) { $textMaxY = $y }
        }
    }
}
Write-Host "Subtitle text found in: Y=[$textMinY, $textMaxY]"

$img.Dispose()
