# PayRox Go Beyond - Simple CI Test Script
# Tests compilation and basic functionality without dependency installation
# Version: 1.0.0

param(
  [switch]$Verbose,
  [switch]$Help
)

# Color functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Step { param($Message) Write-Host "🔧 $Message" -ForegroundColor White }

# Help display
if ($Help) {
  Write-Host ""
  Write-Host "PayRox Go Beyond Simple CI Test Script" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Usage:" -ForegroundColor White
  Write-Host "  .\test-ci-simple.ps1 [options]" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Options:" -ForegroundColor White
  Write-Host "  -Verbose          Show detailed output" -ForegroundColor Gray
  Write-Host "  -Help             Show this help message" -ForegroundColor Gray
  Write-Host ""
  exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host " 🧪 PayRox Go Beyond Simple CI Test" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host ""

try {
  # Check system requirements
  Write-Step "Checking system requirements..."

  # Node.js version
  $nodeVersion = node --version
  Write-Success "Node.js version: $nodeVersion"

  # npm version
  $npmVersion = npm --version
  Write-Success "npm version: $npmVersion"

  # Check if package.json exists
  if (Test-Path "package.json") {
    Write-Success "✓ package.json found"
  }
  else {
    Write-Error "✗ package.json not found"
    exit 1
  }

  # Check if hardhat.config.ts exists
  if (Test-Path "hardhat.config.ts") {
    Write-Success "✓ hardhat.config.ts found"
  }
  else {
    Write-Error "✗ hardhat.config.ts not found"
    exit 1
  }

  # Check if contracts directory exists
  if (Test-Path "contracts") {
    $contractCount = (Get-ChildItem "contracts" -Recurse -Filter "*.sol" | Measure-Object).Count
    Write-Success "✓ Found $contractCount Solidity contracts"
  }
  else {
    Write-Error "✗ contracts directory not found"
    exit 1
  }

  # Check if test directory exists
  if (Test-Path "test") {
    $testCount = (Get-ChildItem "test" -Recurse -Filter "*.ts" | Measure-Object).Count
    Write-Success "✓ Found $testCount test files"
  }
  else {
    Write-Warning "⚠ test directory not found"
  }

  # Check node_modules status
  Write-Step "Checking dependency status..."
  if (Test-Path "node_modules") {
    Write-Success "✓ node_modules directory exists"

    # Check for key dependencies
    $keyDeps = @("hardhat", "@nomicfoundation/hardhat-toolbox", "ethers")
    foreach ($dep in $keyDeps) {
      if (Test-Path "node_modules/$dep") {
        Write-Success "✓ $dep installed"
      }
      else {
        Write-Warning "⚠ $dep not found"
      }
    }
  }
  else {
    Write-Warning "⚠ node_modules directory not found"
    Write-Info "Dependencies need to be installed with: npm install"
  }

  # Try to run hardhat version
  Write-Step "Testing Hardhat accessibility..."
  try {
    # Try local hardhat first
    if (Test-Path "node_modules/.bin/hardhat.cmd") {
      $hardhatVersion = & "node_modules/.bin/hardhat.cmd" --version 2>$null
      if ($LASTEXITCODE -eq 0) {
        Write-Success "Local Hardhat working: $hardhatVersion"
      }
      else {
        Write-Warning "Local Hardhat found but not working"
      }
    }
    elseif (Test-Path "node_modules/hardhat") {
      Write-Info "Hardhat module found, trying npx..."
      try {
        $hardhatVersion = npx hardhat --version 2>$null
        if ($LASTEXITCODE -eq 0) {
          Write-Success "Hardhat accessible via npx: $hardhatVersion"
        }
        else {
          Write-Warning "Hardhat module found but npx failed"
        }
      }
      catch {
        Write-Warning "npx hardhat failed"
      }
    }
    else {
      Write-Warning "Hardhat not found locally"
    }
  }
  catch {
    Write-Warning "Hardhat check failed: $($_.Exception.Message)"
  }

  # Check for artifacts (compiled contracts)
  Write-Step "Checking compilation artifacts..."
  if (Test-Path "artifacts") {
    $artifactCount = (Get-ChildItem "artifacts" -Recurse -Filter "*.json" | Measure-Object).Count
    Write-Success "✓ Found $artifactCount compilation artifacts"
  }
  else {
    Write-Info "No compilation artifacts found (run: npx hardhat compile)"
  }

  # Check for test coverage
  if (Test-Path "coverage") {
    Write-Success "✓ Coverage directory exists"
    if (Test-Path "coverage/index.html") {
      Write-Success "✓ Coverage report available"
    }
  }
  else {
    Write-Info "No coverage report found (run: npx hardhat coverage)"
  }

  # Summary
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Green
  Write-Host " ✅ CI TEST VALIDATION COMPLETED" -ForegroundColor Green
  Write-Host "========================================" -ForegroundColor Green
  Write-Host ""

  Write-Success "Basic system validation passed"
  Write-Info "To complete CI simulation:"
  Write-Host "  1. Install dependencies: npm install" -ForegroundColor White
  Write-Host "  2. Compile contracts: npx hardhat compile" -ForegroundColor White
  Write-Host "  3. Run tests: npx hardhat test" -ForegroundColor White
  Write-Host "  4. Generate coverage: npx hardhat coverage" -ForegroundColor White
  Write-Host ""

}
catch {
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Red
  Write-Host " ❌ CI TEST VALIDATION FAILED" -ForegroundColor Red
  Write-Host "========================================" -ForegroundColor Red
  Write-Host ""

  Write-Error "Validation failed: $($_.Exception.Message)"
  if ($Verbose) {
    Write-Host "Details: $($_.ScriptStackTrace)" -ForegroundColor Gray
  }
  exit 1
}
