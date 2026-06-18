// news.js (V4 - STABLE INTELLIGENCE ENGINE)

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
// 🧠 GLOBAL NEWS COOLDOWN
// ======================================
let lastFetchTime = 0;
const NEWS_COOLDOWN = 60 * 1000;

function canFetchNews() {
    const now = Date.now();
    if (now - lastFetchTime < NEWS_COOLDOWN) return false;
    lastFetchTime = now;
    return true;
}

// ======================================
// 🌐 CLEAN RSS SOURCES (STABLE ONLY)
// ======================================
const feeds = [
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://news.google.com/rss/search?q=nigeria+security+OR+kidnap&hl=en&gl=NG&ceid=NG:en",
    "https://punchng.com/feed/",
    "https://www.vanguardngr.com/feed/"
];

// ======================================
// 🛡 SAFE TEXT BUILDER (FIX CRASH)
// ======================================
function safeText(item) {
    return [
        item.title || "",
        item.contentSnippet || "",
        item.content || ""
    ].join(" ");
}

// ======================================
// 🇳🇬 NIGERIA FILTER (HARD FILTER)
// ======================================
function isNigeriaRelated(text) {
    const t = text.toLowerCase();

    return (
        t.includes("nigeria") ||
        t.includes("abuja") ||
        t.includes("lagos") ||
        t.includes("kaduna") ||
        t.includes("kano") ||
        t.includes("borno") ||
        t.includes("yobe") ||
        t.includes("plateau") ||
        t.includes("zamfara")
    );
}

// ======================================
// 🧠 DUPLICATE FILTER
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
// 🧠 INCIDENT BUILDER
// ======================================
async function buildIncident(rawText, title, source) {

    try {
        const analysis = analyzeText(rawText);

        if (!analysis || analysis.score < 2) return null;

        const locationName = extractLocation(rawText) || "Nigeria";

        let coords = await getCoordinates(locationName);

        if (!coords || !coords.lat) {
            coords = { lat: 9.0820, lng: 8.6753 };
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
// 📰 RSS ENGINE (FIXED)
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

                const rawText = safeText(item);

                // 🇳🇬 HARD FILTER
                if (!isNigeriaRelated(rawText)) continue;

                const source =
                    url.includes("bbc") ? "BBC" :
                    url.includes("punch") ? "Punch" :
                    url.includes("vanguard") ? "Vanguard" :
                    "Google News";

                const incident = await buildIncident(
                    rawText,
                    item.title,
                    source
                );

                if (!incident) continue;

                incidents.push(incident);
                count++;

                console.log("[RSS]", incident.description);

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
// 🌍 GDELT ENGINE (FIXED)
// ======================================
async function fetchGDELT(incidents) {

    let count = 0;

    try {
        const res = await axios.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            {
                params: {
                    query: "nigeria kidnap OR nigeria attack OR nigeria gunmen",
                    mode: "ArtList",
                    format: "json",
                    maxrecords: 8
                },
                timeout: 15000
            }
        );

        const articles = res.data?.articles || [];

        if (!articles.length) return 0;

        for (let article of articles) {

            if (!article?.title) continue;

            if (isDuplicate(incidents, article.title)) continue;

            if (!isNigeriaRelated(article.title)) continue;

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

        if (err.response?.status === 429) {
            console.log("[GDELT] RATE LIMITED");
        } else {
            console.log("[GDELT ERROR]", err.message);
        }
    }

    return count;
}

// ======================================
// 🧠 MASTER
// ======================================
async function fetchNews() {

    if (!canFetchNews()) {
        console.log("[NEWS] cooldown active");
        return;
    }

    let incidents = load(INCIDENT_FILE);
    if (!Array.isArray(incidents)) incidents = [];

    const rss = await fetchRSS(incidents);
    const gdelt = await fetchGDELT(incidents);

    save(INCIDENT_FILE, incidents);

    console.log(`[NEWS SUMMARY] RSS: ${rss}, GDELT: ${gdelt}`);
}

module.exports = { fetchNews };
