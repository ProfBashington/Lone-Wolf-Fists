[CmdletBinding()]
param(
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) { $OutputDirectory = Join-Path $root 'dist' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $output "stage-$stamp"

Push-Location $root
try {
  & npm.cmd run packs:roundtrip
  if ($LASTEXITCODE -ne 0) { throw 'Pack validation failed; no release archive was created.' }
  New-Item -ItemType Directory -Force -Path $output, $stage | Out-Null
  & robocopy.exe $root $stage /E /XD .git node_modules packs pack-source build dist /XF .gitignore .gitattributes .nvmrc .npmrc /NFL /NDL /NJH /NJS /NP | Out-Host
  if ($LASTEXITCODE -gt 7) { throw "Staging copy failed with exit code $LASTEXITCODE." }
  & robocopy.exe (Join-Path $root 'build\packs') (Join-Path $stage 'packs') /E /NFL /NDL /NJH /NJS /NP | Out-Host
  if ($LASTEXITCODE -gt 7) { throw "Pack staging copy failed with exit code $LASTEXITCODE." }

  $manifest = Get-Content -LiteralPath (Join-Path $stage 'system.json') -Raw | ConvertFrom-Json
  if ($manifest.id -ne 'lone-wolf-fists') { throw 'Staged manifest has an unexpected system id.' }
  $archive = Join-Path $output "lone-wolf-fists-$($manifest.version)-v14.368-local-$stamp.zip"
  Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName) -DestinationPath $archive -CompressionLevel Optimal
  $hash = ((& certutil.exe -hashfile $archive SHA256) | Where-Object { $_ -match '^[0-9A-Fa-f ]+$' } | Select-Object -First 1).Replace(' ', '')
  [ordered]@{
    archive = $archive
    sha256 = $hash
    system = $manifest.id
    systemVersion = $manifest.version
    targetFoundry = '14.368'
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath "$archive.json" -Encoding utf8
  Write-Host "Built $archive"
  Write-Host "SHA256 $hash"
} finally {
  Pop-Location
}
