/**
 * Test script for Enhanced Architecture Comparison Tool CLI features
 */

const { spawn } = require('child_process');
const path = require('path');

async function testCliFeature(args, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(
    `📝 Command: npx hardhat run scripts/architecture-comparison-enhanced.ts ${args.join(
      ' '
    )}`
  );

  return new Promise(resolve => {
    const process = spawn(
      'npx',
      [
        'hardhat',
        'run',
        'scripts/architecture-comparison-enhanced.ts',
        ...args,
      ],
      {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
      }
    );

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', data => {
      stdout += data.toString();
    });

    process.stderr.on('data', data => {
      stderr += data.toString();
    });

    process.on('close', code => {
      console.log(`✅ Exit code: ${code}`);
      if (stdout) {
        console.log(
          '📊 Output preview:',
          stdout.split('\n').slice(0, 5).join('\n')
        );
      }
      if (stderr && !stderr.includes('injecting env')) {
        console.log('⚠️ Errors:', stderr.split('\n').slice(0, 3).join('\n'));
      }
      resolve({ code, stdout, stderr });
    });

    // Set a timeout for each test
    setTimeout(() => {
      process.kill();
      console.log('⏰ Test timed out');
      resolve({ code: -1, stdout, stderr });
    }, 30000); // 30 second timeout per test
  });
}

async function runTests() {
  console.log('🚀 Enhanced Architecture Comparison CLI Tests');
  console.log('='.repeat(60));

  const tests = [
    {
      args: ['--', '--verbose'],
      description: 'Verbose mode',
    },
    {
      args: ['--', '--detailed'],
      description: 'Detailed analysis mode',
    },
    {
      args: ['--', '--format', 'json'],
      description: 'JSON output format',
    },
    {
      args: ['--', '--metrics'],
      description: 'Metrics analysis',
    },
    {
      args: ['--', '--benchmark'],
      description: 'Performance benchmarks',
    },
  ];

  for (const test of tests) {
    try {
      await testCliFeature(test.args, test.description);
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All CLI tests completed!');
}

// Run the tests
runTests().catch(console.error);
