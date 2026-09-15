/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * E2E Test Harness for Blog Frontend Optimization
 * Opaque-box requirement verification framework supporting Tiers 1-4.
 */

const fs = require("node:fs");
const path = require("node:path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

class AssertionFailure extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = "AssertionFailure";
    this.actual = actual;
    this.expected = expected;
  }
}

class TestContext {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.startTime = Date.now();
  }

  createSuite(name, meta = {}) {
    const suite = {
      name,
      meta,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
    this.suites.push(suite);
    this.currentSuite = suite;
    return suite;
  }

  addTestResult(name, status, error = null, duration = 0, meta = {}) {
    if (!this.currentSuite) {
      this.createSuite("Default Suite");
    }
    const testResult = {
      name,
      status,
      error,
      duration,
      meta,
    };
    this.currentSuite.tests.push(testResult);
    if (status === "pass") this.currentSuite.passed++;
    else if (status === "fail") this.currentSuite.failed++;
    else if (status === "skip") this.currentSuite.skipped++;
  }
}

const globalContext = new TestContext();

function expect(actual) {
  return {
    toBe(expected) {
      globalContext.totalAssertions++;
      if (actual !== expected) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toEqual(expected) {
      globalContext.totalAssertions++;
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected deep equality:\nActual:   ${actualStr}\nExpected: ${expectedStr}`,
          actual,
          expected
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeTruthy() {
      globalContext.totalAssertions++;
      if (!actual) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(`Expected truthy value, received ${actual}`, actual, true);
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeFalsy() {
      globalContext.totalAssertions++;
      if (actual) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(`Expected falsy value, received ${actual}`, actual, false);
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeNull() {
      globalContext.totalAssertions++;
      if (actual !== null) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(`Expected null, received ${actual}`, actual, null);
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeDefined() {
      globalContext.totalAssertions++;
      if (typeof actual === "undefined") {
        globalContext.failedAssertions++;
        throw new AssertionFailure(`Expected defined value, received undefined`, actual, "defined");
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeUndefined() {
      globalContext.totalAssertions++;
      if (typeof actual !== "undefined") {
        globalContext.failedAssertions++;
        throw new AssertionFailure(`Expected undefined, received ${actual}`, actual, undefined);
      }
      globalContext.passedAssertions++;
      return true;
    },

    toContain(item) {
      globalContext.totalAssertions++;
      let pass = false;
      if (typeof actual === "string") {
        pass = actual.includes(item);
      } else if (Array.isArray(actual)) {
        pass = actual.includes(item) || actual.some((x) => JSON.stringify(x) === JSON.stringify(item));
      }
      if (!pass) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected collection to contain ${JSON.stringify(item)}`,
          actual,
          item
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toNotContain(item) {
      globalContext.totalAssertions++;
      let contains = false;
      if (typeof actual === "string") {
        contains = actual.includes(item);
      } else if (Array.isArray(actual)) {
        contains = actual.includes(item);
      }
      if (contains) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected collection NOT to contain ${JSON.stringify(item)}`,
          actual,
          `NOT ${item}`
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toMatch(pattern) {
      globalContext.totalAssertions++;
      const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (!regex.test(String(actual))) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${JSON.stringify(actual)} to match regex ${regex}`,
          actual,
          regex.toString()
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toNotMatch(pattern) {
      globalContext.totalAssertions++;
      const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
      if (regex.test(String(actual))) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${JSON.stringify(actual)} NOT to match regex ${regex}`,
          actual,
          `NOT ${regex.toString()}`
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeGreaterThan(val) {
      globalContext.totalAssertions++;
      if (actual <= val) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${actual} to be greater than ${val}`,
          actual,
          `> ${val}`
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeGreaterThanOrEqual(val) {
      globalContext.totalAssertions++;
      if (actual < val) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${actual} to be greater than or equal to ${val}`,
          actual,
          `>= ${val}`
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toBeLessThan(val) {
      globalContext.totalAssertions++;
      if (actual >= val) {
        globalContext.failedAssertions++;
        throw new AssertionFailure(
          `Expected ${actual} to be less than ${val}`,
          actual,
          `< ${val}`
        );
      }
      globalContext.passedAssertions++;
      return true;
    },

    toThrow(expectedErrorPattern = null) {
      globalContext.totalAssertions++;
      if (typeof actual !== "function") {
        globalContext.failedAssertions++;
        throw new AssertionFailure("Expected a function for toThrow assertion", actual, "Function");
      }
      let threw = false;
      let errorThrown = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        errorThrown = err;
      }
      if (!threw) {
        globalContext.failedAssertions++;
        throw new AssertionFailure("Expected function to throw an error, but it did not", null, "Error");
      }
      if (expectedErrorPattern) {
        const msg = errorThrown?.message || String(errorThrown);
        const regex = typeof expectedErrorPattern === "string"
          ? new RegExp(expectedErrorPattern)
          : expectedErrorPattern;
        if (!regex.test(msg)) {
          globalContext.failedAssertions++;
          throw new AssertionFailure(
            `Expected error message "${msg}" to match pattern ${regex}`,
            msg,
            regex.toString()
          );
        }
      }
      globalContext.passedAssertions++;
      return true;
    },
  };
}

function describe(name, fn, meta = {}) {
  const suite = globalContext.createSuite(name, meta);
  const prevSuite = globalContext.currentSuite;
  globalContext.currentSuite = suite;
  const t0 = Date.now();
  try {
    fn();
  } finally {
    suite.duration = Date.now() - t0;
    globalContext.currentSuite = prevSuite;
  }
}

async function describeAsync(name, fn, meta = {}) {
  const suite = globalContext.createSuite(name, meta);
  const prevSuite = globalContext.currentSuite;
  globalContext.currentSuite = suite;
  const t0 = Date.now();
  try {
    await fn();
  } finally {
    suite.duration = Date.now() - t0;
    globalContext.currentSuite = prevSuite;
  }
}

function test(name, fn, meta = {}) {
  const t0 = Date.now();
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      // Return promise for async tests
      return result
        .then(() => {
          globalContext.addTestResult(name, "pass", null, Date.now() - t0, meta);
        })
        .catch((err) => {
          globalContext.addTestResult(name, "fail", err, Date.now() - t0, meta);
        });
    }
    globalContext.addTestResult(name, "pass", null, Date.now() - t0, meta);
  } catch (err) {
    globalContext.addTestResult(name, "fail", err, Date.now() - t0, meta);
  }
}

const it = test;

test.skip = function (name, fn, meta = {}) {
  globalContext.addTestResult(name, "skip", null, 0, meta);
};

// Domain Helper Utilities for Blog Frontend Contracts
const helpers = {
  getFrontendRoot() {
    return path.resolve(__dirname, "../..");
  },

  getSrcPath(subpath = "") {
    return path.join(this.getFrontendRoot(), "src", subpath);
  },

  fileExists(relPath) {
    const p = path.isAbsolute(relPath) ? relPath : path.join(this.getFrontendRoot(), relPath);
    return fs.existsSync(p);
  },

  readFile(relPath) {
    const p = path.isAbsolute(relPath) ? relPath : path.join(this.getFrontendRoot(), relPath);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf-8");
  },

  /**
   * Specification-driven canonical URL resolution contract
   * Defined in PROJECT.md and ORIGINAL_REQUEST.md
   */
  resolveCanonicalUrl(post) {
    if (!post) return null;
    const identifier = post.shortId || post.id;
    if (!identifier) return null;

    if (post.category === "项目" || post.type === "project") {
      if (post.linkCard?.url && post.linkCard.url.trim().startsWith("http")) {
        return {
          type: "external",
          url: post.linkCard.url.trim(),
          internalFallback: `/projects/${identifier}`,
        };
      }
      return {
        type: "internal",
        url: `/projects/${identifier}`,
        channel: "projects",
      };
    }

    if (post.type === "article" || post.category === "文章") {
      return {
        type: "internal",
        url: `/articles/${identifier}`,
        channel: "articles",
      };
    }

    // Default to moments
    return {
      type: "internal",
      url: `/moments/${identifier}`,
      channel: "moments",
    };
  },

  /**
   * Evaluates next.config redirects
   */
  async loadNextRedirects() {
    const configPath = path.join(this.getFrontendRoot(), "next.config.ts");
    if (!fs.existsSync(configPath)) {
      return [];
    }
    try {
      const config = require(configPath).default || require(configPath);
      if (typeof config.redirects === "function") {
        return await config.redirects();
      }
    } catch (e) {
      // Fallback parser if direct import is unavailable
      const content = fs.readFileSync(configPath, "utf-8");
      const match = content.match(/redirects\s*\(\)\s*\{[\s\S]*?return\s*(\[[\s\S]*?\]);/);
      if (match) {
        try {
          // evaluate static array
          return eval(match[1]);
        } catch {}
      }
    }
    return [];
  },

  /**
   * Simulates Cross-Channel Route Guard logic
   * Checks if an item arriving on a given channel route requires redirect
   */
  evaluateRouteGuard(currentChannel, post) {
    if (!post) return { action: "notFound" };
    const resolved = this.resolveCanonicalUrl(post);
    if (!resolved || resolved.type === "external") {
      if (currentChannel === "projects") {
        return { action: "render", channel: "projects" };
      }
      return { action: "redirect", destination: resolved?.url || "/projects" };
    }

    if (resolved.channel !== currentChannel) {
      return {
        action: "redirect",
        destination: resolved.url,
        fromChannel: currentChannel,
        toChannel: resolved.channel,
      };
    }

    return {
      action: "render",
      channel: currentChannel,
      destination: resolved.url,
    };
  },

  /**
   * Search directory for forbidden ad keywords
   */
  scanForAdKeywords(dirPath) {
    const keywords = [
      "is_ad",
      "ad_avatar",
      "ad_nickname",
      "ad_on_archives",
      "adslot",
      "adcard",
      "adsbygoogle",
      "AdminAds",
    ];
    const matches = [];

    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
            walk(full);
          }
        } else if (/\.(tsx|ts|jsx|js|css|json)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf-8");
          for (const kw of keywords) {
            const regex = new RegExp(`\\b${kw}\\b`, "i");
            if (regex.test(text)) {
              matches.push({ file: full, keyword: kw });
            }
          }
        }
      }
    }

    walk(dirPath);
    return matches;
  },
};

module.exports = {
  expect,
  describe,
  describeAsync,
  test,
  it,
  helpers,
  globalContext,
  colors,
};
