const express = require('express');
const router = express.Router();
const { getCitiesAQI, getCityAQI, getLocationAQI, searchStations, predictAQI } = require('../controllers/aqiController');

router.get('/cities', getCitiesAQI);          // All Indian cities real-time AQI
router.get('/city/:cityName', getCityAQI);    // Single city real-time AQI
router.get('/location', getLocationAQI);      // AQI by GPS lat/lng coordinates
router.get('/search', searchStations);        // Search AQI stations by keyword
router.get('/predict', predictAQI);           // 7-day AQI prediction

module.exports = router;
