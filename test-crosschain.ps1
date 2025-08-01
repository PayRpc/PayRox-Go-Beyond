# PayRox Go Beyond - Cross-Chain Test Suite
# Tests the complete cross-chain deployment pipeline

Write-Host "🚀 PayRox Go Beyond - Cross-Chain Test Suite" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

# Test networks (testnets to avoid mainnet costs)
$TEST_NETWORKS = @(
  "sepolia",
  "base-sepolia",
  "arbitrum-sepolia",
  "optimism-sepolia",
  "fuji"
)

$results = @{
  Tests   = @()
  Summary = @{
    Total  = 0
    Passed = 0
    Failed = 0
  }
}

function Write-TestResult {
  param(
    [string]$TestName,
    [bool]$Passed,
    [string]$Details = ""
  )

  $results.Summary.Total++

  if ($Passed) {
    $results.Summary.Passed++
    Write-Host "✅ $TestName`: PASS $Details" -ForegroundColor Green
  }
  else {
    $results.Summary.Failed++
    Write-Host "❌ $TestName`: FAIL $Details" -ForegroundColor Red
  }

  $results.Tests += @{
    Name    = $TestName
    Passed  = $Passed
    Details = $Details
  }
}

function Test-Command {
  param(
    [string]$Command,
    [string]$Description
  )

  Write-Host "⚡ Running: $Description" -ForegroundColor Yellow

  try {
    $output = Invoke-Expression $Command 2>&1
    $exitCode = $LASTEXITCODE

    return @{
      Success  = $exitCode -eq 0
      Output   = $output -join "`n"
      ExitCode = $exitCode
    }
  }
  catch {
    return @{
      Success  = $false
      Output   = $_.Exception.Message
      ExitCode = 1
    }
  }
}

Write-Host "🏥 Testing Network Health..." -ForegroundColor Cyan

foreach ($network in $TEST_NETWORKS) {
  $result = Test-Command -Command "npx hardhat crosschain:health-check --networks $network" -Description "Health check for $network"

  $passed = $result.Success -and ($result.Output -like "*networks healthy*")
  $details = if ($passed) { "Connected" } else { "Failed: RPC issue" }

  Write-TestResult -TestName "Network Health: $network" -Passed $passed -Details $details
}

Write-Host "`n🧂 Testing Salt Generation..." -ForegroundColor Cyan

$salts = @{}
foreach ($network in $TEST_NETWORKS) {
  $result = Test-Command -Command "npx hardhat crosschain:generate-salt --deployer 0x1234567890123456789012345678901234567890 --nonce 42 --networks $network" -Description "Generate salt for $network"

  if ($result.Success) {
    # Extract salt from output
    $saltMatch = [regex]::Match($result.Output, "Salt: (0x[a-fA-F0-9]{64})")
    if ($saltMatch.Success) {
      $salt = $saltMatch.Groups[1].Value
      $salts[$network] = $salt
      Write-TestResult -TestName "Salt Generation: $network" -Passed $true -Details "Salt: $($salt.Substring(0, 10))..."
    }
    else {
      Write-TestResult -TestName "Salt Generation: $network" -Passed $false -Details "Could not extract salt"
    }
  }
  else {
    Write-TestResult -TestName "Salt Generation: $network" -Passed $false -Details $result.Output
  }
}

# Test salt uniqueness
$saltValues = $salts.Values
$uniqueSalts = $saltValues | Sort-Object -Unique
$allUnique = ($saltValues.Count -eq $uniqueSalts.Count) -and ($saltValues.Count -gt 0)

Write-TestResult -TestName "Salt Uniqueness" -Passed $allUnique -Details "$($saltValues.Count) salts, $($uniqueSalts.Count) unique"

Write-Host "`n🔮 Testing Address Prediction..." -ForegroundColor Cyan

