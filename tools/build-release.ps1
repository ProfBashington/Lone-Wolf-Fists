[CmdletBinding()]
param(
  [string]$OutputDirectory
)

# Builds the installable system ZIP from an explicit allowlist, so development files
# (tools, SCSS sources, package manifests, pack sources, node_modules, maps) never ship.

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $OutputDirectory = Join-Path $root 'dist' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $output "stage-$stamp"

$allowDirectories = @('assets', 'css', 'lang', 'module', 'templates')
$allowFiles = @('system.json', 'README.md', 'CHANGELOG.md', 'LICENSE.md', 'MIT-LICENSE.txt', 'ATTRIBUTIONS.md')
$requiredFiles = @('system.json', 'LICENSE.md', 'MIT-LICENSE.txt', 'assets/LICENSE-ASSETS.md', 'packs/LICENSE-PACKS.md', 'css/lone-wolf-fists.css', 'module/lone-wolf-fists.mjs')
$forbiddenPatterns = @('LOG', 'LOG.old', '*.map', '*.scss', 'package.json', 'package-lock.json', 'template.json', '*.xcf', '.git*', '.nvmrc', '.npmrc')

Push-Location $root
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'SCSS build failed; no release archive was created.' }
  & npm.cmd run packs:roundtrip
  if ($LASTEXITCODE -ne 0) { throw 'Pack validation failed; no release archive was created.' }
  New-Item -ItemType Directory -Force -Path $output, $stage | Out-Null

  foreach ($directory in $allowDirectories) {
    & robocopy.exe (Join-Path $root $directory) (Join-Path $stage $directory) /E /XD GIMP /XF *.map /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "Staging $directory failed with exit code $LASTEXITCODE." }
  }
  foreach ($file in $allowFiles) { Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $stage $file) }
  # LevelDB LOG files are timestamped diagnostics, not data; leaving them out keeps builds reproducible.
  & robocopy.exe (Join-Path $root 'build\packs') (Join-Path $stage 'packs') /E /XF LOG LOG.old /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) { throw "Pack staging copy failed with exit code $LASTEXITCODE." }
  # The rebuilt LevelDB packs do not carry the pack license notice; it must ship with them.
  Copy-Item -LiteralPath (Join-Path $root 'packs\LICENSE-PACKS.md') -Destination (Join-Path $stage 'packs\LICENSE-PACKS.md')

  foreach ($file in $requiredFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $stage $file))) { throw "Staged release is missing required file $file." }
  }
  $forbidden = @(Get-ChildItem -LiteralPath $stage -Recurse -Force -File | Where-Object { $name = $_.Name; @($forbiddenPatterns | Where-Object { $name -like $_ }).Count })
  if ($forbidden.Count) { throw "Staged release contains excluded files: $($forbidden.FullName -join ', ')" }

  $manifest = Get-Content -LiteralPath (Join-Path $stage 'system.json') -Raw | ConvertFrom-Json
  if ($manifest.id -ne 'lone-wolf-fists') { throw 'Staged manifest has an unexpected system id.' }

  # Per-file content hashes let two builds be compared independently of ZIP timestamps.
  $contents = Get-ChildItem -LiteralPath $stage -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
    "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower())  $relative"
  }
  $contentText = ($contents -join "`n") + "`n"
  $contentHash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($contentText))).Replace('-', '').ToLower()

  $archive = Join-Path $output "lone-wolf-fists-$($manifest.version)-v14.368-local-$stamp.zip"
  Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName) -DestinationPath $archive -CompressionLevel Optimal
  $hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower()
  [IO.File]::WriteAllText("$archive.contents.txt", $contentText)
  [ordered]@{
    archive = $archive
    sha256 = $hash
    contentSha256 = $contentHash
    fileCount = $contents.Count
    system = $manifest.id
    systemVersion = $manifest.version
    sourceCommit = (& git -C $root rev-parse HEAD).Trim()
    sourceDirty = [bool](& git -C $root status --porcelain)
    targetFoundry = '14.368'
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath "$archive.json" -Encoding utf8
  # GitHub Release assets with the fixed names the manifest/download URLs expect.
  $releaseDir = Join-Path $output "release-v$($manifest.version)"
  if (Test-Path -LiteralPath $releaseDir) { Remove-Item -LiteralPath $releaseDir -Recurse -Force }
  New-Item -ItemType Directory -Path $releaseDir | Out-Null
  Copy-Item -LiteralPath $archive -Destination (Join-Path $releaseDir 'lone-wolf-fists.zip')
  Copy-Item -LiteralPath (Join-Path $stage 'system.json') -Destination (Join-Path $releaseDir 'system.json')
  Remove-Item -LiteralPath $stage -Recurse -Force
  Write-Host "Release assets: $releaseDir (upload lone-wolf-fists.zip and system.json to tag v$($manifest.version))"
  Write-Host "Built $archive"
  Write-Host "SHA256 $hash"
  Write-Host "Content SHA256 $contentHash ($($contents.Count) files)"
} finally {
  Pop-Location
}
