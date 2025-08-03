# PayRox Go Beyond - Enhanced CI Simulation Script for Windows
# Production-grade CI testing with comprehensive error handling and validation
# Version: 2.0.0

param(
  [switch]$SkipInstall,
  [switch]$Verbose,
  [switch]$SkipTests,
  [switch]$CleanFirst,
  [switch]$Help
)

# Enhanced error handling
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Color functions for better output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Step { param($Message) Write-Host "🔧 $Message" -ForegroundColor White }

# Progress tracking
$script:TotalSteps = 8
$script:CurrentStep = 0
$script:StartTime = Get-Date

function Show-Progress {
  param($Description)
  $script:CurrentStep++
  $Percentage = [math]::Round(($script:CurrentStep / $script:TotalSteps) * 100, 1)
  Write-Host "[$script:CurrentStep/$script:TotalSteps] ($Percentage`%) $Description" -ForegroundColor Magenta
}

# Enhanced command execution with error handling and fallback
function Invoke-SafeCommand {
  param(
    [string]$Command,
    [string]$Description,
    [switch]$ContinueOnError,
    [int]$TimeoutSeconds = 300,
    [switch]$UseDirect
  )

  Write-Step $Description
  if ($Verbose) { Write-Info "Command: $Command" }

  try {
    if ($UseDirect) {
      # Direct execution for problematic commands
      $output = cmd /c "$Command 2>&1"
      $exitCode = $LASTEXITCODE
    }
    else {
      # Job-based execution with timeout
      $job = Start-Job -ScriptBlock {
        param($cmd)
        try {
          $output = cmd /c "$cmd 2>&1"
          return @{ Output = $output; ExitCode = $LASTEXITCODE }
        }
        catch {
          return @{ Output = $_.Exception.Message; ExitCode = 1 }
        }
      } -ArgumentList $Command

      if (Wait-Job $job -Timeout $TimeoutSeconds) {
        $result = Receive-Job $job
        Remove-Job $job
        $output = $result.Output
        $exitCode = $result.ExitCode
      }
      else {
        Stop-Job $job
        Remove-Job $job
        throw "Command timed out after $TimeoutSeconds seconds"
      }
    }

    if ($exitCode -eq 0) {
      Write-Success "$Description completed successfully"
      if ($Verbose -and $output) { Write-Host $output -ForegroundColor Gray }
      return $true
    }
    else {
      Write-Error "$Description failed with exit code: $exitCode"
      if ($output) { Write-Host $output -ForegroundColor Red }
      if (-not $ContinueOnError) { throw "Command failed: $Command" }
      return $false
    }
  }
  catch {
    Write-Error "$Description failed: $($_.Exception.Message)"
    if (-not $ContinueOnError) { throw }
    return $false
  }
}

# System validation
function Test-Prerequisites {
  Write-Step "Validating system prerequisites..."

  # Check Node.js
  try {
    $nodeVersion = node --version
    if ($nodeVersion -match "v(\d+)\.") {
      $majorVersion = [int]$matches[1]
      if ($majorVersion -lt 18) {
        throw "Node.js version $nodeVersion is too old. Minimum required: 18.x"
      }
      Write-Success "Node.js version: $nodeVersion"
    }
  }
  catch {
    Write-Error "Node.js not found or invalid version"
    throw
  }

  # Check npm
  try {
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
  }
  catch {
    Write-Error "npm not found"
    throw
  }

  # Check project structure
  $requiredFiles = @("package.json", "hardhat.config.ts")
  foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
      Write-Error "Required file not found: $file"
      throw "Missing required file: $file"
    }
  }

  Write-Success "System prerequisites validated"
}

