$ErrorActionPreference = 'Stop'

param(
  [switch]$DeployVercel
)

function Get-ReleaseName {
  $datePart = Get-Date -Format 'ddMMyy'
  git fetch --tags | Out-Null
  $existing = git tag --list "Bobanest$datePart-V*"
  $max = 0
  foreach ($tag in $existing) {
    if ($tag -match "^Bobanest$datePart-V(\d{2})$") {
      $n = [int]$matches[1]
      if ($n -gt $max) { $max = $n }
    }
  }
  $next = "{0:D2}" -f ($max + 1)
  return "Bobanest$datePart-V$next"
}

git diff --quiet
if ($LASTEXITCODE -ne 0) {
  throw "Working tree has unstaged tracked changes. Commit/stage changes before running a release."
}

git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  throw "Working tree has staged changes not committed. Commit changes before running a release."
}

$releaseName = Get-ReleaseName
Write-Host "Release name: $releaseName"

git tag -a $releaseName -m "Release $releaseName"
git push origin main
git push origin $releaseName

if ($DeployVercel) {
  vercel deploy --prod --yes --meta "release=$releaseName" --meta "gitTag=$releaseName"
}

Write-Host "Done. Release: $releaseName"
