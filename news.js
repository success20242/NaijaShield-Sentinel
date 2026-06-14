const Parser = require('rss-parser');
const { load, save } = require('./utils');

const parser = new Parser();

const INCIDENT_FILE = 'incidents.json';

// ===============================
// 🌐 RSS FEEDS (FREE SOURCES)
// ===============================
const feeds = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://news.google.com/rss/search?q=nigeria+kidnap+attack&hl=en-US&gl=US&ceid=US:en"
];


// ===============================
// 🧠 KEYWORD INTELLIGENCE ENGINE
// ===============================
function isRisky(text) {
    const keywords = [
        "kidnap",
        "kidnapped",
        "kidnapping",
        "attack",
        "gunmen",
        "abduct",
        "abduction",
        "terror",
        "terrorist",
        "bandits",
        "violence",
        "shooting",
        "school attack"
    ];

    return keywords.some(k => text.includes(k));
}


// ===============================
// 📰 FETCH NEWS SIGNALS
// ===============================
async function fetchNews() {
    const incidents = load(INCIDENT_FILE);

    let newSignals = 0;

    for (let url of feeds) {
        try {
            const feed = await parser.parseURL(url);

            feed.items.slice(0, 8).forEach(item => {
                const text = (
                    item.title + " " + (item.contentSnippet || item.content || "")
                ).toLowerCase();

                if (isRisky(text)) {
                    incidents.push({
                        id: Date.now() + Math.random(),
                        location: "News Intelligence",
                        lat: 9.0820,
                        lng: 8.6753, // center Nigeria fallback
                        description: item.title,
                        type: "news",
                        source: url.includes("bbc") ? "BBC" : "Google News",
                        time: new Date()
                    });

                    newSignals++;
                    console.log("📰 NEWS SIGNAL:", item.title);
                }
            });

        } catch (err) {
            console.log("RSS ERROR:", err.message);
        }
    }

    save(INCIDENT_FILE, incidents);

    console.log(`📰 News signals added: ${newSignals}`);
}

module.exports = { fetchNews };
