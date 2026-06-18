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

global.io = io;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// 🧠 CACHE
let latestIntel = [];

// ======================================
// SOCKET
// ======================================
io.on("connection", (socket) => {
console.log("[OK] Client connected:", socket.id);

```
socket.emit("welcome", { message: "NaijaShield Live" });

// SEND LAST DATA
if (latestIntel.length > 0) {
    socket.emit("intel_update", {
        alerts: latestIntel,
        timestamp: new Date()
    });
}

socket.on("disconnect", () => {
    console.log("[WARN] Client disconnected:", socket.id);
});
```

});

// ======================================
// REPORT INCIDENT
// ======================================
app.post('/report', (req, res) => {

```
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
```

});

// ======================================
// REPORT ENGINE
// ======================================
function generateReport() {

```
const incidents = load(INCIDENT_FILE) || [];
const today = new Date().toDateString();

const todayData = incidents.filter(i =>
    new Date(i.time).toDateString() === today
);

const report = {
    date: today,
    total: todayData.length
};

let reports = load(REPORT_FILE) || [];
reports.push(report);

save(REPORT_FILE, reports);

io.emit("report", report);
```

}

// ======================================
// NEWS ENGINE (FIXED)
// ======================================
let lastFetch = 0;

setInterval(async () => {

```
if (Date.now() - lastFetch < 60000) return;
lastFetch = Date.now();

console.log("[INFO] Fetching intelligence...");

try {
    const news = await fetchNews();

    const enriched = news.map(n => ({
        title: n.title || "No title",
        location: n.location || "Nigeria",
        threatScore: n.threatScore || Math.floor(Math.random()*100),
        lat: n.lat,
        lng: n.lng
    }));

    latestIntel = enriched;

    io.emit("intel_update", {
        alerts: enriched,
        timestamp: new Date()
    });

    console.log("[EMIT] Sent:", enriched.length);

} catch (err) {
    console.log("[ERROR]", err.message);
}
```

}, 60000);

// ======================================
// SENTINEL LOOP
// ======================================
setInterval(async () => {

```
const result = await runSentinel();

io.emit("risk", { risk: result.risk || result });

generateReport();
```

}, 300000);

// ======================================
server.listen(3000, () => {
console.log("[OK] Server running on 3000");
});
