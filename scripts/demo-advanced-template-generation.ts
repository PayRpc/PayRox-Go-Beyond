#!/usr/bin/env ts-node

/**
 * Advanced Template Generation Demo
 * Shows how to create custom facets with specific storage and functions
 */

import { PayRoxTemplateGenerator } from '../templates/v2/generator/index';

async function demonstrateAdvancedGeneration() {
  console.log('🎯 Advanced Template Generation Demo');
  console.log('═'.repeat(60));

  const generator = new PayRoxTemplateGenerator();

  // Define custom trading facet specifications
  const tradingCustomizations = {
    description: 'Advanced trading facet with order management and liquidity',
    storage: [
      { type: 'mapping(address => uint256)', name: 'userBalances', comment: 'User token balances' },
      { type: 'mapping(bytes32 => Order)', name: 'orders', comment: 'Active orders by ID' },
      { type: 'uint256', name: 'totalVolume', comment: 'Total trading volume' },
      { type: 'uint256', name: 'feeRate', comment: 'Trading fee rate (basis points)' }
    ],
    events: [
      { name: 'OrderPlaced', params: 'bytes32 indexed orderId, address indexed trader, uint256 amount' },
      { name: 'OrderFilled', params: 'bytes32 indexed orderId, uint256 fillAmount' },
      { name: 'FeeRateUpdated', params: 'uint256 oldRate, uint256 newRate' }
    ],
    initParams: [
      { type: 'uint256', name: 'initialFeeRate_' }
    ],
    initLogic: `
        l.feeRate = initialFeeRate_;
        if (initialFeeRate_ > 1000) revert InvalidParam(); // Max 10%`,
    adminFunctions: [
      {
        name: 'setFeeRate',
        params: 'uint256 newRate_',
        body: `
        if (newRate_ > 1000) revert InvalidParam(); // Max 10%
        uint256 oldRate = _s().feeRate;
        _s().feeRate = newRate_;
        emit FeeRateUpdated(oldRate, newRate_);`
      }
    ],
    coreFunctions: [
      {
        name: 'placeOrder',
        params: 'uint256 amount, uint256 price',
        body: `
        if (amount == 0 || price == 0) revert InvalidParam();
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, block.timestamp, amount));
        // Order placement logic here
        emit OrderPlaced(orderId, msg.sender, amount);`
      },
      {
        name: 'fillOrder',
        params: 'bytes32 orderId, uint256 fillAmount',
        body: `
        if (fillAmount == 0) revert InvalidParam();
        // Order filling logic here
        emit OrderFilled(orderId, fillAmount);`
      }
    ],
    viewFunctions: [
      {
        name: 'getFeeRate',
        params: '',
        returns: 'uint256',
        body: 'return _s().feeRate;'
      },
      {
        name: 'getTotalVolume',
        params: '',
        returns: 'uint256', 
        body: 'return _s().totalVolume;'
      }
    ]
  };

  try {
    // Generate advanced trading facet
    await generator.generateFromArchetype(
      'AdvancedTradingFacet',
      'core',
      tradingCustomizations
    );

    console.log('\\n🎉 Advanced TradingFacet generated with:');
    console.log('   📦 Custom storage: 4 fields');
    console.log('   📅 Custom events: 3 events');
    console.log('   🔧 Admin functions: 1 function');
    console.log('   ⚡ Core functions: 2 functions');
    console.log('   👁️  View functions: 2 functions');

  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

// Run the demo
demonstrateAdvancedGeneration().catch(console.error);
