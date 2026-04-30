const axios = require('axios');
require('dotenv').config();

// WAQI (World Air Quality Index) API - Free real-time AQI
// Get your free token at: https://aqicn.org/data-platform/token/
const WAQI_BASE = 'https://api.waqi.info';
const WAQI_TOKEN = process.env.WAQI_API_TOKEN || 'demo';

// Indian cities with coordinates
const INDIAN_CITIES = [
    { city: 'Delhi', lat: 28.6139, lng: 77.2090, country: 'IN' },
    { city: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'IN' },
    { city: 'Bangalore', lat: 12.9716, lng: 77.5946, country: 'IN' },
    { city: 'Chennai', lat: 13.0827, lng: 80.2707, country: 'IN' },
    { city: 'Kolkata', lat: 22.5726, lng: 88.3639, country: 'IN' },
    { city: 'Hyderabad', lat: 17.3850, lng: 78.4867, country: 'IN' },
    { city: 'Pune', lat: 18.5204, lng: 73.8567, country: 'IN' },
    { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714, country: 'IN' },
    { city: 'Jaipur', lat: 26.9124, lng: 75.7873, country: 'IN' },
    { city: 'Lucknow', lat: 26.8467, lng: 80.9462, country: 'IN' },
    { city: 'Kanpur', lat: 26.4499, lng: 80.3319, country: 'IN' },
    { city: 'Varanasi', lat: 25.3176, lng: 82.9739, country: 'IN' },
    { city: 'Patna', lat: 25.6093, lng: 85.1376, country: 'IN' },
    { city: 'Guwahati', lat: 26.1445, lng: 91.7362, country: 'IN' },
];

// Generate fallback demo AQI data
const generateDemoAQI = (city) => {
    const baseAQI = {
        'Delhi': 220, 'Kanpur': 200, 'Varanasi': 180, 'Patna': 170,
        'Lucknow': 165, 'Kolkata': 140, 'Mumbai': 120, 'Ahmedabad': 130,
        'Jaipur': 150, 'Pune': 90, 'Hyderabad': 100, 'Chennai': 85,
        'Bangalore': 75, 'Guwahati': 95
    };
    const base = baseAQI[city.city] || 100;
    const variation = Math.floor(Math.random() * 40) - 20;
    const aqi = Math.max(10, base + variation);
    return {
        city: city.city, country: city.country, aqi_value: aqi,
        pm25: parseFloat((aqi * 0.4 + Math.random() * 20).toFixed(1)),
        pm10: parseFloat((aqi * 0.6 + Math.random() * 30).toFixed(1)),
        no2: parseFloat((Math.random() * 60 + 10).toFixed(1)),
        so2: parseFloat((Math.random() * 30 + 5).toFixed(1)),
        co: parseFloat((Math.random() * 2 + 0.3).toFixed(2)),
        o3: parseFloat((Math.random() * 80 + 20).toFixed(1)),
        latitude: city.lat, longitude: city.lng,
        source: 'demo', fetched_at: new Date().toISOString()
    };
};

// Get AQI category info
const getAQICategory = (aqi) => {
    if (aqi <= 50) return { category: 'Good', color: '#00e400', emoji: '😊', advice: 'Air quality is satisfactory. Enjoy outdoor activities!' };
    if (aqi <= 100) return { category: 'Moderate', color: '#ffff00', emoji: '🙂', advice: 'Air quality is acceptable. Unusually sensitive people should limit outdoor exertion.' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', emoji: '😷', advice: 'Members of sensitive groups may experience health effects.' };
    if (aqi <= 200) return { category: 'Unhealthy', color: '#ff0000', emoji: '😨', advice: 'Everyone may begin to experience health effects.' };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: '#8f3f97', emoji: '🤮', advice: 'Health alert: everyone may experience more serious effects.' };
    return { category: 'Hazardous', color: '#7e0023', emoji: '☠️', advice: 'Health warnings of emergency conditions. The entire population is likely to be affected.' };
};

