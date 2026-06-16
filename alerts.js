// alerts.js

const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(incident) {

    const message = `
🚨 *HIGH RISK ALERT*

📍 Location: ${incident.location}
🧠 Risk: ${incident.risk}
📰 Source: ${incident.source}

📝 ${incident.description}

⚠️ Keywords: ${incident.keywords.join(", ")}
`;

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });

        console.log("📲 Telegram alert sent");

    } catch (err) {
        console.log("Telegram Error:", err.message);
    }
}

module.exports = { sendTelegramAlert };
