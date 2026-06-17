const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const { load, save } = require('./utils');

// ======================================
// 🧠 LOGGER (CLEAN V3)
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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "YOUR_CHAT_ID_HERE";

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
// 🌍 NIGERIA FULL COVERAGE (NO MOCK)
// ======================================
const NIGERIA_STATES = [
    "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
    "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe","Imo",
    "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
    "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
    "Sokoto","Taraba","Yobe","Zamfara","FCT"
];

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

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// ======================================
// SOCKET EVENTS
// ======================================
io.on("connection", (socket) => {
    log.ok("Client connected: " + socket.id);

    socket.emit("welcome", {
        message: "NaijaShield Intelligence V3 Active"
    });

    socket.on("disconnect", () => {
        log.warn("Client disconnected: " + socket.id);
    });
});

// ======================================
// INCIDENT REPORTING
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
// FETCH INCIDENTS
// ======================================
app.get('/incidents', (req, res) => {
    const data = load(INCIDENT_FILE) || [];
    res.json(Array.isArray(data) ? data : []);
});

// ======================================
// FETCH REPORTS
// ======================================
app.get('/reports', (req, res) => {
    const data = load(REPORT_FILE) || [];
    res.json(Array.isArray(data) ? data : []);
});

// ======================================
// 🧠 GEO INTELLIGENCE ENGINE (REAL COVERAGE)
// ======================================
function geoIntelligence(incidents) {

    const map = {};

    // initialize all states (no fake missing coverage)
    for (const state of NIGERIA_STATES) {
        map[state] = [];
    }

    for (const i of incidents) {
        if (!i?.location) continue;

        const loc = i.location;

        if (map[loc]) {
            map[loc].push(i);
        }
    }

    return Object.entries(map).map(([state, list]) => {

        const riskScore = list.length;

        let risk = "LOW";
        if (riskScore > 20) risk = "HIGH";
        else if (riskScore > 8) risk = "MEDIUM";

        return {
            zone: state,
            risk,
            confidence: Math.min(100, riskScore * 4),
            incidentCount: list.length
        };
    });
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

    for (const i of todayData) {
        breakdown[i.type] = (breakdown[i.type] || 0) + 1;
    }

    const zones = geoIntelligence(incidents);
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

    log.ok("Report generated V3");
}

// ======================================
// CLUSTER DETECTOR (IMPROVED)
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

        const recent = list.filter(i =>
            Date.now() - new Date(i.time).getTime() < 3600000
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

    log.info("Sentinel V3 scanning...");

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
🚨 HIGH RISK ALERT (V3)

Time: ${new Date().toLocaleString()}
            `);
        }
    }

    generateReport();

}, 600000);

// ======================================
// NEWS ENGINE (REAL INTELLIGENCE SOURCES)
// ======================================
let lastNewsFetch = 0;

setInterval(async () => {

    const now = Date.now();
    if (now - lastNewsFetch < 60000) return;

    lastNewsFetch = now;

    log.info("Fetching global intelligence...");

    await fetchNews();

}, 60000);

// ======================================
// START SERVER
// ======================================
server.listen(3000, () => {
    log.ok("NaijaShield Intelligence Dashboard V3 running on port 3000");
});
