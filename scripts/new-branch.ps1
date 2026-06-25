param(
  [switch]$Push
)

$ErrorActionPreference = 'Stop'

function Get-NextBranchName {
  $datePart = Get-Date -Format 'ddMMyy'
  git fetch --all --prune | Out-Null
  git fetch --tags | Out-Null

  $max = 0

  $branchRefs = git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin | Select-String -Pattern "Bobanest$datePart-V\d{2}" -AllMatches | ForEach-Object { $_.Matches.Value }
  foreach ($ref in $branchRefs) {
    if ($ref -match "Bobanest$datePart-V(\d{2})$") {
      $n = [int]$matches[1]
      if ($n -gt $max) { $max = $n }
    }
  }

  $tags = git tag --list "Bobanest$datePart-V*"
  foreach ($tag in $tags) {
    if ($tag -match "^Bobanest$datePart-V(\d{2})$") {
      $n = [int]$matches[1]
      if ($n -gt $max) { $max = $n }
    }
  }

  $next = "{0:D2}" -f ($max + 1)
  return "Bobanest$datePart-V$next"
}

$branchName = Get-NextBranchName
Write-Host "Creating branch: $branchName"

git checkout -b $branchName

if ($Push) {
  git push -u origin $branchName
}

Write-Host "Done. Current branch: $branchName"
