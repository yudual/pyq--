#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */


/**
 * Master E2E Test Runner for Blog Frontend Optimization
 * Executes opaque-box verification test suites (Tiers 1-4).
 *
 * Usage:
 *   node tests/e2e/runner.js
 *   node tests/e2e/runner.js --tier=1
 *   node tests/e2e/runner.js --milestone=M1
 *   node tests/e2e/runner.js --feature=F1
 *   node tests/e2e/runner.js --strict
 *   node tests/e2e/runner.js --report-only
 */

const fs = require("node:fs");
const path = require("node:path");
const { globalContext, colors } = require("./harness");

// Parse CLI flags
const args = process.argv.slice(2);
const options = {
  tier: null,
  feature: null,
  milestone: null,
  strict: args.includes("--strict"),
  reportOnly: args.includes("--report-only"),
  summaryJson: args.includes("--summary-json"),
};

for (const arg of args) {
  if (arg.startsWith("--tier=")) {
    options.tier = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--feature=")) {
    options.feature = arg.split("=")[1].toUpperCase();
  } else if (arg.startsWith("--milestone=")) {
    options.milestone = arg.split("=")[1].toUpperCase();
  }
}

const TEST_DIRS = [
  path.join(__dirname, "tier1-feature-coverage"),
  path.join(__dirname, "tier2-boundary-corner"),
  path.join(__dirname, "tier3-cross-feature"),
  path.join(__dirname, "tier4-real-world-scenarios"),
];

function findTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (entry.name.endsWith(".test.js")) {
      results.push(full);
    }
  }
  return results.sort();
}

async function run() {
  const startTime = Date.now();
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  Blog Frontend E2E Test Suite Runner (Tiers 1-4)   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

  if (options.tier) console.log(`${colors.yellow}Filter: Tier ${options.tier}${colors.reset}`);
  if (options.feature) console.log(`${colors.yellow}Filter: Feature ${options.feature}${colors.reset}`);
  if (options.milestone) console.log(`${colors.yellow}Filter: Milestone ${options.milestone}${colors.reset}`);

  const testFiles = [];
  for (const dir of TEST_DIRS) {
    testFiles.push(...findTestFiles(dir));
  }

  console.log(`${colors.gray}Discovered ${testFiles.length} test files across 4 tiers...${colors.reset}\n`);

  // Execute test files
  for (const file of testFiles) {
    const relPath = path.relative(__dirname, file);
    // Tier filtering
    if (options.tier) {
      const tierMatch = relPath.match(/tier(\d)/);
      if (tierMatch && parseInt(tierMatch[1], 10) !== options.tier) {
        continue;
      }
    }

    try {
      require(file);
    } catch (err) {
      console.error(`${colors.red}Error executing test file ${relPath}:${colors.reset}`, err);
    }
  }

  // Allow any pending async tests in suites to settle
  await new Promise((resolve) => setTimeout(resolve, 300));

  const duration = Date.now() - startTime;
  printReport(duration);
}

