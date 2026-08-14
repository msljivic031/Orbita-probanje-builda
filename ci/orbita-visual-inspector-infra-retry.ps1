param(
  [Parameter(Mandatory=$true)][string]$CandidateRoot,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][int]$Width,
  [Parameter(Mandatory=$true)][int]$Height,
  [Parameter(Mandatory=$true)][string]$LogFile,
  [int]$MaxActions = 220,
  [int]$MaxDepth = 3,
  [int]$MaxStates = 180,
  [int]$InfraAttempts = 2
)

$ErrorActionPreference = 'Stop'
$original = Get-Location
try {
  Set-Location $CandidateRoot
  for ($attempt = 1; $attempt -le $InfraAttempts; $attempt++) {
    if (Test-Path $Output) { Remove-Item $Output -Recurse -Force }
    $attemptLog = if ($attempt -eq 1) { $LogFile } else { "$LogFile.infra-retry-$attempt.log" }
    node tooling/inspector/visual-runtime-inspector.mjs --output $Output --width $Width --height $Height --max-actions $MaxActions --max-depth $MaxDepth --max-states $MaxStates 2>&1 | Tee-Object $attemptLog
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
      Write-Host "ORBITA_VISUAL_INSPECTOR_PASS attempt=$attempt"
      exit 0
    }

    $text = if (Test-Path $attemptLog) { Get-Content $attemptLog -Raw } else { '' }
    $manifestPath = Join-Path $Output 'MANIFEST.json'
    $captures = -1
    $canonicalScenarios = -1
    $executedCommands = -1
    if (Test-Path $manifestPath) {
      try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $captures = [int]($manifest.summary.captures)
        $canonicalScenarios = [int]($manifest.summary.canonicalScenarios)
        $executedCommands = [int]($manifest.summary.executedCommands)
      } catch {
        $captures = -1
        $canonicalScenarios = -1
        $executedCommands = -1
      }
    }

    $isElectronFetchInfra = ($text -match 'Downloading Electron binary') -and ($text -match 'fetch failed|Electron failed to install correctly') -and ($captures -eq 0)
    $hasExpectedViewportReadback = $text -match ('ORBITA_VIEWPORT_READBACK \{\"innerWidth\":' + [regex]::Escape([string]$Width) + ',\"innerHeight\":' + [regex]::Escape([string]$Height) + ',\"devicePixelRatio\":1\}')
    $isEarlyCdpRuntimeInfra = ($text -match 'CDP request timed out: Runtime\.evaluate') -and $hasExpectedViewportReadback -and ($captures -ge 0) -and ($captures -le 1) -and ($canonicalScenarios -eq 0) -and ($executedCommands -eq 0)
    $isTransientInfra = $isElectronFetchInfra -or $isEarlyCdpRuntimeInfra

    if (-not $isTransientInfra) {
      Write-Error "ORBITA_VISUAL_INSPECTOR_REAL_FAIL attempt=$attempt exit=$exitCode captures=$captures canonical=$canonicalScenarios executed=$executedCommands"
      exit $exitCode
    }

    if ($attempt -ge $InfraAttempts) {
      Write-Error "ORBITA_VISUAL_INSPECTOR_INFRA_EXHAUSTED attempts=$InfraAttempts captures=$captures canonical=$canonicalScenarios executed=$executedCommands"
      exit $exitCode
    }

    $kind = if ($isElectronFetchInfra) { 'ELECTRON_FETCH' } else { 'EARLY_CDP_RUNTIME' }
    Write-Warning "ORBITA_VISUAL_INSPECTOR_TRANSIENT_$kind attempt=$attempt; retrying unchanged candidate"
    Start-Sleep -Seconds 2
  }
} finally {
  Set-Location $original
}
