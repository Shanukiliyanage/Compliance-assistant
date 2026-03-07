import { generateRecommendations } from "../utils/recommendations.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`TEST FAILED: ${message}`);
    process.exitCode = 1;
  }
}

const testAnswers = {
  stage1: {
    // stage 1 - should generate per-question recommendations
    "4.1": "no",
    "4.2": "partial",
    "4.3": "no",
    "6.1": "no",
    "6.2": "partial",
    "7.3": "no",

    // stage 1 legacy: clause+suffix IDs should map to the right templates
    "6.1.Q1": "no",
    "6.1.Q2": "no",
    "8.1.Q1": "no",
    "8.1.Q2": "partial",
  },
  stage2: {
    // supplier gateway alone should not produce a recommendation
    "A5.19.GW1": "no",

    // supplier answers should be suppressed if the gateway isn't yes
    "A5.19.Q1": "no",
    "A5.20.Q1": "no",

    // cloud gateway should be ignored; Q2 only applies if Q1 is yes
    "A5.23.Q1": "no",

    // Q2 should be suppressed if Q1=no
    "A5.23.Q2": "no",

    // incident follow-ups should be suppressed unless A5.24.Q1 is yes
    "A5.24.Q1": "no",
    "A5.25.Q1": "no",
    "A5.26.Q1": "no",

    // multi-question controls should still produce a recommendation
    "A5.14.Q1": "partial",
    "A5.14.Q2": "no"
  },
  stage3: {
    // dotted Annex ID format should normalize properly
    "A.6.1-Q1": "yes"
  },
  stage5: {
    // underscore question suffix should normalize properly
    "A8.2_Q1": "no"
  }
};

const results = generateRecommendations(testAnswers);

// run assertions
const ids = results.map((r) => r.controlId);

assert(ids.includes("4.1"), "Expected recommendation for 4.1 (Stage 1 question)");
assert(ids.includes("4.2"), "Expected recommendation for 4.2 (Stage 1 question)");
assert(ids.includes("4.3"), "Expected recommendation for 4.3 (Stage 1 question)");
assert(ids.includes("6.1"), "Expected recommendation for 6.1 (Stage 1 question)");
assert(ids.includes("6.2"), "Expected recommendation for 6.2 (Stage 1 question)");
assert(ids.includes("7.3"), "Expected recommendation for 7.3 (Stage 1 question)");

assert(ids.includes("6.1.Q1"), "Expected recommendation for 6.1.Q1 (Stage 1 question)");
assert(ids.includes("6.1.Q2"), "Expected recommendation for 6.1.Q2 (Stage 1 question)");
assert(ids.includes("8.1.Q1"), "Expected recommendation for 8.1.Q1 (Stage 1 question)");
assert(ids.includes("8.1.Q2"), "Expected recommendation for 8.1.Q2 (Stage 1 question)");
assert(ids.includes("A.5.14"), "Expected recommendation for A.5.14");
assert(ids.includes("A.8.2"), "Expected recommendation for A.8.2");

assert(!ids.includes("A.5.19"), "Did not expect A.5.19 when supplier gateway is no");
assert(!ids.includes("A.5.20"), "Did not expect A.5.20 when supplier gateway is no");
assert(!ids.includes("A.5.23"), "Did not expect A.5.23 when cloud Q1 is no and Q2 suppressed");
assert(!ids.includes("A.5.25"), "Did not expect A.5.25 when incident intro is no");
assert(!ids.includes("A.5.26"), "Did not expect A.5.26 when incident intro is no");

console.log(JSON.stringify(results, null, 2));

if (process.exitCode) process.exit(process.exitCode);
