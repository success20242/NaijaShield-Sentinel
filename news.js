// news.js (UPGRADED INTELLIGENCE LAYER)

const Parser = require('rss-parser');
const axios = require('axios');
require('dotenv').config();

const { load, save } = require('./utils');
const { analyzeText, extractLocation } = require('./nlp');
const { getCoordinates } = require('./geo');
const { sendTelegramAlert } = require('./alerts');

const parser = new Parser();

const INCIDENT_FILE = 'incidents.json';

// ======================================
// 🧠 GLOBAL NEWS COOLDOWN (PREVENT 429)
// ======================================
let lastFetchTime = 0;
const NEWS_COOLDOWN = 60 * 1000; // 1 minute

function canFetchNews() {
    const now = Date.now();
    if (now - lastFetchTime < NEWS_COOLDOWN) return false;
    lastFetchTime = now;
    return true;
}

// ======================================
// 🌐 RSS SOURCES (EXPANDED)
// ======================================
const feeds = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://feeds.bbci.co.uk/news/africa/rss.xml",
    "https://news.google.com/rss/search?q=nigeria+kidnap+OR+attack+OR+security&hl=en&gl=US&ceid=US:en"
];

// ======================================
// 🧠 DUPLICATE FILTER (STRONGER)
// ======================================
function isDuplicate(incidents, title) {
    if (!Array.isArray(incidents)) return false;

    return incidents.some(i => {
        if (!i?.description) return false;

        const existing = i.description.toLowerCase();
        const incoming = title.toLowerCase();

        return (
            existing === incoming ||
            existing.includes(incoming.substring(0, 40)) ||
            incoming.includes(existing.substring(0, 40))
        );
    });
}

// ======================================
// 🧠 INCIDENT BUILDER (SAFE + FILTERED)
// ======================================
async function buildIncident(rawText, title, source) {

    try {
        const analysis = analyzeText(rawText);

        // 🚫 ignore weak signals
        if (!analysis || analysis.score < 2) return null;

        const locationName = extractLocation(rawText) || "Nigeria";

        // 🌍 GEO FALLBACK (Nigeria center if fail)
        let coords = await getCoordinates(locationName);

        if (!coords || !coords.lat) {
            coords = { lat: 9.0820, lng: 8.6753 }; // Nigeria fallback
        }

        return {
            id: Date.now() + Math.random(),
            location: locationName,
            lat: coords.lat,
            lng: coords.lng,

            description: title,
            type: "news",
            source,

            risk: analysis.risk || "LOW",
            keywords: analysis.keywords || [],
            score: analysis.score || 0,

            time: new Date()
        };

    } catch (err) {
        console.log("[NEWS BUILDER ERROR]", err.message);
        return null;
    }
}

// ======================================
// 📰 RSS ENGINE (SAFE MODE)
// ======================================
async function fetchRSS(incidents) {

    let count = 0;

    for (let url of feeds) {

        try {
            const feed = await parser.parseURL(url);

            const items = (feed.items || []).slice(0, 8);

            for (let item of items) {

                if (!item?.title) continue;

                if (isDuplicate(incidents, item.title)) continue;

                const rawText =
                    (item.title || "") + " " + (item.contentSnippet || "");

                const incident = await buildIncident(
                    rawText,
                    item.title,
                    url.includes("bbc") ? "BBC" : "Google News"
                );

                if (!incident) continue;

                incidents.push(incident);
                count++;

                console.log("[RSS]", incident.description);

                // 🚨 ONLY ESCALATE HIGH RISK
                if (incident.risk === "HIGH") {
                    await sendTelegramAlert({
                        message: "HIGH RISK NEWS DETECTED",
                        data: incident
                    });
                }
            }

        } catch (err) {
            console.log("[RSS ERROR]", err.message);
        }
    }

    return count;
}

// ======================================
// 🌍 GDELT ENGINE (RATE LIMIT SAFE)
// ======================================
async function fetchGDELT(incidents) {

    let count = 0;

    try {
        const res = await axios.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            {
                params: {
                    query: "kidnap OR attack OR gunmen OR abduction OR violence",
                    mode: "ArtList",
                    format: "json",
                    maxrecords: 15
                },
                timeout: 8000
            }
        );

        const articles = res.data?.articles || [];

        for (let article of articles) {

            if (!article?.title) continue;

            if (isDuplicate(incidents, article.title)) continue;

            const incident = await buildIncident(
                article.title,
                article.title,
                "GDELT"
            );

            if (!incident) continue;

            incidents.push(incident);
            count++;

            console.log("[GDELT]", article.title);

            if (incident.risk === "HIGH") {
                await sendTelegramAlert({
                    message: "HIGH RISK GDELT ALERT",
                    data: incident
                });
            }
        }

    } catch (err) {

        // 🔥 IMPORTANT: prevents spam logs + respects 429
        if (err.response?.status === 429) {
            console.log("[GDELT] RATE LIMITED - backing off");
        } else {
            console.log("[GDELT ERROR]", err.message);
        }
    }

    return count;
}

// ======================================
// 🧠 MASTER FUNCTION (CONTROLLED EXECUTION)
// ======================================
async function fetchNews() {

    if (!canFetchNews()) {
        console.log("[NEWS] cooldown active - skipping fetch");
        return;
    }

    let incidents = load(INCIDENT_FILE);

    if (!Array.isArray(incidents)) {
        incidents = [];
    }

    const rss = await fetchRSS(incidents);
    const gdelt = await fetchGDELT(incidents);

    save(INCIDENT_FILE, incidents);

    console.log(`[NEWS SUMMARY] RSS: ${rss}, GDELT: ${gdelt}`);
}

module.exports = { fetchNews };
