// news.js

const Parser = require('rss-parser');
const axios = require('axios');
require('dotenv').config();

const { load, save } = require('./utils');
const { analyzeText, extractLocation } = require('./nlp');
const { getCoordinates } = require('./geo');
const { sendTelegramAlert } = require('./alerts');

const parser = new Parser();

const INCIDENT_FILE = 'incidents.json';

// ===============================
// 🌐 RSS SOURCES
// ===============================
const feeds = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://news.google.com/rss/search?q=nigeria+kidnap+attack&hl=en-US&gl=US&ceid=US:en"
];


// ===============================
// 🧠 ADVANCED DUPLICATE FILTER
// ===============================
function isDuplicate(incidents, title) {
    return incidents.some(i =>
        i.description === title ||
        i.description.includes(title.substring(0, 30))
    );
}


// ===============================
// 🧠 BUILD INCIDENT OBJECT
// ===============================
async function buildIncident(rawText, title, source) {

    const analysis = analyzeText(rawText);
    if (analysis.score === 0) return null;

    const locationName = extractLocation(rawText);

    // 🌍 REAL GEO
    const coords = await getCoordinates(locationName);

    return {
        id: Date.now() + Math.random(),
        location: locationName,
        lat: coords?.lat || 9.0820,
        lng: coords?.lng || 8.6753,

        description: title,
        type: "news",
        source,

        risk: analysis.risk,
        keywords: analysis.keywords,
        score: analysis.score,

        time: new Date()
    };
}


// ===============================
// 📰 RSS ENGINE
// ===============================
async function fetchRSS(incidents) {

    let count = 0;

    for (let url of feeds) {
        try {
            const feed = await parser.parseURL(url);

            for (let item of feed.items.slice(0, 10)) {

                if (isDuplicate(incidents, item.title)) continue;

                const rawText = item.title + " " + (item.contentSnippet || "");

                const incident = await buildIncident(
                    rawText,
                    item.title,
                    url.includes("bbc") ? "BBC" : "Google News"
                );

                if (!incident) continue;

                incidents.push(incident);
                count++;

                console.log("🧠 RSS:", incident.description);

                // 🚨 ESCALATION TRIGGER
                if (incident.risk === "HIGH") {
                    await sendTelegramAlert(incident);
                }
            }

        } catch (err) {
            console.log("RSS ERROR:", err.message);
        }
    }

    return count;
}


// ===============================
// 🌍 GDELT ENGINE
// ===============================
async function fetchGDELT(incidents) {

    let count = 0;

    try {
        const res = await axios.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            {
                params: {
                    query: "kidnap OR attack OR gunmen OR abduction",
                    mode: "ArtList",
                    format: "json",
                    maxrecords: 20
                }
            }
        );

        for (let article of res.data.articles || []) {

            if (isDuplicate(incidents, article.title)) continue;

            const rawText = article.title;

            const incident = await buildIncident(
                rawText,
                article.title,
                "GDELT"
            );

            if (!incident) continue;

            incidents.push(incident);
            count++;

            console.log("🌍 GDELT:", article.title);

            // 🚨 ESCALATION
            if (incident.risk === "HIGH") {
                await sendTelegramAlert(incident);
            }
        }

    } catch (err) {
        console.log("GDELT ERROR:", err.message);
    }

    return count;
}


// ===============================
// 🧠 MASTER FUNCTION
// ===============================
async function fetchNews() {

    const incidents = load(INCIDENT_FILE);

    const rss = await fetchRSS(incidents);
    const gdelt = await fetchGDELT(incidents);

    save(INCIDENT_FILE, incidents);

    console.log(`📰 TOTAL → RSS: ${rss}, GDELT: ${gdelt}`);
}

module.exports = { fetchNews };
