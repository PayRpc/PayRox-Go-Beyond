# CI Simulation Script - Tests the exact steps performed in GitHub Actions

Write-Host "🚀 Starting CI simulation..." -ForegroundColor Green
Write-Host "Current Node.js version: $(node --version)" -ForegroundColor Cyan
Write-Host "Current NPM version: $(npm --version)" -ForegroundColor Cyan

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host ""
Write-Host "🧹 Clearing cache..." -ForegroundColor Yellow
npm run clean
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
if (Test-Path "cache") { Remove-Item -Recurse -Force "cache" }
if (Test-Path "artifacts") { Remove-Item -Recurse -Force "artifacts" }

Write-Host ""
Write-Host "🔨 Compiling contracts..." -ForegroundColor Yellow
npm run compile

Write-Host ""
Write-Host "🧪 Running all tests..." -ForegroundColor Yellow
$env:CI = "true"
$env:NODE_ENV = "test"
npm run test

Write-Host ""
Write-Host "📊 Running coverage..." -ForegroundColor Yellow
npm run coverage

Write-Host ""
Write-Host "📏 Checking contract sizes..." -ForegroundColor Yellow
npm run size

Write-Host ""
Write-Host "🔍 Running production security tests..." -ForegroundColor Yellow
npm run clean
npm run compile
npx hardhat test test/production-security.spec.ts

Write-Host ""
Write-Host "✅ CI simulation completed successfully!" -ForegroundColor Green
Write-Host "If this passes, CI should be green! 🎉" -ForegroundColor Green
