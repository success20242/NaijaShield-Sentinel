const express = require('express');
const cors = require('cors');

const { load, save } = require('./utils');

// ✅ CORE ENGINE (NOW ACTIVE)
const {
    loadIncidents,
    getRiskLevel,
    generateZones,
    calculateConfidence
} = require('./engine');

// ✅ SENTINEL AI
const { runSentinel } = require('./engine/sentinel');

// ✅ NEWS + KEYWORD SIGNALS
const { fetchNews } = require('./news');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';


/* ======================================
   📌 REPORT INCIDENT (USER INPUT)
====================================== */
app.post('/report', (req, res) => {
    const incidents = load(INCIDENT_FILE);

    const newIncident = {
        id: Date.now(),
        ...req.body,
        type: "user",
        time: new Date()
    };

    incidents.push(newIncident);
    save(INCIDENT_FILE, incidents);

    res.json({ message: "Incident recorded", data: newIncident });
});


/* ======================================
   📌 GET INCIDENTS
====================================== */
app.get('/incidents', (req, res) => {
    res.json(loadIncidents());
});


/* ======================================
   📌 GET REPORTS
====================================== */
app.get('/reports', (req, res) => {
    res.json(load(REPORT_FILE));
});


/* ======================================
   🧠 AI INCIDENT SIMULATOR (TEST MODE)
====================================== */
function generateIncident() {
    const incidents = load(INCIDENT_FILE);

    const zones = generateZones();
    const zone = zones[Math.floor(Math.random() * zones.length)];

    const types = ["keyword", "news", "user"];

    const messages = [
        "Suspicious movement detected",
        "Kidnap risk signal emerging",
        "Gunmen activity reported",
        "Security anomaly flagged",
        "Community distress signal detected"
    ];

    const incident = {
        id: Date.now(),
        location: zone.name,
        lat: zone.lat + (Math.random() * 0.05),
        lng: zone.lng + (Math.random() * 0.05),
        description: messages[Math.floor(Math.random() * messages.length)],
        type: types[Math.floor(Math.random() * types.length)],
        time: new Date()
    };

    incidents.push(incident);
    save(INCIDENT_FILE, incidents);

    console.log("🧠 SIM:", incident.description);
}

// simulate every 20 sec
setInterval(generateIncident, 20000);


/* ======================================
   🧠 INTELLIGENCE CORE (REAL LOGIC)
====================================== */
function analyzeSystem() {
    const incidents = loadIncidents();

    const zones = generateZones(incidents);

    const analysis = zones.map(zone => {
        const risk = getRiskLevel(zone.incidents);
        const confidence = calculateConfidence(zone.incidents);

        return {
            zone: zone.name,
            risk,
            confidence,
            incidentCount: zone.incidents.length
        };
    });

    return analysis;
}


/* ======================================
   📊 DAILY REPORT ENGINE (UPGRADED)
====================================== */
function generateReport() {
    const incidents = loadIncidents();
    const today = new Date().toDateString();

    const todayData = incidents.filter(i =>
        new Date(i.time).toDateString() === today
    );

    const breakdown = {
        user: 0,
        news: 0,
        keyword: 0
    };

    todayData.forEach(i => {
        breakdown[i.type] = (breakdown[i.type] || 0) + 1;
    });

    // ✅ AI ANALYSIS
    const zoneAnalysis = analyzeSystem();

    const highRiskZones = zoneAnalysis.filter(z => z.risk === "HIGH");

    const report = {
        date: today,
        total: todayData.length,
        breakdown,
        zones: zoneAnalysis,
        alerts: highRiskZones,
        summary: `
📰 NAIJA SHIELD INTELLIGENCE REPORT

Total Incidents: ${todayData.length}

Breakdown:
- Citizen: ${breakdown.user}
- News: ${breakdown.news}
- Keywords: ${breakdown.keyword}

High Risk Zones:
${highRiskZones.map(z => `⚠️ ${z.zone} (${z.confidence}% confidence)`).join('\n') || "None"}

System Insight:
AI fusion engine actively correlating human, media, and behavioral signals.
        `
    };

    const reports = load(REPORT_FILE);
    reports.push(report);
    save(REPORT_FILE, reports);

    console.log("📰 REPORT GENERATED");
}


/* ======================================
   🤖 SENTINEL LOOP (AI DECISION ENGINE)
====================================== */
setInterval(async () => {
    console.log("🧠 Sentinel scanning...");

    const risk = await runSentinel();

    if (risk === "HIGH") {
        console.log("🚨 HIGH RISK DETECTED");
    }

    generateReport();

}, 600000); // every 10 mins


/* ======================================
   📰 NEWS INTELLIGENCE LOOP
====================================== */
setInterval(async () => {
    console.log("📰 Fetching intelligence...");

    await fetchNews();

}, 30000); // 30 sec


/* ======================================
   🚀 START SERVER
====================================== */
app.listen(3000, () => {
    console.log("🚀 NaijaShield Sentinel running on port 3000");
});
