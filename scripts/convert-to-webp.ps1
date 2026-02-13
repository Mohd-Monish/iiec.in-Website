# ============================================
# WebP Image Conversion Script
# ============================================
# Converts all PNG, JPG, and JPEG images to WebP format
# Requires: cwebp (from Google's libwebp package)
# Install: winget install Google.WebP  OR  choco install webp
# ============================================

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $projectRoot) { $projectRoot = "." }

# Directories containing images to convert
$imageDirs = @(
    "$projectRoot\assets\images",
    "$projectRoot\assets\logos",
    "$projectRoot\assets\team"
)

# Check if cwebp is available
$cwebp = Get-Command cwebp -ErrorAction SilentlyContinue
if (-not $cwebp) {
    Write-Host "ERROR: cwebp not found. Install libwebp first:" -ForegroundColor Red
    Write-Host "  winget install Google.WebP" -ForegroundColor Yellow
    Write-Host "  -- OR --" -ForegroundColor Yellow
    Write-Host "  choco install webp" -ForegroundColor Yellow
    Write-Host "  -- OR --" -ForegroundColor Yellow
    Write-Host "  Download from: https://developers.google.com/speed/webp/download" -ForegroundColor Yellow
    exit 1
}

$totalConverted = 0
$totalSkipped = 0
$totalFailed = 0

foreach ($dir in $imageDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "SKIP: Directory not found: $dir" -ForegroundColor Yellow
        continue
    }

    Write-Host "`n Processing: $dir" -ForegroundColor Cyan
    Write-Host "  $('-' * 50)"

    $images = Get-ChildItem -Path $dir -Include *.png, *.jpg, *.jpeg -Recurse

    foreach ($img in $images) {
        $webpPath = [System.IO.Path]::ChangeExtension($img.FullName, ".webp")
        $relativePath = $img.Name

        if (Test-Path $webpPath) {
            Write-Host "  SKIP (exists): $relativePath" -ForegroundColor DarkGray
            $totalSkipped++
            continue
        }

        # Quality settings:
        # - Logos/icons (PNG): lossless for crisp edges
        # - Photos (JPG/JPEG): quality 80 for good balance
        $ext = $img.Extension.ToLower()
        if ($ext -eq ".png") {
            # Lossless for logos and icons
            $result = & cwebp -lossless -z 9 -mt "$($img.FullName)" -o "$webpPath" 2>&1
        } else {
            # Lossy with high quality for photos
            $result = & cwebp -q 80 -m 6 -mt "$($img.FullName)" -o "$webpPath" 2>&1
        }

        if ($LASTEXITCODE -eq 0) {
            $originalSize = [math]::Round($img.Length / 1KB, 1)
            $webpSize = [math]::Round((Get-Item $webpPath).Length / 1KB, 1)
            $savings = [math]::Round((1 - $webpSize / $originalSize) * 100, 1)
            Write-Host "  OK: $relativePath -> .webp  ($originalSize KB -> $webpSize KB, -${savings}%)" -ForegroundColor Green
            $totalConverted++
        } else {
            Write-Host "  FAIL: $relativePath" -ForegroundColor Red
            $totalFailed++
        }
    }
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " Conversion Complete!" -ForegroundColor Green
Write-Host "  Converted: $totalConverted" -ForegroundColor Green
Write-Host "  Skipped:   $totalSkipped" -ForegroundColor Yellow
Write-Host "  Failed:    $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Green" })
Write-Host "============================================`n" -ForegroundColor Cyan

if ($totalConverted -gt 0) {
    Write-Host " NOTE: Original files are preserved. Delete them manually after verifying." -ForegroundColor Yellow
    Write-Host " Keep originals as fallbacks until all browsers are confirmed working.`n" -ForegroundColor Yellow
}
