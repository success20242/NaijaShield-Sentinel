const Parser = require('rss-parser');
const { load, save } = require('./utils');

const parser = new Parser();
const INCIDENT_FILE = 'incidents.json';

// ===============================
// 🌐 RSS FEEDS (FREE SOURCES)
// ===============================
const feeds = [
    // BBC global news
    "https://feeds.bbci.co.uk/news/world/rss.xml",

    // Google News focused on Nigeria security
    "https://news.google.com/rss/search?q=nigeria+kidnap+attack&hl=en-US&gl=US&ceid=US:en"
];


// ===============================
// 🧠 KEYWORD DETECTION RULES
// ===============================
const KEYWORDS = [
    "kidnap",
    "kidnapped",
    "attack",
    "gunmen",
    "abduct",
    "terror",
    "bandits",
    "school attack"
];


// ===============================
// 📡 NEWS INGESTION ENGINE
// ===============================
async function fetchNews() {
    const incidents = load(INCIDENT_FILE);

    let newSignals = 0;

    for (let url of feeds) {
        try {
            const feed = await parser.parseURL(url);

            feed.items.slice(0, 5).forEach(item => {
                const text = item.title.toLowerCase();

                const isThreat = KEYWORDS.some(keyword =>
                    text.includes(keyword)
                );

                if (isThreat) {
                    incidents.push({
                        id: Date.now() + Math.random(),
                        location: "News Feed",
                        lat: 0,
                        lng: 0,
                        description: item.title,
                        type: "news",
                        source: url.includes("bbc") ? "BBC" : "Google News",
                        time: new Date()
                    });

                    newSignals++;
                }
            });

        } catch (err) {
            console.log("🛑 RSS Error:", err.message);
        }
    }

    save(INCIDENT_FILE, incidents);

    console.log(`📰 News signals added: ${newSignals}`);
}

module.exports = { fetchNews };
