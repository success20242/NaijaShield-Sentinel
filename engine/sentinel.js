const { keywordDetection } = require('../signals');
const { load } = require('../utils');

// ======================================
// 🧠 SENTINEL BRAIN v2 (ADVANCED RISK ENGINE)
// ======================================

function safeTime(t) {
    const time = new Date(t).getTime();
    return isNaN(time) ? null : time;
}

// ======================================
// 🧠 FEATURE 1: TIME-BASED FILTERS
// ======================================
function getTimeWindows(incidents) {

    const now = Date.now();

    const last1h = [];
    const last6h = [];
    const last24h = [];

    for (const i of incidents) {

        if (!i || !i.time) continue;

        const t = safeTime(i.time);
        if (!t) continue;

        const diff = now - t;

        if (diff <= 1 * 60 * 60 * 1000) last1h.push(i);
        if (diff <= 6 * 60 * 60 * 1000) last6h.push(i);
        if (diff <= 24 * 60 * 60 * 1000) last24h.push(i);
    }

    return { last1h, last6h, last24h };
}

// ======================================
// 🧠 FEATURE 2: INTELLIGENCE SCORING
// ======================================
function computeScore(incidents) {

    let score = 0;

    for (const i of incidents) {

        if (i.type === "user") score += 3;
        else if (i.type === "news") score += 2;
        else if (i.type === "keyword") score += 1;
        else score += 1;

        // location repetition bonus (hotspot indicator)
        if (i.location) score += 0.5;
    }

    return score;
}

// ======================================
// 🧠 FEATURE 3: TREND ANALYSIS
// ======================================
function detectTrend(windows) {

    const a = windows.last1h.length;
    const b = windows.last6h.length;
    const c = windows.last24h.length;

    if (a > b / 6) return "SURGING";
    if (a > 5) return "RISING";
    if (a < 2 && b > 10) return "COOLING";
    return "STABLE";
}

// ======================================
// 🧠 FEATURE 4: GEO HOTSPOT STRENGTH
// ======================================
function detectHotspots(incidents) {

    const map = {};

    for (const i of incidents) {
        if (!i.location) continue;

        map[i.location] = (map[i.location] || 0) + 1;
    }

    const hotspots = Object.entries(map)
        .filter(([_, count]) => count >= 3)
        .map(([zone, count]) => ({
            zone,
            count,
            strength: Math.min(100, count * 20)
        }));

    return hotspots;
}

// ======================================
// 🧠 FEATURE 5: FINAL RISK ENGINE
// ======================================
function computeRisk(score, trend, hotspots) {

    let risk = "LOW";

    if (score >= 25 || hotspots.length >= 2) {
        risk = "HIGH";
    } else if (score >= 10 || trend === "RISING") {
        risk = "MEDIUM";
    }

    return risk;
}

// ======================================
// 🤖 MAIN SENTINEL BRAIN
// ======================================
async function runSentinel() {

    try {

        console.log("🧠 Sentinel Brain v2 scanning...");

        await keywordDetection();

        let incidents = load('incidents.json');

        if (!Array.isArray(incidents)) {
            incidents = [];
        }

        const windows = getTimeWindows(incidents);

        const score = computeScore(windows.last1h);

        const trend = detectTrend(windows);

        const hotspots = detectHotspots(windows.last24h);

        const risk = computeRisk(score, trend, hotspots);

        const confidence = Math.min(
            100,
            Math.floor((score + hotspots.length * 10) + (trend === "SURGING" ? 20 : 0))
        );

        // ===============================
        // 📊 LOG INTELLIGENCE
        // ===============================
        console.log("📊 Risk:", risk);
        console.log("📈 Trend:", trend);
        console.log("🔥 Score:", score);
        console.log("📍 Hotspots:", hotspots.length);
        console.log("🧠 Confidence:", confidence + "%");

        return {
            risk,
            trend,
            score,
            hotspots,
            confidence
        };

    } catch (err) {

        console.log("❌ Sentinel Brain error:", err.message);

        return {
            risk: "LOW",
            trend: "STABLE",
            score: 0,
            hotspots: [],
            confidence: 0
        };
    }
}

module.exports = { runSentinel };
