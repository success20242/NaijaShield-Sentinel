const Parser = require('rss-parser');
const { load, save } = require('./utils');

const parser = new Parser();
const INCIDENT_FILE = 'incidents.json';

const feeds = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://news.google.com/rss/search?q=nigeria+kidnap+attack&hl=en-US&gl=US&ceid=US:en"
];

async function fetchNews() {
    const incidents = load(INCIDENT_FILE);

    for (let url of feeds) {
        try {
            const feed = await parser.parseURL(url);

            feed.items.slice(0, 5).forEach(item => {
                const text = item.title.toLowerCase();

                if (
                    text.includes("kidnap") ||
                    text.includes("attack") ||
                    text.includes("gunmen")
                ) {
                    incidents.push({
                        id: Date.now() + Math.random(),
                        location: "News Feed",
                        lat: 0,
                        lng: 0,
                        description: item.title,
                        type: "news",
                        time: new Date()
                    });
                }
            });

        } catch (err) {
            console.log("News error:", err.message);
        }
    }

    save(INCIDENT_FILE, incidents);
    console.log("📰 News signals added");
}

module.exports = { fetchNews };
