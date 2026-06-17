const express = require('express');
const cors = require('cors');
const axios = require('axios');

const { load, save } = require('./utils');

// ======================================
// ⚙️ ALERT MEMORY
// ======================================
const lastAlerts = {};

// ======================================
// ⚙️ COOLDOWN FUNCTION
// ======================================
function canSendAlert(key, cooldownMs = 10 * 60 * 1000) {
const now = Date.now();

```
if (!lastAlerts[key]) {
    lastAlerts[key] = now;
    return true;
}

if (now - lastAlerts[key] > cooldownMs) {
    lastAlerts[key] = now;
    return true;
}

return false;
```

}

// 🔐 TELEGRAM CONFIG
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID_HERE";

// ======================================
// 📡 TELEGRAM ALERT FUNCTION
// ======================================
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

```
    console.log("📲 Telegram alert sent");
} catch (err) {
    console.log("❌ Telegram error:", err.message);
}
```

}

// ======================================
// ✅ CORE ENGINE
// ======================================
const {
loadIncidents,
getRiskLevel,
generateZones,
calculateConfidence
} = require('./engine');

const { runSentinel } = require('./engine/sentinel');
const { fetchNews } = require('./news');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const INCIDENT_FILE = 'incidents.json';
const REPORT_FILE = 'reports.json';

// ======================================
// 📌 REPORT INCIDENT
// ======================================
app.post('/report', (req, res) => {
let incidents = load(INCIDENT_FILE) || [];

```
if (!Array.isArray(incidents)) {
    incidents = [];
}

const newIncident = {
    id: Date.now(),
    ...req.body,
    type: "user",
    time: new Date()
};

incidents.push(newIncident);
save(INCIDENT_FILE, incidents);

res.json({ message: "Incident recorded", data: newIncident });
```

});

// ======================================
// 📌 GET INCIDENTS
// ======================================
app.get('/incidents', (req, res) => {
res.json(loadIncidents());
});

// ======================================
// 📌 GET REPORTS
// ======================================
app.get('/reports', (req, res) => {
let reports = load(REPORT_FILE) || [];

```
if (!Array.isArray(reports)) {
    reports = [];
}

res.json(reports);
```

});

// ======================================
// 🧠 SAFE ZONE
// ======================================
function randomZone() {
const zones = [
{ name: "Lagos Axis", lat: 6.5244, lng: 3.3792 },
{ name: "Oyo Corridor", lat: 7.3775, lng: 3.9470 },
{ name: "Abuja Belt", lat: 9.0765, lng: 7.3986 }
];

```
const index = Math.floor(Math.random() * zones.length);
return zones[index];
```

}

// ======================================
// 🧠 INCIDENT SIMULATOR
// ======================================
function generateIncident() {
let incidents = load(INCIDENT_FILE) || [];

```
if (!Array.isArray(incidents)) {
    incidents = [];
}

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

console.log("🧠 SIM:", incident.description);
```

}

setInterval(generateIncident, 20000);

// ======================================
// 🧠 ANALYSIS
// ======================================
function analyzeSystem() {
const incidents = loadIncidents() || [];
const zones = generateZones(incidents);

```
return zones.map(zone => ({
    zone: zone.name,
    risk: getRiskLevel(zone.incidents || []),
    confidence: calculateConfidence(zone.incidents || []),
    incidentCount: (zone.incidents || []).length
}));
```

}

// ======================================
// 📊 REPORT ENGINE
// ======================================
function generateReport() {
const incidents = loadIncidents() || [];
const today = new Date().toDateString();

```
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

if (!Array.isArray(reports)) {
    reports = [];
}

const existing = reports.find(r => r.date === today);

if (existing) {
    Object.assign(existing, report);
} else {
    reports.push(report);
}

save(REPORT_FILE, reports);

console.log("📰 REPORT GENERATED");
```

}

// ======================================
// 🔥 CLUSTER DETECTOR
// ======================================
function detectThreatClusters(incidents) {

```
const clusters = {};

incidents.forEach(i => {
    const zone = i.location || "Unknown";

    if (!clusters[zone]) {
        clusters[zone] = [];
    }

    clusters[zone].push(i);
});

const results = [];

Object.keys(clusters).forEach(zone => {
    const list = clusters[zone];

    if (list.length < 5) return;

    const now = Date.now();
    const recent = list.filter(i =>
        now - new Date(i.time).getTime() < 60 * 60 * 1000
    );

    if (recent.length >= 5) {

        const score = Math.min(100, recent.length * 10);

        results.push({
            zone,
            count: recent.length,
            score,
            trend: "Rising"
        });
    }
});

return results;
```

}

// ======================================
// 🔥 CLUSTER ALERT
// ======================================
async function sendClusterAlert(cluster) {

```
const alertKey = `cluster-${cluster.zone}`;

if (!canSendAlert(alertKey, 15 * 60 * 1000)) {
    console.log("⏳ Cluster alert suppressed");
    return;
}

console.log("🔥 CLUSTER ALERT TRIGGERED");

await sendTelegramAlert(`
```

🚨 <b>REGIONAL THREAT CLUSTER DETECTED</b>

📍 <b>${cluster.zone}</b>

📊 Incidents: ${cluster.count}
📈 Trend: ${cluster.trend}

⚠️ Multiple correlated threat signals detected.

Risk Score: ${cluster.score}/100

🧠 AI recommends immediate monitoring.
`);
}

// ======================================
// 🤖 SENTINEL LOOP (UPGRADED)
// ======================================
setInterval(async () => {

```
console.log("🧠 Sentinel scanning...");

const risk = await runSentinel();

const incidents = loadIncidents() || [];

const clusters = detectThreatClusters(incidents);

for (const cluster of clusters) {
    await sendClusterAlert(cluster);
}

if (risk === "HIGH" && clusters.length === 0) {

    const alertKey = `sentinel-${risk}`;

    if (canSendAlert(alertKey)) {

        console.log("🚨 HIGH RISK (NO CLUSTER)");

        await sendTelegramAlert(`
```

🚨 <b>HIGH RISK ALERT</b>

System detected elevated threat signals.

📍 Time: ${new Date().toLocaleString()}

⚠️ No cluster formed yet, but risk is high.
`);
}
}

```
generateReport();
```

}, 600000);

// ======================================
// 📰 NEWS LOOP
// ======================================
setInterval(async () => {
console.log("📰 Fetching intelligence...");
await fetchNews();
}, 30000);

// ======================================
// 🚀 START SERVER
// ======================================
app.listen(3000, () => {
console.log("🚀 NaijaShield Sentinel running on port 3000");
});
