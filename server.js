const express = require('express');
const cors = require('cors');

const { load, save } = require('./utils');
const { keywordDetection } = require('./signals');
const { fetchNews } = require('./news');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// ---------- REPORT INCIDENT ----------
app.post('/report', (req, res) => {
    const { location, lat, lng, description } = req.body;

    const incidents = load(INCIDENT_FILE);

    incidents.push({
        id: Date.now(),
        location,
        lat,
        lng,
        description,
        type: "user",
        time: new Date()
    });

    save(INCIDENT_FILE, incidents);

    res.json({ message: "Reported successfully" });
});

// ---------- GET INCIDENTS ----------
app.get('/incidents', (req, res) => {
    res.json(load(INCIDENT_FILE));
});

// ---------- RISK ENGINE ----------
function detectRisk(incidents) {
    const recent = incidents.filter(i =>
        Date.now() - new Date(i.time) < 3600000
    );

    if (recent.length >= 5) return "HIGH";
    if (recent.length >= 2) return "MEDIUM";
    return "LOW";
}

// ---------- DAILY REPORT ----------
function generateReport() {
    const incidents = load(INCIDENT_FILE);
    const today = new Date().toDateString();

    const todays = incidents.filter(i =>
        new Date(i.time).toDateString() === today
    );

    if (todays.length === 0) return;

    const counts = { user: 0, news: 0, keyword: 0 };

    todays.forEach(i => {
        counts[i.type] = (counts[i.type] || 0) + 1;
    });

    const report = {
        date: today,
        total: todays.length,
        breakdown: counts,
        summary: `
📰 DAILY SECURITY REPORT

Total incidents: ${todays.length}

- Citizen reports: ${counts.user || 0}
- News signals: ${counts.news || 0}
- Keyword alerts: ${counts.keyword || 0}

Situation:
Security activity detected across multiple areas.

Advice:
Avoid isolated routes and remain alert.
        `
    };

    const reports = load(REPORT_FILE);
    reports.push(report);
    save(REPORT_FILE, reports);

    console.log("📰 Report generated");
}

// ---------- SENTINEL LOOP ----------
setInterval(async () => {
    console.log("🧠 Sentinel scanning...");

    keywordDetection();
    await fetchNews();

    const incidents = load(INCIDENT_FILE);
    const risk = detectRisk(incidents);

    if (risk === "HIGH") {
        console.log("🚨 HIGH RISK DETECTED");
    }

    generateReport();

}, 600000); // every 10 minutes

// ---------- GET REPORTS ----------
app.get('/reports', (req, res) => {
    res.json(load(REPORT_FILE));
});

app.listen(3000, () => console.log("🚀 Running on port 3000"));
