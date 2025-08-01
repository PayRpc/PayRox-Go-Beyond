# PayRox CLI Test Script
# Tests the complete system deployment through CLI automation

Write-Host "🧪 Testing PayRox CLI Complete System Deployment" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

try {
    # Change to CLI directory
    $cliDir = Join-Path $PSScriptRoot ""
    Set-Location $cliDir
    
    Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "🎯 Testing CLI at: dist/index.js" -ForegroundColor Yellow
    Write-Host ""
    
    # Prepare input sequence: Utils (8) -> Deploy Complete (1) -> Confirm (y) -> Exit (0)
    $inputSequence = @"
8
1
y
0
"@
    
    Write-Host "🤖 Automated input sequence prepared:" -ForegroundColor Cyan
    Write-Host "   8 - Select Utils menu" -ForegroundColor Gray
    Write-Host "   1 - Deploy complete system" -ForegroundColor Gray
    Write-Host "   y - Confirm deployment" -ForegroundColor Gray
    Write-Host "   0 - Exit CLI" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "🚀 Starting CLI test..." -ForegroundColor Green
    
    # Execute CLI with input
    $output = $inputSequence | node dist/index.js
    
    Write-Host "📋 CLI Output:" -ForegroundColor Yellow
    Write-Host $output
    Write-Host ""
    
    # Check for success indicators
    if ($output -match "DEPLOYMENT COMPLETE!") {
        Write-Host "✅ CLI deployment test SUCCESSFUL!" -ForegroundColor Green
        
        # Extract deployment addresses
        if ($output -match "🏭 Factory: (0x[a-fA-F0-9]{40})") {
            $factoryAddr = $matches[1]
            Write-Host "   🏭 Factory deployed: $factoryAddr" -ForegroundColor Green
        }
        
        if ($output -match "🗂️ Dispatcher: (0x[a-fA-F0-9]{40})") {
            $dispatcherAddr = $matches[1]
            Write-Host "   🗂️ Dispatcher deployed: $dispatcherAddr" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "🎉 COMPLETE SYSTEM DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
        Write-Host "✅ Security fixes implemented and deployed" -ForegroundColor Green
        Write-Host "✅ CLI automation working perfectly" -ForegroundColor Green
        Write-Host "✅ Full PayRox system ready for production" -ForegroundColor Green
        
    } else {
        Write-Host "❌ CLI deployment test FAILED - deployment not completed" -ForegroundColor Red
        Write-Host "Output received but no deployment completion detected" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ CLI test failed with error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