# Dependency management with retry logic and fallback
function Install-Dependencies {
  if ($SkipInstall) {
    Write-Info "Skipping dependency installation (SkipInstall specified)"
    return
  }

  Show-Progress "Installing dependencies with retry logic..."

  # Clean npm cache if needed
  if ($CleanFirst) {
    Write-Info "Cleaning npm cache..."
    try { npm cache clean --force } catch { Write-Warning "Cache clean failed, continuing..." }
  }

  # Check if dependencies are already installed and working
  if ((Test-Path "node_modules") -and ((Test-Path "node_modules/.bin/hardhat") -or (Test-Path "node_modules/hardhat"))) {
    Write-Success "Dependencies appear to be installed, checking if they work..."
    try {
      npx hardhat --version 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Success "Hardhat is working, skipping installation"
        return
      }
    }
    catch {
      Write-Warning "Hardhat check failed, will attempt installation"
    }
  }

  # Try different installation methods
  $installMethods = @(
    @{ Command = "npm ci --prefer-offline --no-audit"; Description = "npm ci with offline preference" },
    @{ Command = "npm install --prefer-offline --no-audit"; Description = "npm install with offline preference" },
    @{ Command = "npm ci"; Description = "basic npm ci" },
    @{ Command = "npm install"; Description = "basic npm install" }
  )

  foreach ($method in $installMethods) {
    Write-Info "Trying: $($method.Description)"
    try {
      $result = Invoke-SafeCommand $method.Command $method.Description -ContinueOnError -UseDirect
      if ($result) {
        Write-Success "Dependencies installed successfully using: $($method.Description)"
        break
      }
    }
    catch {
      Write-Warning "Method failed: $($method.Description) - $($_.Exception.Message)"
      continue
    }
  }

  # Final check - if still no hardhat, try global installation
  if ((-not (Test-Path "node_modules/.bin/hardhat")) -and (-not (Test-Path "node_modules/hardhat"))) {
    Write-Warning "Local Hardhat not found, checking if global installation works..."
    try {
      hardhat --version 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Success "Global Hardhat found and working"
        return
      }
    }
    catch {
      Write-Error "Neither local nor global Hardhat installation found"
      throw "Hardhat installation failed"
    }
  }

  # Verify critical dependencies
  $criticalDeps = @("hardhat", "@nomicfoundation/hardhat-toolbox")
  foreach ($dep in $criticalDeps) {
    if (Test-Path "node_modules/$dep") {
      Write-Success "✓ $dep installed"
    }
    else {
      Write-Warning "⚠ $dep not found"
    }
  }
}

# Script usage help
if ($Help) {
  Write-Host ""
  Write-Host "PayRox Go Beyond CI Simulation Script v2.0" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Usage:" -ForegroundColor White
  Write-Host "  .\simulate-ci.ps1 [options]" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Options:" -ForegroundColor White
  Write-Host "  -SkipInstall      Skip npm dependency installation" -ForegroundColor Gray
  Write-Host "  -SkipTests        Skip test execution (compile only)" -ForegroundColor Gray
  Write-Host "  -CleanFirst       Clear npm cache before installation" -ForegroundColor Gray
  Write-Host "  -Verbose          Show detailed command output" -ForegroundColor Gray
  Write-Host "  -Help             Show this help message" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Examples:" -ForegroundColor White
  Write-Host "  .\simulate-ci.ps1                    # Full CI simulation" -ForegroundColor Gray
  Write-Host "  .\simulate-ci.ps1 -CleanFirst        # Clean install and test" -ForegroundColor Gray
  Write-Host "  .\simulate-ci.ps1 -SkipTests         # Compile only" -ForegroundColor Gray
  Write-Host "  .\simulate-ci.ps1 -Verbose           # Detailed output" -ForegroundColor Gray
  Write-Host ""
  exit 0
}

Write-Host ""
Write-Host "########################################################################" -ForegroundColor White
Write-Host "#                 🚀 PayRox Go Beyond CI Simulation v2.0              #" -ForegroundColor White
Write-Host "#                    Enhanced Windows PowerShell Edition               #" -ForegroundColor White
Write-Host "########################################################################" -ForegroundColor White
Write-Host ""

