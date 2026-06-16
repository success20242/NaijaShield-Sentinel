// geo.js

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.OPENCAGE_API_KEY;

async function getCoordinates(locationName) {

    try {
        const res = await axios.get(
            `https://api.opencagedata.com/geocode/v1/json`,
            {
                params: {
                    key: API_KEY,
                    q: locationName,
                    limit: 1
                }
            }
        );

        const data = res.data.results[0];

        if (!data) return null;

        return {
            lat: data.geometry.lat,
            lng: data.geometry.lng
        };

    } catch (err) {
        console.log("Geo Error:", err.message);
        return null;
    }
}

module.exports = { getCoordinates };
