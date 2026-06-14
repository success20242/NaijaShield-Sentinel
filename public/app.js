
let map = L.map('map').setView([9.0820, 8.6753], 6); // Nigeria center

// ===============================
// 🧭 GEOFENCE ZONES
// ===============================
const dangerZones = [
    {
        name: "Oyo Hotspot",
        lat: 7.3775,
        lng: 3.9470,
        radius: 50000
    },
    {
        name: "Lagos Risk Corridor",
        lat: 6.5244,
        lng: 3.3792,
        radius: 70000
    }
];


// ===============================
// 🗺️ BASE MAP
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);


// ===============================
// 📍 USER LOCATION
// ===============================
let userLat = null;
let userLng = null;

navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
});


// ===============================
// 📏 DISTANCE CALCULATOR
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}


// ===============================
// 🚨 BANNER ALERT SYSTEM (NEW)
// ===============================
function showAlertBanner(message) {
    const banner = document.getElementById("alertBanner");

    if (!banner) return;

    banner.innerText = message;
    banner.style.display = "block";

    setTimeout(() => {
        banner.style.display = "none";
    }, 5000);
}


// ===============================
// 🔊 VOICE ALERT SYSTEM (NEW)
// ===============================
function speakAlert(text) {
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.volume = 1;
    msg.rate = 1;
    msg.pitch = 1;

    window.speechSynthesis.speak(msg);
}


// ===============================
// ⚠️ GEOFENCE CHECK (UPDATED)
// ===============================
function checkGeofence(userLat, userLng) {
    if (!userLat || !userLng) return;

    dangerZones.forEach(zone => {
        const distance = getDistance(userLat, userLng, zone.lat, zone.lng);

        if (distance < zone.radius) {

            const message = `Warning. You are entering a high risk area: ${zone.name}`;

            // 🚨 visual banner
            showAlertBanner(`⚠️ HIGH RISK ZONE: ${zone.name}`);

            // 🔊 voice alert
            speakAlert(message);
        }
    });
}


// ===============================
// 📌 MAP STATE
// ===============================
let markers = [];
let heatData = [];
let heatLayer;


// ===============================
// 📡 LOAD INCIDENTS
// ===============================
async function loadIncidents() {
    const res = await fetch('/incidents');
    const data = await res.json();

    markers.forEach(m => map.removeLayer(m));
    markers = [];
    heatData = [];

    const list = document.getElementById('list');
    if (list) list.innerHTML = "";

    data.forEach(i => {
        if (!i.lat || !i.lng) return;

        const marker = L.marker([i.lat, i.lng])
            .addTo(map)
            .bindPopup(`
                <b>${(i.type || "incident").toUpperCase()}</b><br/>
                ${i.description}
            `);

        markers.push(marker);

        let intensity = 0.5;

        if (i.type === "keyword") intensity = 0.8;
        else if (i.type === "news") intensity = 0.6;
        else if (i.type === "user") intensity = 1.0;

        heatData.push([i.lat, i.lng, intensity]);

        if (list) {
            const li = document.createElement('li');
            li.innerText = `${i.location} - ${i.description}`;
            list.appendChild(li);
        }
    });

    drawHeat();
}


// ===============================
// 🔥 HEAT MAP
// ===============================
function drawHeat() {
    if (heatLayer) map.removeLayer(heatLayer);

    heatLayer = L.layerGroup();

    heatData.forEach(point => {
        const [lat, lng, intensity] = point;

        L.circle([lat, lng], {
            radius: 2000 * intensity,
            color: intensity > 0.8 ? "red" : "orange",
            fillColor: intensity > 0.8 ? "red" : "orange",
            fillOpacity: 0.3
        }).addTo(heatLayer);
    });

    heatLayer.addTo(map);
}


// ===============================
// ⚠️ RISK ENGINE
// ===============================
async function loadRisk() {
    const res = await fetch('/incidents');
    const data = await res.json();

    const lastHour = data.filter(i =>
        Date.now() - new Date(i.time) < 3600000
    );

    let risk = "LOW";
    if (lastHour.length >= 5) risk = "HIGH";
    else if (lastHour.length >= 2) risk = "MEDIUM";

    const riskEl = document.getElementById("riskLevel");
    if (riskEl) {
        riskEl.innerText = "Current Risk Level: " + risk;
    }
}


// ===============================
// 📤 REPORT INCIDENT
// ===============================
async function report() {
    const location = document.getElementById('location').value;
    const description = document.getElementById('desc').value;

    await fetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location,
            description,
            lat: userLat,
            lng: userLng
        })
    });

    refresh();
}


// ===============================
// 📰 REPORTS
// ===============================
async function loadReports() {
    const res = await fetch('/reports');
    const data = await res.json();

    const reportsList = document.getElementById('reports');
    if (!reportsList) return;

    reportsList.innerHTML = data
        .map(r => `<li>${r.summary}</li>`)
        .join('');
}


// ===============================
// 🔄 REFRESH ENGINE
// ===============================
function refresh() {
    loadIncidents();
    loadRisk();
    loadReports();

    checkGeofence(userLat, userLng);
}


// ===============================
// 🚀 START SYSTEM
// ===============================
refresh();
setInterval(refresh, 10000);