$addresses = @{}
foreach ($network in $TEST_NETWORKS) {
  $testSalt = "0x" + ("1" * 64)
  $result = Test-Command -Command "npx hardhat crosschain:predict-addresses --salt $testSalt --networks $network" -Description "Predict addresses for $network"

  if ($result.Success) {
    # Extract predicted address
    $addressMatch = [regex]::Match($result.Output, "Predicted.*: (0x[a-fA-F0-9]{40})")
    if ($addressMatch.Success) {
      $address = $addressMatch.Groups[1].Value
      $addresses[$network] = $address
      Write-TestResult -TestName "Address Prediction: $network" -Passed $true -Details "Addr: $($address.Substring(0, 10))..."
    }
    else {
      Write-TestResult -TestName "Address Prediction: $network" -Passed $false -Details "Could not extract address"
    }
  }
  else {
    Write-TestResult -TestName "Address Prediction: $network" -Passed $false -Details $result.Output
  }
}

# Test address consistency
$addressValues = $addresses.Values
$uniqueAddresses = $addressValues | Sort-Object -Unique
$consistent = ($uniqueAddresses.Count -eq 1) -and ($addressValues.Count -gt 0)

Write-TestResult -TestName "Address Consistency" -Passed $consistent -Details "$($addressValues.Count) networks, $($uniqueAddresses.Count) unique addresses"

Write-Host "`n🚀 Testing Cross-Chain Deployment Simulation..." -ForegroundColor Cyan

# Test compilation
$compileResult = Test-Command -Command "npm run compile" -Description "Compile contracts"
Write-TestResult -TestName "Contract Compilation" -Passed $compileResult.Success -Details $(if ($compileResult.Success) { "Contracts compiled" } else { "Compilation failed" })

# Test manifest operations (if available)
$manifestResult = Test-Command -Command "npx hardhat payrox:build-manifest --environment test" -Description "Build test manifest"
Write-TestResult -TestName "Manifest Generation" -Passed $manifestResult.Success -Details $(if ($manifestResult.Success) { "Manifest built" } else { "Manifest failed" })

Write-Host "`n🔗 Testing Multi-Network Consistency..." -ForegroundColor Cyan

# Test health check across multiple networks
$networkList = $TEST_NETWORKS[0..2] -join ","
$healthResult = Test-Command -Command "npx hardhat crosschain:health-check --networks $networkList" -Description "Multi-network health check"

$healthPassed = $healthResult.Success
foreach ($network in $TEST_NETWORKS[0..2]) {
  if (-not ($healthResult.Output -like "*$network`:*" -and $healthResult.Output -like "*Connected*")) {
    $healthPassed = $false
    break
  }
}

Write-TestResult -TestName "Multi-Network Health" -Passed $healthPassed -Details $(if ($healthPassed) { "All networks accessible" } else { "Some networks failed" })

# Generate report
Write-Host "`n📊 Generating Test Report..." -ForegroundColor Cyan

$report = @{
  Timestamp   = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
  TestSuite   = "PayRox Go Beyond Cross-Chain Test"
  Version     = "1.0.0"
  Networks    = $TEST_NETWORKS
  Summary     = $results.Summary
  SuccessRate = [math]::Round(($results.Summary.Passed / $results.Summary.Total) * 100, 2).ToString() + "%"
  Tests       = $results.Tests
  Conclusions = @()
}

# Add conclusions
if ($results.Summary.Failed -eq 0) {
  $report.Conclusions += "✅ All tests passed - Cross-chain deployment system is ready"
  $report.Conclusions += "✅ Network connectivity verified across all test networks"
  $report.Conclusions += "✅ Deterministic salt generation working correctly"
  $report.Conclusions += "✅ Address prediction consistency confirmed"
}
else {
  $report.Conclusions += "⚠️ $($results.Summary.Failed) tests failed - Review required"
  $report.Conclusions += "🔧 Check network configurations and RPC endpoints"
}

# Save report
$reportPath = Join-Path $PWD "crosschain-test-report.json"
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "💾 Report saved to: $reportPath" -ForegroundColor Green

# Print final summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "📊 FINAL RESULTS" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host "Total Tests: $($report.Summary.Total)"
Write-Host "Passed: $($report.Summary.Passed)" -ForegroundColor Green
Write-Host "Failed: $($report.Summary.Failed)" -ForegroundColor Red
Write-Host "Success Rate: $($report.SuccessRate)"
Write-Host "`n🎯 CONCLUSIONS:" -ForegroundColor Yellow
foreach ($conclusion in $report.Conclusions) {
  Write-Host "   $conclusion"
}

# Exit with appropriate code
exit $(if ($results.Summary.Failed -eq 0) { 0 } else { 1 })