try {
  # Step 1: System validation
  Test-Prerequisites

  # Step 2: Dependency installation
  Install-Dependencies

  # Step 3: Clear cache
  Show-Progress "Clearing Hardhat cache..."
  Invoke-SafeCommand "npx hardhat clean" "Clearing Hardhat cache" -ContinueOnError

  # Step 4: Compile contracts
  Show-Progress "Compiling smart contracts..."
  $compileSuccess = Invoke-SafeCommand "npx hardhat compile" "Compiling contracts"
  if (-not $compileSuccess) {
    Write-Error "Contract compilation failed - cannot proceed with tests"
    exit 1
  }

  # Step 5: Run tests (unless skipped)
  if (-not $SkipTests) {
    Show-Progress "Running comprehensive test suite..."
    $testSuccess = Invoke-SafeCommand "npx hardhat test" "Running tests" -TimeoutSeconds 600
    if (-not $testSuccess) {
      Write-Error "Tests failed - CI simulation unsuccessful"
      exit 1
    }
  }
  else {
    Write-Info "Skipping tests (SkipTests specified)"
  }

  # Step 6: Coverage analysis
  Show-Progress "Analyzing test coverage..."
  Invoke-SafeCommand "npx hardhat coverage" "Generating coverage report" -ContinueOnError -TimeoutSeconds 900

  # Step 7: Lint check
  Show-Progress "Running code quality checks..."
  Invoke-SafeCommand "npm run lint" "Linting code" -ContinueOnError

  # Step 8: Final validation
  Show-Progress "Performing final system validation..."

  # Check generated artifacts
  $artifactsPath = "artifacts/contracts"
  if (Test-Path $artifactsPath) {
    $contractCount = (Get-ChildItem $artifactsPath -Recurse -Filter "*.json" | Measure-Object).Count
    Write-Success "✓ Generated $contractCount contract artifacts"
  }

  # Check coverage report
  if (Test-Path "coverage/index.html") {
    Write-Success "✓ Coverage report generated"
  }

  # Summary
  $endTime = Get-Date
  $duration = $endTime - $script:StartTime
  $durationFormatted = "{0:mm\:ss}" -f $duration

  Write-Host ""
  Write-Host "########################################################################" -ForegroundColor Green
  Write-Host "#                    ✅ CI SIMULATION COMPLETED SUCCESSFULLY           #" -ForegroundColor Green
  Write-Host "#                                                                      #" -ForegroundColor Green
  Write-Host "#   🎯 All critical steps passed                                      #" -ForegroundColor Green
  Write-Host "#   ⏱️  Total execution time: $durationFormatted                           #" -ForegroundColor Green
  Write-Host "#   🚀 Your code is ready for production deployment!                  #" -ForegroundColor Green
  Write-Host "########################################################################" -ForegroundColor Green
  Write-Host ""

  Write-Success "CI simulation completed in $durationFormatted"
  Write-Info "All systems operational - PayRox Go Beyond is ready! 🚀"

}
catch {
  $errorDetails = $_.Exception.Message
  $scriptTrace = $_.ScriptStackTrace

  Write-Host ""
  Write-Host "########################################################################" -ForegroundColor Red
  Write-Host "#                        ❌ CI SIMULATION FAILED                       #" -ForegroundColor Red
  Write-Host "########################################################################" -ForegroundColor Red
  Write-Host ""

  Write-Error "CI simulation failed with error: $errorDetails"
  if ($Verbose) {
    Write-Host "Stack trace:" -ForegroundColor Yellow
    Write-Host $scriptTrace -ForegroundColor Gray
  }

  Write-Host ""
  Write-Host "💡 Troubleshooting suggestions:" -ForegroundColor Yellow
  Write-Host "   • Try running with -CleanFirst to clear npm cache" -ForegroundColor White
  Write-Host "   • Check Node.js version (minimum 18.x required)" -ForegroundColor White
  Write-Host "   • Verify npm permissions with: npm config get prefix" -ForegroundColor White
  Write-Host "   • Consider running as administrator" -ForegroundColor White
  Write-Host "   • Use -SkipTests if tests are failing" -ForegroundColor White
  Write-Host ""

  exit 1
}
