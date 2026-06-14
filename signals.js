const { load, save } = require('./utils');

const INCIDENT_FILE = 'incidents.json';

// Simulated external signals (replace later with APIs)
const keywordFeed = [
    "gunshots heard in ibadan",
    "kidnap attempt on lagos expressway",
    "armed men spotted near school in oyo"
];

function keywordDetection() {
    const incidents = load(INCIDENT_FILE);

    keywordFeed.forEach(text => {
        if (
            text.includes("kidnap") ||
            text.includes("gunshots") ||
            text.includes("armed")
        ) {
            incidents.push({
                id: Date.now() + Math.random(),
                location: "Keyword Signal",
                lat: 0,
                lng: 0,
                description: text,
                type: "keyword",
                time: new Date()
            });
        }
    });

    save(INCIDENT_FILE, incidents);
    console.log("📡 Keyword signals added");
}

module.exports = { keywordDetection };
