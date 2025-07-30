#!/bin/bash
# CI Simulation Script - Tests the exact steps performed in GitHub Actions

echo "🚀 Starting CI simulation..."
echo "Current Node.js version: $(node --version)"
echo "Current NPM version: $(npm --version)"

echo ""
echo "📦 Installing dependencies..."
npm ci

echo ""
echo "🧹 Clearing cache..."
npm run clean
rm -rf node_modules/.cache
rm -rf cache
rm -rf artifacts

echo ""
echo "🔨 Compiling contracts..."
npm run compile

echo ""
echo "🧪 Running all tests..."
CI=true NODE_ENV=test npm run test

echo ""
echo "📊 Running coverage..."
npm run coverage

echo ""
echo "📏 Checking contract sizes..."
npm run size

echo ""
echo "🔍 Running production security tests..."
npm run clean
npm run compile
npx hardhat test test/production-security.spec.ts

echo ""
echo "✅ CI simulation completed successfully!"
echo "If this passes, CI should be green! 🎉"
