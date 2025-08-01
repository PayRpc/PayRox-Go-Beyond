# PayRox Go Beyond - Simple Cross-Chain Test
# Quick test of the runbook implementation

param(
  [string[]]$Networks = @("sepolia", "base-sepolia"),
  [switch]$DryRun = $false,
  [switch]$Help = $false
)

if ($Help) {
  Write-Host "PayRox Go Beyond - Simple Cross-Chain Test" -ForegroundColor Green
  Write-Host ""
  Write-Host "USAGE:"
  Write-Host "  .\test-runbook-simple.ps1 [-Networks @('sepolia','base-sepolia')] [-DryRun] [-Help]"
  Write-Host ""
  Write-Host "EXAMPLES:"
  Write-Host "  .\test-runbook-simple.ps1 -DryRun"
  Write-Host "  .\test-runbook-simple.ps1 -Networks @('sepolia') -DryRun"
  exit 0
}

Write-Host "🎭 PayRox Go Beyond - Simple Cross-Chain Test" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "🌐 Target Networks: $($Networks -join ', ')" -ForegroundColor Cyan
Write-Host "🔧 Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE TEST' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })

$StartTime = Get-Date

# Phase 1: Network Connectivity
Write-Host "`n🔍 PHASE 1: NETWORK CONNECTIVITY" -ForegroundColor Yellow
foreach ($network in $Networks) {
  Write-Host "  📡 Testing $network..." -ForegroundColor White

  try {
    $result = npx hardhat crosschain:health-check --networks $network 2>&1
    if ($LASTEXITCODE -eq 0 -and $result -like "*Connected*") {
      Write-Host "  ✅ $network Connected" -ForegroundColor Green
    }
    else {
      Write-Host "  ❌ $network Failed: $result" -ForegroundColor Red
    }
  }
  catch {
    Write-Host "  ❌ $network Exception: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Phase 2: Salt Generation
Write-Host "`n🧂 PHASE 2: SALT GENERATION" -ForegroundColor Yellow
Write-Host "  🔄 Generating deterministic salt..." -ForegroundColor White

try {
  $salt = npx hardhat crosschain:generate-salt --content "test-factory" --deployer "0x1234567890123456789012345678901234567890" --nonce "1" 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Salt generation successful" -ForegroundColor Green
    $extractedSalt = [regex]::Match($salt, "Universal Salt: (0x[a-fA-F0-9]{64})").Groups[1].Value
    if ($extractedSalt) {
      Write-Host "  🔑 Salt: $($extractedSalt.Substring(0,10))..." -ForegroundColor Cyan
    }
  }
  else {
    Write-Host "  ❌ Salt generation failed: $salt" -ForegroundColor Red
  }
}
catch {
  Write-Host "  ❌ Salt generation exception: $($_.Exception.Message)" -ForegroundColor Red
}

# Phase 3: Address Prediction
Write-Host "`n🔮 PHASE 3: ADDRESS PREDICTION" -ForegroundColor Yellow
Write-Host "  📍 Predicting addresses across networks..." -ForegroundColor White

try {
  $testSalt = "0x1234567890123456789012345678901234567890123456789012345678901234"
  $testBytecode = "0x608060405234801561001057600080fd5b50"
  $networkList = $Networks[0..1] -join ","

  $result = npx hardhat crosschain:predict-addresses --networks $networkList --salt $testSalt --bytecode $testBytecode 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Address prediction successful" -ForegroundColor Green
  }
  else {
    Write-Host "  ❌ Address prediction failed: $result" -ForegroundColor Red
  }
}
catch {
  Write-Host "  ❌ Address prediction exception: $($_.Exception.Message)" -ForegroundColor Red
}

# Phase 4: Compilation Check
Write-Host "`n🔨 PHASE 4: COMPILATION CHECK" -ForegroundColor Yellow
Write-Host "  📦 Compiling contracts..." -ForegroundColor White

if ($DryRun) {
  Write-Host "  🔍 DRY RUN: Skipping compilation" -ForegroundColor Yellow
}
else {
  try {
    npm run compile 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  ✅ Compilation successful" -ForegroundColor Green
    }
    else {
      Write-Host "  ❌ Compilation failed" -ForegroundColor Red
    }
  }
  catch {
    Write-Host "  ❌ Compilation exception: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Summary
$duration = ((Get-Date) - $StartTime).TotalSeconds
Write-Host "`n🎯 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "=" * 30 -ForegroundColor Gray
Write-Host "Networks: $($Networks.Count)" -ForegroundColor White
Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor White
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE TEST' })" -ForegroundColor White

Write-Host "`n📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Run full deployment: .\deploy-crosschain-runbook.ps1" -ForegroundColor White
Write-Host "2. Deploy factory contracts to testnets" -ForegroundColor White
Write-Host "3. Deploy manifest dispatcher contracts" -ForegroundColor White
Write-Host "4. Run complete integration tests" -ForegroundColor White

Write-Host "`n✅ Simple runbook test completed!" -ForegroundColor Green
