// nlp.js

/* ======================================
   🚨 DANGER KEYWORDS
====================================== */
const threatDictionary = {
    HIGH: ["kidnap", "abduct", "gunmen", "shooting", "attack"],
    MEDIUM: ["robbery", "suspicious", "threat", "violence"],
    LOW: ["noise", "argument", "crowd"]
};


/* ======================================
   🧠 ANALYZE TEXT
====================================== */
function analyzeText(text = "") {

    text = text.toLowerCase();

    let detected = [];
    let score = 0;

    Object.entries(threatDictionary).forEach(([level, words]) => {
        words.forEach(word => {
            if (text.includes(word)) {
                detected.push(word);

                if (level === "HIGH") score += 5;
                if (level === "MEDIUM") score += 3;
                if (level === "LOW") score += 1;
            }
        });
    });

    let risk = "LOW";
    if (score >= 8) risk = "HIGH";
    else if (score >= 4) risk = "MEDIUM";

    return {
        keywords: detected,
        score,
        risk
    };
}


/* ======================================
   📍 EXTRACT LOCATION (BASIC)
====================================== */
function extractLocation(text = "") {

    const locations = [
        "lagos",
        "abuja",
        "oyo",
        "kano",
        "kaduna"
    ];

    text = text.toLowerCase();

    for (let loc of locations) {
        if (text.includes(loc)) {
            return loc.toUpperCase() + " Axis";
        }
    }

    return "Unknown";
}


/* ======================================
   📤 EXPORT
====================================== */
module.exports = {
    analyzeText,
    extractLocation
};
