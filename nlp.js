// nlp.js (V4 - Nigeria-aware NLP)

// ======================================
// 🚨 KEYWORDS
// ======================================
const threatDictionary = {
    HIGH: ["kidnap", "abduct", "gunmen", "shooting", "attack"],
    MEDIUM: ["robbery", "suspicious", "threat", "violence"],
    LOW: ["noise", "argument", "crowd"]
};

// ======================================
// 🇳🇬 ALL 36 STATES + FCT
// ======================================
const NIGERIA_STATES = [
    "abia","adamawa","akwa ibom","anambra","bauchi","bayelsa","benue","borno",
    "cross river","delta","ebonyi","edo","ekiti","enugu","gombe","imo",
    "jigawa","kaduna","kano","katsina","kebbi","kogi","kwara","lagos",
    "nasarawa","niger","ogun","ondo","osun","oyo","plateau","rivers",
    "sokoto","taraba","yobe","zamfara","abuja","fct"
];

// ======================================
// 🧠 ANALYZE TEXT
// ======================================
function analyzeText(text = "") {

    text = text.toLowerCase();

    let detected = [];
    let score = 0;

    for (const [level, words] of Object.entries(threatDictionary)) {
        for (const word of words) {
            if (text.includes(word)) {
                detected.push(word);

                if (level === "HIGH") score += 5;
                if (level === "MEDIUM") score += 3;
                if (level === "LOW") score += 1;
            }
        }
    }

    let risk = "LOW";
    if (score >= 8) risk = "HIGH";
    else if (score >= 4) risk = "MEDIUM";

    return { keywords: detected, score, risk };
}

// ======================================
// 📍 LOCATION EXTRACTION (UPGRADED)
// ======================================
function extractLocation(text = "") {

    const t = text.toLowerCase();

    for (let state of NIGERIA_STATES) {
        if (t.includes(state)) {
            return state.toUpperCase();
        }
    }

    return "Nigeria";
}

// ======================================
module.exports = {
    analyzeText,
    extractLocation
};
