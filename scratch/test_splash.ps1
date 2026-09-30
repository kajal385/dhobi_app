Add-Type -AssemblyName System.Drawing

$path = 'C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\splash-full.png'
$outPath = 'C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\splash-clean.png'

$img = [System.Drawing.Bitmap]::FromFile($path)
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)

Write-Host "Image size: $($img.Width) x $($img.Height)"

# The status bar in iPhone X (750x1624) is from y=0 to y=95.
# At y=105, the row is clean background gradient.
# Let's inspect row y=105 across x:
# Let's see what color is at y=0 and y=110:
$c0 = $bmp.GetPixel(375, 0)
$c110 = $bmp.GetPixel(375, 110)
Write-Host "Color at y=0: $($c0.R), $($c0.G), $($c0.B)"
Write-Host "Color at y=110: $($c110.R), $($c110.G), $($c110.B)"

# Let's check bubble at top-left:
# Notice in the screenshot there is a bubble at x=100, y=180 (below y=120).
# The fake status bar is strictly in y=0..95.
# Between x=30 and x=150 is '9:41'.
# Between x=560 and x=720 are the wifi, cellular, battery icons.
# The background at y=0..110 is a very subtle vertical gradient from (212, 217, 252) to (217, 219, 252).
# We can interpolate each column x from y=0 to y=105 using the background colors!

$img.Dispose()
$bmp.Dispose()
$g.Dispose()
