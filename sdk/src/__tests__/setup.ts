// Jest setup file for PayRox SDK tests
import 'jest';

// Global test setup
beforeAll(() => {
  // Setup any global test configurations
});

afterAll(() => {
  // Cleanup any global test resources
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAddress(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidAddress(received: string) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid Ethereum address`,
      pass: isValid,
    };
  },
});

export {};