function printReport(totalDuration) {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  const failures = [];
  const tierStats = {
    1: { name: "Tier 1: Feature Coverage (R1-R4)", total: 0, passed: 0, failed: 0 },
    2: { name: "Tier 2: Boundary & Corner Cases", total: 0, passed: 0, failed: 0 },
    3: { name: "Tier 3: Cross-Feature Interactions", total: 0, passed: 0, failed: 0 },
    4: { name: "Tier 4: Real-World Scenarios", total: 0, passed: 0, failed: 0 },
  };

  const milestoneDefects = {
    M1: [],
    M2: [],
    M3: [],
    M4: [],
    Other: [],
  };

  for (const suite of globalContext.suites) {
    const tier = suite.meta?.tier || 1;
    let suitePrinted = false;

    for (const t of suite.tests) {
      // Filter check
      if (options.feature && suite.meta?.feature !== options.feature) continue;
      if (options.milestone && suite.meta?.milestone !== options.milestone) continue;

      totalTests++;
      tierStats[tier].total++;

      if (t.status === "pass") {
        passedTests++;
        tierStats[tier].passed++;
      } else if (t.status === "fail") {
        failedTests++;
        tierStats[tier].failed++;
        failures.push({ suite: suite.name, test: t.name, error: t.error, meta: suite.meta });

        const milestone = suite.meta?.milestone || "Other";
        milestoneDefects[milestone] = milestoneDefects[milestone] || [];
        milestoneDefects[milestone].push({
          test: t.name,
          suite: suite.name,
          message: t.error?.message || String(t.error),
        });
      } else if (t.status === "skip") {
        skippedTests++;
      }
    }
  }

  // Print Tier Breakdown
  console.log(`${colors.bold}Test Execution Summary by Tier:${colors.reset}`);
  console.log("----------------------------------------------------------------------");
  for (const [tierNum, stat] of Object.entries(tierStats)) {
    const pct = stat.total > 0 ? ((stat.passed / stat.total) * 100).toFixed(1) : "0.0";
    const statusColor = stat.failed === 0 && stat.total > 0 ? colors.green : colors.yellow;
    console.log(
      `  Tier ${tierNum} - ${stat.name.padEnd(36)} ` +
      `Total: ${String(stat.total).padStart(3)} | ` +
      `Pass: ${colors.green}${String(stat.passed).padStart(3)}${colors.reset} | ` +
      `Fail: ${stat.failed > 0 ? colors.red : colors.gray}${String(stat.failed).padStart(3)}${colors.reset} ` +
      `(${statusColor}${pct}%${colors.reset})`
    );
  }
  console.log("----------------------------------------------------------------------\n");

  // Print Totals
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0.0";
  console.log(`${colors.bold}Overall Statistics:${colors.reset}`);
  console.log(`  Suites Executed:     ${globalContext.suites.length}`);
  console.log(`  Total Test Cases:    ${totalTests}`);
  console.log(`  Total Assertions:    ${globalContext.totalAssertions}`);
  console.log(`  Passed Tests:        ${colors.green}${passedTests}${colors.reset}`);
  console.log(`  Failed / Pending:    ${failedTests > 0 ? colors.yellow : colors.green}${failedTests}${colors.reset}`);
  console.log(`  Pass Rate:           ${passRate}%`);
  console.log(`  Execution Time:      ${totalDuration}ms\n`);

  // Defect / Pending Implementation Log for M1-M4 workers
  if (failedTests > 0) {
    console.log(`${colors.bold}${colors.yellow}======================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}  Pending Milestone Implementation Items & Defects Identified (${failedTests})  ${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}======================================================================${colors.reset}`);

    for (const [m, items] of Object.entries(milestoneDefects)) {
      if (items.length === 0) continue;
      console.log(`\n${colors.bold}${colors.magenta}[${m} Requirements] - ${items.length} pending items:${colors.reset}`);
      items.forEach((item, idx) => {
        console.log(`  ${colors.yellow}${idx + 1}.${colors.reset} ${item.test}`);
        console.log(`     ${colors.gray}Reason: ${item.message.split("\n")[0]}${colors.reset}`);
      });
    }
    console.log(`\n${colors.gray}Run with --strict to enforce 0 failures, or use this list as M1-M4 task checklist.${colors.reset}\n`);
  }

  // Summary JSON export if requested
  if (options.summaryJson) {
    const jsonReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      suitesCount: globalContext.suites.length,
      totalTests,
      passedTests,
      failedTests,
      totalAssertions: globalContext.totalAssertions,
      passedAssertions: globalContext.passedAssertions,
      failedAssertions: globalContext.failedAssertions,
      passRate: `${passRate}%`,
      tierStats,
      milestoneDefects,
    };
    const outPath = path.join(__dirname, "results.json");
    fs.writeFileSync(outPath, JSON.stringify(jsonReport, null, 2), "utf-8");
    console.log(`${colors.green}Saved summary JSON to ${outPath}${colors.reset}`);
  }

  // Determine exit code
  if (options.reportOnly) {
    process.exit(0);
  } else if (options.strict && failedTests > 0) {
    process.exit(1);
  } else {
    // Return 0 if all tests pass, or if in baseline reporting mode without strict
    process.exit(failedTests > 0 && options.strict ? 1 : 0);
  }
}

run().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
