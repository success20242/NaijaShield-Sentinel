const { keywordDetection } = require('../signals');
const { fetchNews } = require('../news');
const { load } = require('../utils');

function detectRisk(incidents) {
    const recent = incidents.filter(i =>
        Date.now() - new Date(i.time).getTime() < 3600000
    );

    if (recent.length >= 5) return "HIGH";
    if (recent.length >= 2) return "MEDIUM";
    return "LOW";
}

async function runSentinel() {
    console.log("🧠 Sentinel scanning...");

    // Step 1: ingest external signals
    keywordDetection();
    await fetchNews();

    // Step 2: analyze
    const incidents = load('incidents.json');
    const risk = detectRisk(incidents);

    console.log("📊 Current Risk Level:", risk);

    if (risk === "HIGH") {
        console.log("🚨 HIGH RISK ALERT TRIGGERED");
    }

    return risk;
}

module.exports = { runSentinel };
