const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const { load, save } = require('./utils');

// ======================================
// 🧠 LOGGER
// ======================================
const log = {
    ok: (msg) => console.log(`[OK] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    error: (msg) => console.log(`[ERROR] ${msg}`),
    info: (msg) => console.log(`[INFO] ${msg}`)
};

// ======================================
// ⚙️ ALERT MEMORY
// ======================================
const lastAlerts = {};

// ======================================
// ⚙️ COOLDOWN
// ======================================
function canSendAlert(key, cooldownMs = 10 * 60 * 1000) {
    const now = Date.now();

    if (!lastAlerts[key]) {
        lastAlerts[key] = now;
        return true;
    }

    if (now - lastAlerts[key] > cooldownMs) {
        lastAlerts[key] = now;
        return true;
    }

    return false;
}

// ======================================
// 🔐 TELEGRAM
// ======================================
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID_HERE";

async function sendTelegramAlert(message) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "HTML"
            }
        );

        log.ok("Telegram alert sent");
    } catch (err) {
        log.error("Telegram error: " + err.message);
    }
}

// ======================================
// CORE IMPORTS
// ======================================
const {
    loadIncidents,
    generateZones,
    calculateConfidence
} = require('./engine');

const { runSentinel } = require('./engine/sentinel');
const { fetchNews } = require('./news');

// ======================================
// EXPRESS + SOCKET
// ======================================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

global.io = io;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// ======================================
// SOCKET CONNECTION
// ======================================
io.on("connection", (socket) => {
    log.ok("Client connected: " + socket.id);

    socket.emit("welcome", {
        message: "NaijaShield live stream active"
    });

    socket.on("disconnect", () => {
        log.warn("Client disconnected: " + socket.id);
    });
});

// ======================================
// FILES
// ======================================
const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// ======================================
// REPORT INCIDENT
// ======================================
app.post('/report', (req, res) => {

    let incidents = load(INCIDENT_FILE) || [];
    if (!Array.isArray(incidents)) incidents = [];

    const newIncident = {
        id: Date.now(),
        ...req.body,
        type: "user",
        time: new Date()
    };

    incidents.push(newIncident);
    save(INCIDENT_FILE, incidents);

    io.emit("incident", newIncident);

    res.json({ ok: true, data: newIncident });
});

// ======================================
// GET INCIDENTS
// ======================================
app.get('/incidents', (req, res) => {
    const data = load(INCIDENT_FILE) || [];
    res.json(Array.isArray(data) ? data : []);
});

// ======================================
// GET REPORTS
// ======================================
app.get('/reports', (req, res) => {
    const data = load(REPORT_FILE) || [];
    res.json(Array.isArray(data) ? data : []);
});

// ======================================
// SAFE ZONE
// ======================================
function randomZone() {
    const zones = [
        { name: "Lagos Axis", lat: 6.5244, lng: 3.3792 },
        { name: "Oyo Corridor", lat: 7.3775, lng: 3.9470 },
        { name: "Abuja Belt", lat: 9.0765, lng: 7.3986 }
    ];

    return zones[Math.floor(Math.random() * zones.length)];
}

// ======================================
// INCIDENT SIMULATOR (SLOWED + SMART)
// ======================================
function generateIncident() {

    // 🔥 optional noise reduction
    if (Math.random() > 0.5) return;

    let incidents = load(INCIDENT_FILE) || [];
    if (!Array.isArray(incidents)) incidents = [];

    const zone = randomZone();

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
        type: ["keyword", "news", "user"][Math.floor(Math.random() * 3)],
        time: new Date()
    };

    incidents.push(incident);
    save(INCIDENT_FILE, incidents);

    log.info("SIM: " + incident.description);

    io.emit("incident", incident);
}

// ⬇️ FIXED INTERVAL (was 20000)
setInterval(generateIncident, 60000);

// ======================================
// ANALYSIS
// ======================================
function analyzeSystem() {

    const incidents = load(INCIDENT_FILE) || [];
    const zones = generateZones(incidents);

    return zones.map(zone => ({
        zone: zone.name,
        risk: zone.risk || "LOW",
        confidence: calculateConfidence(zone.incidents || []),
        incidentCount: (zone.incidents || []).length
    }));
}

// ======================================
// REPORT ENGINE
// ======================================
function generateReport() {

    const incidents = load(INCIDENT_FILE) || [];
    const today = new Date().toDateString();

    const todayData = incidents.filter(i =>
        new Date(i.time).toDateString() === today
    );

    const breakdown = { user: 0, news: 0, keyword: 0 };

    todayData.forEach(i => {
        breakdown[i.type] = (breakdown[i.type] || 0) + 1;
    });

    const zones = analyzeSystem();
    const highRisk = zones.filter(z => z.risk === "HIGH");

    const report = {
        date: today,
        total: todayData.length,
        breakdown,
        zones,
        alerts: highRisk
    };

    let reports = load(REPORT_FILE) || [];
    if (!Array.isArray(reports)) reports = [];

    const existing = reports.find(r => r.date === today);

    if (existing) Object.assign(existing, report);
    else reports.push(report);

    save(REPORT_FILE, reports);

    io.emit("report", report);

    log.ok("Report generated");
}

// ======================================
// CLUSTER DETECTOR
// ======================================
function detectThreatClusters(incidents) {

    if (!Array.isArray(incidents)) return [];

    const clusters = {};

    for (const i of incidents) {
        if (!i?.location) continue;

        clusters[i.location] = clusters[i.location] || [];
        clusters[i.location].push(i);
    }

    const results = [];

    for (const zone in clusters) {

        const list = clusters[zone];
        const now = Date.now();

        const recent = list.filter(i =>
            now - new Date(i.time).getTime() < 3600000
        );

        if (recent.length >= 5) {
            results.push({
                zone,
                count: recent.length,
                score: Math.min(100, recent.length * 10),
                trend: "Rising"
            });
        }
    }

    return results;
}

// ======================================
// SENTINEL LOOP
// ======================================
setInterval(async () => {

    log.info("Sentinel scanning...");

    const result = await runSentinel();
    const risk = typeof result === "object" ? result.risk : result;

    const incidents = load(INCIDENT_FILE) || [];

    const clusters = detectThreatClusters(incidents);

    for (const cluster of clusters) {
        await sendTelegramAlert(`🚨 CLUSTER: ${cluster.zone}`);
    }

    if (risk === "HIGH" && clusters.length === 0) {

        const key = `sentinel-${risk}`;

        if (canSendAlert(key)) {
            await sendTelegramAlert(`
🚨 HIGH RISK ALERT

Time: ${new Date().toLocaleString()}
            `);
        }
    }

    generateReport();

}, 600000);

// ======================================
// NEWS LOOP (RATE LIMITED FIXED)
// ======================================
let lastNewsFetch = 0;

setInterval(async () => {

    const now = Date.now();

    if (now - lastNewsFetch < 60000) return;
    lastNewsFetch = now;

    log.info("Fetching intelligence...");
    await fetchNews();

}, 60000);

// ======================================
// START SERVER
// ======================================
server.listen(3000, () => {
    log.ok("NaijaShield LIVE STREAM running on port 3000");
});
