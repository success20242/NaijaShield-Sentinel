const fs = require('fs');

const INCIDENT_FILE = 'incidents.json';

// ---------- Load ----------
function loadIncidents() {
    if (!fs.existsSync(INCIDENT_FILE)) return [];
    return JSON.parse(fs.readFileSync(INCIDENT_FILE));
}

// ---------- 1. MULTI-SIGNAL RISK SCORING ----------
function calculateRiskScore(incidents) {
    let score = 0;

    incidents.forEach(i => {
        if (i.type === "report") score += 3;
        else if (i.type === "keyword") score += 2;
        else if (i.type === "news") score += 1;
        else score += 1;
    });

    return score;
}

// ---------- 2. TIME-BASED RISK ----------
function getTimeFactor() {
    const hour = new Date().getHours();

    if (hour >= 20 || hour <= 5) return 3; // night risk
    if (hour >= 6 && hour <= 9) return 2;  // morning commute
    return 1;
}

// ---------- 3. FINAL RISK LEVEL ----------
function getRiskLevel(incidents) {
    const baseScore = calculateRiskScore(incidents);
    const timeFactor = getTimeFactor();

    const finalScore = baseScore * timeFactor;

    if (finalScore >= 20) return "HIGH";
    if (finalScore >= 10) return "MEDIUM";
    return "LOW";
}

// ---------- 4. DYNAMIC GEOFENCE ----------
function generateZones(incidents) {
    const zones = {};

    incidents.forEach(i => {
        const key = i.location || "Unknown";

        if (!zones[key]) {
            zones[key] = {
                location: key,
                lat: i.lat || 0,
                lng: i.lng || 0,
                count: 0
            };
        }

        zones[key].count++;
    });

    return Object.values(zones).map(z => ({
        ...z,
        radius: 0.01 + (z.count * 0.005), // expands with incidents
        risk: z.count > 5 ? "HIGH" : z.count > 2 ? "MEDIUM" : "LOW"
    }));
}

// ---------- 5. CONFIDENCE SCORE ----------
function calculateConfidence(incidents) {
    let types = new Set(incidents.map(i => i.type));
    return types.size / 3; // normalized
}

module.exports = {
    loadIncidents,
    getRiskLevel,
    generateZones,
    calculateConfidence
};