// Helper: Parse WAQI API response into our standard format
const parseWAQIResponse = (data, cityName) => {
    const iaqi = data.iaqi || {};
    return {
        city: data.city?.name || cityName,
        country: 'IN',
        aqi_value: data.aqi || 0,
        pm25: iaqi.pm25?.v || null,
        pm10: iaqi.pm10?.v || null,
        no2: iaqi.no2?.v || null,
        so2: iaqi.so2?.v || null,
        co: iaqi.co?.v || null,
        o3: iaqi.o3?.v || null,
        temperature: iaqi.t?.v || null,
        humidity: iaqi.h?.v || null,
        wind: iaqi.w?.v || null,
        latitude: data.city?.geo?.[0] || null,
        longitude: data.city?.geo?.[1] || null,
        station: data.city?.name || null,
        source: 'waqi',
        fetched_at: data.time?.iso || new Date().toISOString()
    };
};

// Fetch real-time AQI for a single city from WAQI
const fetchCityAQIFromWAQI = async (cityName) => {
    const response = await axios.get(
        `${WAQI_BASE}/feed/${encodeURIComponent(cityName)}/?token=${WAQI_TOKEN}`,
        { timeout: 5000 }
    );
    if (response.data?.status === 'ok') {
        return parseWAQIResponse(response.data.data, cityName);
    }
    return null;
};

// Fetch real-time AQI by GPS coordinates from WAQI
const fetchGeoAQIFromWAQI = async (lat, lng) => {
    const response = await axios.get(
        `${WAQI_BASE}/feed/geo:${lat};${lng}/?token=${WAQI_TOKEN}`,
        { timeout: 5000 }
    );
    if (response.data?.status === 'ok') {
        return parseWAQIResponse(response.data.data, 'Unknown');
    }
    return null;
};

// @route   GET /api/aqi/cities
// Get real-time AQI for all major Indian cities
exports.getCitiesAQI = async (req, res) => {
    try {
        let aqiData = [];

        try {
            // Fetch real-time data for all cities in parallel
            const promises = INDIAN_CITIES.map(city =>
                fetchCityAQIFromWAQI(city.city).catch(() => null)
            );
            const results = await Promise.all(promises);

            aqiData = results.filter(r => r !== null);
        } catch (apiError) {
            console.log('WAQI API unavailable, using demo data');
        }

        // Fallback to demo data if API fails
        if (aqiData.length === 0) {
            aqiData = INDIAN_CITIES.map(city => generateDemoAQI(city));
        }

        // Add category info
        const enrichedData = aqiData.map(entry => ({
            ...entry, ...getAQICategory(entry.aqi_value)
        }));

        res.json({
            success: true,
            data: enrichedData,
            source: aqiData[0]?.source || 'demo',
            fetched_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cities AQI error:', error);
        const demoData = INDIAN_CITIES.map(city => ({
            ...generateDemoAQI(city), ...getAQICategory(generateDemoAQI(city).aqi_value)
        }));
        res.json({ success: true, data: demoData, source: 'demo', fetched_at: new Date().toISOString() });
    }
};

// @route   GET /api/aqi/city/:cityName
// Get real-time AQI for a specific city
exports.getCityAQI = async (req, res) => {
    try {
        const { cityName } = req.params;

        // Try WAQI real-time API
        try {
            const data = await fetchCityAQIFromWAQI(cityName);
            if (data) {
                return res.json({ success: true, data: { ...data, ...getAQICategory(data.aqi_value) } });
            }
        } catch (apiError) {
            console.log(`WAQI API unavailable for ${cityName}, using demo data`);
        }

        // Fallback to demo
        const matchingCity = INDIAN_CITIES.find(
            c => c.city.toLowerCase() === cityName.toLowerCase()
        ) || { city: cityName, lat: 20.5937, lng: 78.9629, country: 'IN' };

        const demoData = generateDemoAQI(matchingCity);
        res.json({ success: true, data: { ...demoData, ...getAQICategory(demoData.aqi_value) } });
    } catch (error) {
        console.error('City AQI error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching AQI data' });
    }
};

// @route   GET /api/aqi/location
// Get real-time AQI by GPS coordinates (lat/lng)
exports.getLocationAQI = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Please provide latitude and longitude query parameters'
            });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        // Try WAQI geo feed
        try {
            const data = await fetchGeoAQIFromWAQI(lat, lng);
            if (data) {
                return res.json({ success: true, data: { ...data, ...getAQICategory(data.aqi_value) } });
            }
        } catch (apiError) {
            console.log('WAQI geo API unavailable, using fallback');
        }

        // Fallback: find nearest Indian city
        let nearest = INDIAN_CITIES[0];
        let minDist = Infinity;
        for (const city of INDIAN_CITIES) {
            const dist = Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2);
            if (dist < minDist) { minDist = dist; nearest = city; }
        }
        const demoData = generateDemoAQI(nearest);
        res.json({ success: true, data: { ...demoData, ...getAQICategory(demoData.aqi_value), note: `Nearest station: ${nearest.city}` } });
    } catch (error) {
        console.error('Location AQI error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching location AQI' });
    }
};

