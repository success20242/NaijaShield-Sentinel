const axios = require('axios');

const GEO_API_KEY = process.env.GEO_API_KEY;

// fallback Nigeria center
const FALLBACK = { lat: 9.0820, lng: 8.6753 };

async function getCoordinates(location) {

    if (!location || location.length < 3) return FALLBACK;

    try {
        const res = await axios.get(
            "https://api.opencagedata.com/geocode/v1/json",
            {
                params: {
                    q: location + ", Nigeria",
                    key: GEO_API_KEY,
                    limit: 1
                },
                timeout: 5000
            }
        );

        const result = res.data?.results?.[0];

        if (!result) return FALLBACK;

        return {
            lat: result.geometry.lat,
            lng: result.geometry.lng
        };

    } catch (err) {

        if (err.response?.status === 401) {
            console.log("[GEO] Invalid API key");
        }

        return FALLBACK;
    }
}

module.exports = { getCoordinates };
