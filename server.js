const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const { load, save } = require('./utils');
const { runSentinel } = require('./engine/sentinel');
const { fetchNews } = require('./news');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// ✅ GLOBAL CACHE
let latestIntel = [];
let lastNewsFetch = 0;

// SOCKET
io.on("connection", (socket) => {
    console.log("[OK] Client:", socket.id);

    if (latestIntel.length > 0) {
        socket.emit("intel_update", {
            alerts: latestIntel,
            timestamp: new Date()
        });
    }
});

// REPORT INCIDENT
app.post('/report', (req, res) => {
    let incidents = load(INCIDENT_FILE) || [];

    const newIncident = {
        id: Date.now(),
        ...req.body,
        time: new Date()
    };

    incidents.push(newIncident);
    save(INCIDENT_FILE, incidents);

    io.emit("incident", newIncident);

    res.json({ ok: true });
});

// REPORTS
app.get('/reports', (req, res) => {
    res.json(load(REPORT_FILE) || []);
});

// ======================================
// 🚀 LIVE NEWS ENGINE (FIXED)
// ======================================
setInterval(async () => {

    const now = Date.now();
    if (now - lastNewsFetch < 60000) return;

    lastNewsFetch = now;

    console.log("[INFO] Fetching intelligence...");

    try {
        const news = await fetchNews();

        if (!Array.isArray(news)) return;

        const enriched = news.map(n => ({
            title: n.title || "No title",
            location: n.location || "Nigeria",
            threatScore: n.threatScore || Math.floor(Math.random() * 100),
            categories: (n.categories || []).join(", ")
        }));

        latestIntel = enriched;

        // ✅ MAIN FIX
        io.emit("intel_update", {
            alerts: enriched,
            timestamp: new Date()
        });

        console.log("[EMIT]", enriched.length);

    } catch (err) {
        console.log("[ERROR]", err.message);
    }

}, 60000);

// START
server.listen(3000, () => {
    console.log("🚀 NaijaShield LIVE on http://localhost:3000");
});
