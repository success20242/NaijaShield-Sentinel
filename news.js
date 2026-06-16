// news.js

const Parser = require('rss-parser');
const axios = require('axios');

const { load, save } = require('./utils');
const { analyzeText, extractLocation } = require('./nlp');

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
// 🧠 DUPLICATE CHECK
// ===============================
function isDuplicate(incidents, title) {
    return incidents.some(i => i.description === title);
}


// ===============================
// 📰 RSS + NLP ENGINE
// ===============================
async function fetchRSS(incidents) {

    let count = 0;

    for (let url of feeds) {
        try {
            const feed = await parser.parseURL(url);

            feed.items.slice(0, 10).forEach(item => {

                if (isDuplicate(incidents, item.title)) return;

                const rawText = item.title + " " + (item.contentSnippet || "");

                const analysis = analyzeText(rawText);
                if (analysis.score === 0) return;

                const incident = {
                    id: Date.now() + Math.random(),
                    location: extractLocation(rawText),
                    lat: 9.0820 + Math.random(),
                    lng: 8.6753 + Math.random(),
                    description: item.title,
                    type: "news",
                    source: url.includes("bbc") ? "BBC" : "Google News",

                    risk: analysis.risk,
                    keywords: analysis.keywords,
                    score: analysis.score,

                    time: new Date()
                };

                incidents.push(incident);
                count++;

                console.log("🧠 RSS SIGNAL:", incident.description);
            });

        } catch (err) {
            console.log("RSS ERROR:", err.message);
        }
    }

    return count;
}


// ===============================
// 🌍 GDELT API ENGINE (REAL DATA)
// ===============================
async function fetchGDELT(incidents) {

    let count = 0;

    try {
        const url = "https://api.gdeltproject.org/api/v2/doc/doc";

        const response = await axios.get(url, {
            params: {
                query: "kidnap OR attack OR gunmen OR abduction",
                mode: "ArtList",
                format: "json",
                maxrecords: 20
            }
        });

        const articles = response.data.articles || [];

        articles.forEach(article => {

            if (isDuplicate(incidents, article.title)) return;

            const rawText = article.title + " " + (article.seendate || "");

            const analysis = analyzeText(rawText);
            if (analysis.score === 0) return;

            const incident = {
                id: Date.now() + Math.random(),
                location: extractLocation(rawText),
                lat: 9.0820 + Math.random(),
                lng: 8.6753 + Math.random(),
                description: article.title,
                type: "news",
                source: "GDELT",

                risk: analysis.risk,
                keywords: analysis.keywords,
                score: analysis.score,

                url: article.url,

                time: new Date()
            };

            incidents.push(incident);
            count++;

            console.log("🌍 GDELT SIGNAL:", article.title);
        });

    } catch (err) {
        console.log("GDELT ERROR:", err.message);
    }

    return count;
}


// ===============================
// 🧠 MASTER FETCH FUNCTION
// ===============================
async function fetchNews() {

    const incidents = load(INCIDENT_FILE);

    const rssCount = await fetchRSS(incidents);
    const gdeltCount = await fetchGDELT(incidents);

    save(INCIDENT_FILE, incidents);

    console.log(`📰 TOTAL SIGNALS → RSS: ${rssCount}, GDELT: ${gdeltCount}`);
}

module.exports = { fetchNews };
