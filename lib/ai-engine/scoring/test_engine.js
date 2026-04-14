const { calculateRisk } = require("./engine");

const testCases = [
  {
    name: "Low Risk Case",
    input: { symptom: "fatigue", severity: "mild", duration: "< 1 day", history: "none" },
    expectedUrgency: "Low"
  },
  {
    name: "Medium Risk Case",
    input: { symptom: "fever", severity: "moderate", duration: "1-3 days", history: "none" },
    expectedUrgency: "Medium"
  },
  {
    name: "High Risk (Score based)",
    input: { symptom: "fever", severity: "severe", duration: "> 3 days", history: "heart_disease" },
    expectedUrgency: "High"
  },
  {
    name: "Red Flag Override",
    input: { symptom: "fever", severity: "mild", duration: "< 1 day", additional: "chest pain" },
    expectedUrgency: "High"
  }
];

console.log("=== SymptoSense Risk Engine Test ===\n");

testCases.forEach(tc => {
  const result = calculateRisk(tc.input);
  const success = result.urgency === tc.expectedUrgency;
  
  console.log(`[${success ? "PASS" : "FAIL"}] ${tc.name}`);
  console.log(`- Input: ${JSON.stringify(tc.input)}`);
  console.log(`- Score: ${result.score}`);
  console.log(`- Urgency: ${result.urgency}`);
  if (result.isRedFlag) console.log(`- RED FLAG DETECTED`);
  console.log(`- Explanation:\n  * ${result.explanation.join("\n  * ")}`);
  console.log(`- Recommendation: ${result.recommendation.substring(0, 50)}...`);
  console.log("------------------------------------\n");
});
