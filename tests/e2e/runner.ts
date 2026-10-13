/**
 * E2E Standalone Test Runner & Verification Engine
 * tests/e2e/runner.ts
 *
 * Discovers and executes all 4 test tiers:
 * - Tier 1: Feature Coverage (R1-R5)
 * - Tier 2: Boundary & Corner Cases (R1-R5)
 * - Tier 3: Cross-Feature Combinations (Pairwise)
 * - Tier 4: Real-World Multi-Week Scenarios
 *
 * Can be run standalone via:
 *   npx tsx tests/e2e/runner.ts
 * Or via Vitest:
 *   npm test -- tests/e2e
 */

import { SuiteRegistry, TestCaseResult, TestSuiteResult } from './harness.js';

// Dynamically import test suites to register tests
async function loadAllSuites() {
  await import('./tier1_features.test.js').catch(async () => {
    await import('./tier1_features.test.ts');
  });
  await import('./tier2_boundaries.test.js').catch(async () => {
    await import('./tier2_boundaries.test.ts');
  });
  await import('./tier3_pairwise.test.js').catch(async () => {
    await import('./tier3_pairwise.test.ts');
  });
  await import('./tier4_scenarios.test.js').catch(async () => {
    await import('./tier4_scenarios.test.ts');
  });
  await import('./tier5_adversarial.test.js').catch(async () => {
    await import('./tier5_adversarial.test.ts');
  });
}

export async function runAllTests(): Promise<{ passed: number; failed: number; total: number; durationMs: number }> {
  const registry = SuiteRegistry.get();
  await loadAllSuites();

  const startTime = Date.now();
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('======================================================================');
  console.log('  PERSONAL DASHBOARD — E2E REQUIREMENT TEST SUITE RUNNER');
  console.log('  Testing Track: Milestone 5 | Tiers 1 - 5 Verification');
  console.log('======================================================================\n');

  // Group suites by Tier
  const tierSummaries: Record<number, { name: string; passed: number; failed: number; total: number }> = {
    1: { name: 'Tier 1: Feature Coverage (R1-R5)', passed: 0, failed: 0, total: 0 },
    2: { name: 'Tier 2: Boundary & Corner Cases', passed: 0, failed: 0, total: 0 },
    3: { name: 'Tier 3: Cross-Feature Combinations', passed: 0, failed: 0, total: 0 },
    4: { name: 'Tier 4: Real-World Scenarios', passed: 0, failed: 0, total: 0 },
    5: { name: 'Tier 5: Adversarial Hardening', passed: 0, failed: 0, total: 0 },
  };

  for (let i = 0; i < registry.suites.length; i++) {
    const suite = registry.suites[i];
    registry.currentSuiteTier = suite.tier;
    registry.currentTests = [];
    suite.fn(); // Populates currentTests or pushes nested suites
    const tests = [...registry.currentTests];

    const suiteResults: TestCaseResult[] = [];
    let suitePassed = 0;
    let suiteFailed = 0;

    for (const test of tests) {
      totalTests++;
      const testStart = Date.now();
      try {
        await test.fn();
        const duration = Date.now() - testStart;
        suiteResults.push({ name: test.name, passed: true, durationMs: duration });
        suitePassed++;
        totalPassed++;
      } catch (err: any) {
        const duration = Date.now() - testStart;
        suiteResults.push({ name: test.name, passed: false, error: err, durationMs: duration });
        suiteFailed++;
        totalFailed++;
        console.error(`  [FAIL] ${test.name}`);
        console.error(`         ${err.message || String(err)}\n`);
      }
    }

    const tier = suite.tier || 1;
    if (tierSummaries[tier]) {
      tierSummaries[tier].passed += suitePassed;
      tierSummaries[tier].failed += suiteFailed;
      tierSummaries[tier].total += (suitePassed + suiteFailed);
    }
  }

  const durationMs = Date.now() - startTime;

  console.log('----------------------------------------------------------------------');
  console.log('TIER BREAKDOWN:');
  console.log('----------------------------------------------------------------------');
  for (const tierNum of [1, 2, 3, 4, 5]) {
    const s = tierSummaries[tierNum];
    const status = s.failed === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(
      `  [${status}] ${s.name.padEnd(42)} ${String(s.passed).padStart(2)} / ${String(s.total).padStart(2)} passed`
    );
  }

  console.log('======================================================================');
  console.log(
    `SUMMARY: TOTAL: ${totalTests} | PASSED: ${totalPassed} | FAILED: ${totalFailed} | DURATION: ${durationMs}ms`
  );
  if (totalFailed === 0) {
    console.log('STATUS: ALL REQUIREMENTS VERIFIED (100% READY FOR MILESTONE AUDIT)');
  } else {
    console.log(`STATUS: ${totalFailed} TESTS FAILED`);
  }
  console.log('======================================================================\n');

  return { passed: totalPassed, failed: totalFailed, total: totalTests, durationMs };
}

// Auto-run if executed directly as entrypoint
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('runner.ts')) {
  runAllTests().then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
  });
}
