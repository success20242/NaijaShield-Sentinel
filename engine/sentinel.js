const { keywordDetection } = require('../signals');
const { load } = require('../utils');

// ======================================
// 🧠 SMART RISK DETECTION
// ======================================
function detectRisk(incidents) {

```
if (!Array.isArray(incidents)) {
    return "LOW";
}

const now = Date.now();

// only last 1 hour
const recent = incidents.filter(i => {
    if (!i || !i.time) return false;
    return now - new Date(i.time).getTime() < 60 * 60 * 1000;
});

let score = 0;

// 🔥 weighted scoring
recent.forEach(i => {
    if (i.type === "user") score += 3;
    else if (i.type === "news") score += 2;
    else if (i.type === "keyword") score += 1;
    else score += 1;
});

// 🎯 smarter thresholds
if (score >= 15) return "HIGH";
if (score >= 6) return "MEDIUM";
return "LOW";
```

}

// ======================================
// 🤖 SENTINEL CORE
// ======================================
async function runSentinel() {

```
try {

    console.log("🧠 Sentinel scanning...");

    // Step 1: keyword signals
    await keywordDetection();

    // Step 2: load incidents safely
    let incidents = load('incidents.json');

    if (!Array.isArray(incidents)) {
        incidents = [];
    }

    // Step 3: detect risk
    const risk = detectRisk(incidents);

    console.log("📊 Current Risk Level:", risk);

    // Optional debug insight
    const recentCount = incidents.filter(i =>
        Date.now() - new Date(i.time).getTime() < 3600000
    ).length;

    console.log(`📍 Recent incidents (1hr): ${recentCount}`);

    if (risk === "HIGH") {
        console.log("🚨 HIGH RISK SIGNAL CONFIRMED");
    }

    return risk;

} catch (err) {

    console.log("❌ Sentinel error:", err.message);

    return "LOW"; // fail-safe
}
```

}

module.exports = { runSentinel };
