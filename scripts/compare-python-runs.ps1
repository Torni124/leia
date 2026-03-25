param(
  [Parameter(Mandatory = $true)]
  [string]$Baseline,

  [string]$Candidate = "python_eval\generate_json_report\candidate\script_under_test.py",

  [switch]$RunTests
)

$ErrorActionPreference = "Stop"

function Resolve-ExistingPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathText
  )

  $resolved = Resolve-Path -LiteralPath $PathText -ErrorAction SilentlyContinue

  if (-not $resolved) {
    throw "File not found: $PathText"
  }

  return $resolved.Path
}

function Write-Section {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title
  )

  Write-Host ""
  Write-Host $Title
  Write-Host ("-" * $Title.Length)
}

function Get-StatusLabel {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,

    [Parameter(Mandatory = $true)]
    [string]$WhenTrue,

    [Parameter(Mandatory = $true)]
    [string]$WhenFalse
  )

  if ($Condition) {
    return $WhenTrue
  }

  return $WhenFalse
}

function Show-TextDiff {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BaselinePath,

    [Parameter(Mandatory = $true)]
    [string]$CandidatePath
  )

  $gitCommand = Get-Command git -ErrorAction SilentlyContinue

  if ($gitCommand) {
    & $gitCommand.Source -C (Get-Location).Path diff --no-index --no-color -- $BaselinePath $CandidatePath

    if ($LASTEXITCODE -le 1) {
      return
    }
  }

  Write-Host "git diff unavailable; falling back to line comparison."

  $baselineLines = Get-Content -LiteralPath $BaselinePath
  $candidateLines = Get-Content -LiteralPath $CandidatePath
  $comparison = Compare-Object -ReferenceObject $baselineLines -DifferenceObject $candidateLines

  if (-not $comparison) {
    Write-Host "No line-level differences."
    return
  }

  $comparison | Format-Table -AutoSize
}

function Invoke-Harness {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CandidatePath
  )

  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue

  if (-not $pythonCommand) {
    throw "python was not found on PATH."
  }

  $previous = $env:LEIA_PYTHON_CANDIDATE

  try {
    $env:LEIA_PYTHON_CANDIDATE = $CandidatePath
    & $pythonCommand.Source -m unittest discover -s python_eval/generate_json_report/tests -p test_*.py
    return $LASTEXITCODE
  } finally {
    $env:LEIA_PYTHON_CANDIDATE = $previous
  }
}

$baselinePath = Resolve-ExistingPath -PathText $Baseline
$candidatePath = Resolve-ExistingPath -PathText $Candidate

Write-Section "Files"
Write-Host "Baseline : $baselinePath"
Write-Host "Candidate: $candidatePath"

$baselineHash = Get-FileHash -LiteralPath $baselinePath -Algorithm SHA256
$candidateHash = Get-FileHash -LiteralPath $candidatePath -Algorithm SHA256
$sameHash = $baselineHash.Hash -eq $candidateHash.Hash

Write-Section "Hashes"
Write-Host "Baseline : $($baselineHash.Hash)"
Write-Host "Candidate: $($candidateHash.Hash)"
Write-Host ("Result   : " + (Get-StatusLabel -Condition $sameHash -WhenTrue "IDENTICAL" -WhenFalse "DIFFERENT"))

Write-Section "Diff"

if ($sameHash) {
  Write-Host "No textual differences."
} else {
  Show-TextDiff -BaselinePath $baselinePath -CandidatePath $candidatePath
}

if ($RunTests) {
  Write-Section "Harness: Baseline"
  $baselineExitCode = Invoke-Harness -CandidatePath $baselinePath
  Write-Host "Exit code: $baselineExitCode"

  Write-Section "Harness: Candidate"
  $candidateExitCode = Invoke-Harness -CandidatePath $candidatePath
  Write-Host "Exit code: $candidateExitCode"
}
