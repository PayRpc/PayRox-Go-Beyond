#!/usr/bin/env bash

# PayRox CLI Demo Script
echo "🚀 PayRox Smart Contract CLI Demo"
echo "=================================="
echo ""

echo "📋 Available Commands:"
echo ""

echo "1. Interactive Mode:"
echo "   npm run dev"
echo "   node dist/index.js"
echo ""

echo "2. Direct Commands:"
echo "   node dist/index.js deploy --network localhost"
echo "   node dist/index.js status --network sepolia"
echo ""

echo "3. Help:"
echo "   node dist/index.js --help"
echo ""

echo "🎯 Starting Interactive Demo..."
echo "Use Ctrl+C to exit at any time"
echo ""

cd "$(dirname "$0")"
npm run dev
