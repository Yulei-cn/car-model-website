param(
  [string]$Source = "C:\Users\57799\Pictures\car\archive"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $repoRoot "assets\cars"
$dataRoot = Join-Path $repoRoot "data"
$heroPath = Join-Path $repoRoot "assets\hero.jpg"
$extensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif")

New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null

$models = Get-ChildItem -Path $Source -Directory | Sort-Object Name | ForEach-Object {
  $folder = $_
  $targetFolder = Join-Path $assetRoot $folder.Name
  New-Item -ItemType Directory -Force -Path $targetFolder | Out-Null

  $images = Get-ChildItem -Path $folder.FullName -File |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name

  foreach ($image in $images) {
    Copy-Item -LiteralPath $image.FullName -Destination (Join-Path $targetFolder $image.Name) -Force
  }

  if ($images.Count -gt 0 -and -not (Test-Path $heroPath)) {
    Copy-Item -LiteralPath $images[0].FullName -Destination $heroPath -Force
  }

  [pscustomobject]@{
    name = $folder.Name
    cover = if ($images.Count -gt 0) { "./assets/cars/$($folder.Name)/$($images[0].Name)" } else { $null }
    images = @($images | ForEach-Object { "./assets/cars/$($folder.Name)/$($_.Name)" })
  }
} | Where-Object { $_.images.Count -gt 0 }

$models | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $dataRoot "catalog.json") -Encoding UTF8

Write-Host "Synced $($models.Count) model folders."
