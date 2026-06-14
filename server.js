const express = require('express');
const cors = require('cors');

const { load, save } = require('./utils');
const { runSentinel } = require('./engine/sentinel');
const { fetchNews } = require('./news'); // ✅ NEWS ENGINE ADDED

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';


// ===============================
// 📌 REPORT INCIDENT (USER INPUT)
// ===============================
app.post('/report', (req, res) => {
    const incidents = load(INCIDENT_FILE);

    incidents.push({
        id: Date.now(),
        ...req.body,
        type: "user",
        time: new Date()
    });

    save(INCIDENT_FILE, incidents);

    res.json({ message: "Incident recorded" });
});


// ===============================
// 📌 GET INCIDENTS
// ===============================
app.get('/incidents', (req, res) => {
    res.json(load(INCIDENT_FILE));
});


// ===============================
// 📌 GET REPORTS
// ===============================
app.get('/reports', (req, res) => {
    res.json(load(REPORT_FILE));
});


// ===============================
// 🧠 AUTO INTELLIGENCE SIMULATOR
// ===============================
function randomZone() {
    const zones = [
        { name: "Lagos Axis", lat: 6.5244, lng: 3.3792 },
        { name: "Oyo Corridor", lat: 7.3775, lng: 3.9470 },
        { name: "Abuja Belt", lat: 9.0765, lng: 7.3986 }
    ];

    return zones[Math.floor(Math.random() * zones.length)];
}

function generateIncident() {
    const incidents = load(INCIDENT_FILE);

    const zone = randomZone();

    const types = ["keyword", "news", "user"];
    const type = types[Math.floor(Math.random() * types.length)];

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
        lat: zone.lat + (Math.random() * 0.1),
        lng: zone.lng + (Math.random() * 0.1),
        description: messages[Math.floor(Math.random() * messages.length)],
        type,
        time: new Date()
    };

    incidents.push(incident);
    save(INCIDENT_FILE, incidents);

    console.log("🧠 AI SIMULATION:", incident.description);
}

// run every 15 seconds
setInterval(generateIncident, 15000);


// ===============================
// 📌 DAILY REPORT ENGINE
// ===============================
function generateReport() {
    const incidents = load(INCIDENT_FILE);
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

    const report = {
        date: today,
        total: todayData.length,
        breakdown,
        summary: `
📰 NAJIA SHIELD DAILY REPORT

Total incidents today: ${todayData.length}

- Citizen reports: ${breakdown.user}
- News signals: ${breakdown.news}
- Keyword alerts: ${breakdown.keyword}

System Status:
Continuous monitoring active across all regions.
        `
    };

    const reports = load(REPORT_FILE);
    reports.push(report);
    save(REPORT_FILE, reports);

    console.log("📰 Daily report generated");
}


// ===============================
// 📌 SENTINEL LOOP (AI ENGINE)
// ===============================
setInterval(async () => {
    console.log("🧠 Sentinel scanning...");

    const risk = await runSentinel();

    if (risk === "HIGH") {
        console.log("🚨 HIGH RISK DETECTED");
    }

    generateReport();

}, 600000); // 10 minutes


// ===============================
// 📰 NEWS INTELLIGENCE LOOP (NEW)
// ===============================
setInterval(async () => {
    console.log("📰 Fetching intelligence news...");

    await fetchNews();

}, 20000); // 20 seconds


// ===============================
// 🚀 START SERVER
// ===============================
app.listen(3000, () => {
    console.log("🚀 NaijaShield Sentinel running on port 3000");
});
