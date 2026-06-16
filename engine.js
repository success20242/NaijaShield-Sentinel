// engine.js

const { load } = require('./utils');

const INCIDENT_FILE = 'incidents.json';

/* ======================================
   📥 LOAD INCIDENTS
====================================== */
function loadIncidents() {
    return load(INCIDENT_FILE);
}


/* ======================================
   🌍 ZONE GENERATION (CLUSTERING)
====================================== */
function generateZones(incidents = []) {

    const zones = {};

    incidents.forEach(i => {
        const key = i.location || "Unknown";

        if (!zones[key]) {
            zones[key] = {
                name: key,
                incidents: []
            };
        }

        zones[key].incidents.push(i);
    });

    return Object.values(zones);
}


/* ======================================
   ⚠️ RISK LEVEL CALCULATION
====================================== */
function getRiskLevel(incidents) {

    if (!incidents || incidents.length === 0) return "LOW";

    let score = 0;

    incidents.forEach(i => {

        // 🔥 TYPE WEIGHT
        if (i.type === "user") score += 3;
        if (i.type === "keyword") score += 2;
        if (i.type === "news") score += 1;

        // ⏱️ TIME DECAY (recent = higher risk)
        const minutesAgo = (Date.now() - new Date(i.time)) / 60000;

        if (minutesAgo < 10) score += 3;
        else if (minutesAgo < 60) score += 2;
        else if (minutesAgo < 180) score += 1;

        // 🚨 KEYWORD SEVERITY
        const text = (i.description || "").toLowerCase();

        if (text.includes("kidnap")) score += 5;
        if (text.includes("gunmen")) score += 5;
        if (text.includes("attack")) score += 4;
        if (text.includes("shooting")) score += 4;
        if (text.includes("suspicious")) score += 2;

    });

    // 📊 FINAL CLASSIFICATION
    if (score >= 25) return "CRITICAL";
    if (score >= 15) return "HIGH";
    if (score >= 8) return "MEDIUM";

    return "LOW";
}


/* ======================================
   📊 CONFIDENCE SCORE (%)
====================================== */
function calculateConfidence(incidents) {

    if (!incidents.length) return 0;

    let signalStrength = 0;

    incidents.forEach(i => {
        if (i.type === "user") signalStrength += 3;
        if (i.type === "keyword") signalStrength += 2;
        if (i.type === "news") signalStrength += 1;
    });

    const diversityBonus = new Set(incidents.map(i => i.type)).size * 5;

    const confidence = Math.min(100,
        (signalStrength * 5) + diversityBonus
    );

    return Math.round(confidence);
}


/* ======================================
   🔮 FUTURE RISK PREDICTION (ADVANCED)
====================================== */
function predictNextIncident(incidents) {

    if (!incidents.length) return "STABLE";

    const recent = incidents.filter(i =>
        (Date.now() - new Date(i.time)) < 3600000 // last 1hr
    );

    if (recent.length > 5) return "ESCALATING";
    if (recent.length > 2) return "WARNING";

    return "STABLE";
}


/* ======================================
   📤 EXPORTS
====================================== */
module.exports = {
    loadIncidents,
    generateZones,
    getRiskLevel,
    calculateConfidence,
    predictNextIncident
};
