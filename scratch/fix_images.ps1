Add-Type -AssemblyName System.Drawing

$myImagesDir = "C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\myimages"

# 1. Convert JPEG files that are named .png to real PNG format
Get-ChildItem -Path $myImagesDir -Filter "*.png" | ForEach-Object {
    $filePath = $_.FullName
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -gt 4 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) {
        Write-Host "Converting JPEG disguised as PNG to real PNG: $($_.Name)"
        $srcBmp = [System.Drawing.Bitmap]::FromFile($filePath)
        $newBmp = New-Object System.Drawing.Bitmap($srcBmp.Width, $srcBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($newBmp)
        $g.DrawImage($srcBmp, 0, 0, $srcBmp.Width, $srcBmp.Height)
        $g.Dispose()
        $srcBmp.Dispose()
        
        $tempPng = $filePath + ".tmp.png"
        $newBmp.Save($tempPng, [System.Drawing.Imaging.ImageFormat]::Png)
        $newBmp.Dispose()
        
        Move-Item -Path $tempPng -Destination $filePath -Force
        Write-Host "Successfully converted: $($_.Name)"
    }
}

# 2. Convert PNG files that are named .jpg to real JPEG format
Get-ChildItem -Path $myImagesDir -Filter "*.jpg" | ForEach-Object {
    $filePath = $_.FullName
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    if ($bytes.Length -gt 4 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50) {
        Write-Host "Converting PNG disguised as JPG to real JPEG: $($_.Name)"
        $srcBmp = [System.Drawing.Bitmap]::FromFile($filePath)
        $newBmp = New-Object System.Drawing.Bitmap($srcBmp.Width, $srcBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g = [System.Drawing.Graphics]::FromImage($newBmp)
        $g.DrawImage($srcBmp, 0, 0, $srcBmp.Width, $srcBmp.Height)
        $g.Dispose()
        $srcBmp.Dispose()
        
        $tempJpg = $filePath + ".tmp.jpg"
        $newBmp.Save($tempJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $newBmp.Dispose()
        
        Move-Item -Path $tempJpg -Destination $filePath -Force
        Write-Host "Successfully converted: $($_.Name)"
    }
}

# 3. Rename wave.png (which is SVG text) to wave.svg
$wavePng = "C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\wave.png"
$waveSvg = "C:\CODEXXA_PROJECT\Dhobi_app\customer_app\assets\splash\wave.svg"
if (Test-Path $wavePng) {
    Write-Host "Renaming SVG wave.png to wave.svg"
    Move-Item -Path $wavePng -Destination $waveSvg -Force
}

Write-Host "All conversions completed!"