// @route   GET /api/aqi/search
// Search for AQI stations by keyword
exports.searchStations = async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) return res.status(400).json({ success: false, message: 'Please provide a keyword query parameter' });

        try {
            const response = await axios.get(
                `${WAQI_BASE}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(keyword)}`,
                { timeout: 5000 }
            );

            if (response.data?.status === 'ok') {
                const stations = response.data.data.map(s => ({
                    name: s.station?.name,
                    aqi_value: s.aqi === '-' ? null : parseInt(s.aqi),
                    latitude: s.station?.geo?.[0],
                    longitude: s.station?.geo?.[1],
                    time: s.time?.stime,
                    ...(s.aqi !== '-' ? getAQICategory(parseInt(s.aqi)) : {})
                }));
                return res.json({ success: true, data: stations });
            }
        } catch (apiError) {
            console.log('WAQI search API unavailable');
        }

        res.json({ success: true, data: [], message: 'No stations found or API unavailable' });
    } catch (error) {
        console.error('Search stations error:', error);
        res.status(500).json({ success: false, message: 'Server error searching stations' });
    }
};

// @route   GET /api/aqi/predict
exports.predictAQI = async (req, res) => {
    try {
        const { city } = req.query;
        const matchingCity = INDIAN_CITIES.find(
            c => c.city.toLowerCase() === (city || 'delhi').toLowerCase()
        ) || INDIAN_CITIES[0];

        // Try to get current real AQI first
        let currentAQI;
        try {
            const data = await fetchCityAQIFromWAQI(matchingCity.city);
            currentAQI = data?.aqi_value || generateDemoAQI(matchingCity).aqi_value;
        } catch {
            currentAQI = generateDemoAQI(matchingCity).aqi_value;
        }

        // Generate 7-day prediction based on current real AQI
        const predictions = [];
        let prevAQI = currentAQI;
        for (let i = 1; i <= 7; i++) {
            const trend = Math.sin(i * 0.5) * 15;
            const noise = Math.floor(Math.random() * 20) - 10;
            const predictedAQI = Math.max(10, Math.round(prevAQI + trend + noise));
            const date = new Date();
            date.setDate(date.getDate() + i);
            predictions.push({
                date: date.toISOString().split('T')[0],
                aqi_value: predictedAQI,
                ...getAQICategory(predictedAQI),
                confidence: parseFloat((0.95 - i * 0.05).toFixed(2))
            });
            prevAQI = predictedAQI;
        }

        res.json({
            success: true,
            data: { city: matchingCity.city, current_aqi: currentAQI, ...getAQICategory(currentAQI), predictions }
        });
    } catch (error) {
        console.error('Predict AQI error:', error);
        res.status(500).json({ success: false, message: 'Server error predicting AQI' });
    }
};
