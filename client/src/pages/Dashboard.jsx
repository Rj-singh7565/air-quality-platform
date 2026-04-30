import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import api from '../services/api';

const getAQIClass = (aqi) => {
    if (aqi <= 50) return 'aqi-good';
    if (aqi <= 100) return 'aqi-moderate';
    if (aqi <= 150) return 'aqi-unhealthy-sg';
    if (aqi <= 200) return 'aqi-unhealthy';
    if (aqi <= 300) return 'aqi-very-unhealthy';
    return 'aqi-hazardous';
};

const getMarkerColor = (aqi) => {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
};

const Dashboard = () => {
    const [aqiData, setAqiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState(null);
    const [view, setView] = useState('grid'); // grid | map
    const [stats, setStats] = useState({ total_users: 0, total_reports: 0, verified_reports: 0, cities_covered: 0 });

    // Current location AQI state
    const [locationAQI, setLocationAQI] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [aqiRes, statsRes] = await Promise.allSettled([
                api.get('/aqi/cities'),
                api.get('/users/stats')
            ]);

            if (aqiRes.status === 'fulfilled') {
                setAqiData(aqiRes.value.data.data || []);
            }
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data.data);
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch AQI for current GPS location
    const fetchLocationAQI = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        setLocationLoading(true);
        setLocationError('');
        setLocationAQI(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await api.get(`/aqi/location?latitude=${latitude}&longitude=${longitude}`);
                    if (res.data.success) {
                        setLocationAQI({
                            ...res.data.data,
                            userLat: latitude.toFixed(4),
                            userLng: longitude.toFixed(4)
                        });
                    } else {
                        setLocationError('Could not fetch AQI for your location.');
                    }
                } catch (err) {
                    console.error('Location AQI fetch error:', err);
                    setLocationError('Failed to fetch AQI data. Please try again.');
                } finally {
                    setLocationLoading(false);
                }
            },
            (err) => {
                setLocationLoading(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setLocationError('Location permission denied. Please allow location access in your browser settings.');
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setLocationError('Location information is unavailable.');
                        break;
                    case err.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError('An unknown error occurred while fetching location.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const topCity = aqiData.length > 0
        ? aqiData.reduce((max, c) => c.aqi_value > max.aqi_value ? c : max, aqiData[0])
        : null;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🌍 Air Quality Dashboard</h1>
                <p className="page-subtitle">
                    Real-time AQI monitoring across Indian cities
                </p>
            </div>

            {/* ===== My Location AQI Section ===== */}
            <div style={{
                marginBottom: 'var(--space-xl)',
                padding: 'var(--space-lg)',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative glow */}
                <div style={{
                    position: 'absolute', top: -40, right: -40, width: 120, height: 120,
                    background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none'
                }} />

                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 'var(--space-md)', position: 'relative', zIndex: 1
                }}>
                    <div>
                        <h3 style={{
                            fontSize: '1.1rem', fontWeight: 800, marginBottom: 4,
                            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            📍 Check Your Local Air Quality
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Get real-time AQI for your exact current location
                        </p>
                    </div>
                    <button
                        id="btn-my-location-aqi"
                        onClick={fetchLocationAQI}
                        disabled={locationLoading}
                        className="btn btn-primary"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem',
                            background: locationLoading
                                ? 'rgba(6,182,212,0.3)'
                                : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                            border: 'none', borderRadius: 'var(--radius-lg)',
                            color: '#fff', cursor: locationLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                            transition: 'all 0.3s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {locationLoading ? (
                            <>
                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                                Detecting location...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                                </svg>
                                My Current Location
                            </>
                        )}
                    </button>
                </div>

                {/* Location Error */}
                {locationError && (
                    <div style={{
                        marginTop: 'var(--space-md)', padding: 'var(--space-md)',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-md)', color: '#ef4444',
                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <span>⚠️</span> {locationError}
                    </div>
                )}

                {/* Location AQI Result Card */}
                {locationAQI && (
                    <div style={{
                        marginTop: 'var(--space-lg)',
                        background: 'var(--bg-secondary)',
                        border: `2px solid ${getMarkerColor(locationAQI.aqi_value)}40`,
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--space-xl)',
                        animation: 'scaleIn 0.4s ease',
                        position: 'relative'
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setLocationAQI(null)}
                            style={{
                                position: 'absolute', top: 12, right: 12,
                                background: 'rgba(148,163,184,0.15)', border: 'none',
                                borderRadius: '50%', width: 28, height: 28,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem',
                                transition: 'all 0.2s'
                            }}
                            title="Dismiss"
                        >✕</button>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 1fr',
                            gap: 'var(--space-xl)',
                            alignItems: 'center'
                        }}>
                            {/* Large AQI Value */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 120, height: 120,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${getMarkerColor(locationAQI.aqi_value)}30, ${getMarkerColor(locationAQI.aqi_value)}10)`,
                                    border: `3px solid ${getMarkerColor(locationAQI.aqi_value)}`,
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 30px ${getMarkerColor(locationAQI.aqi_value)}25`
                                }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>AQI</div>
                                    <div style={{
                                        fontSize: '2.4rem', fontWeight: 900,
                                        color: getMarkerColor(locationAQI.aqi_value),
                                        lineHeight: 1
                                    }}>
                                        {locationAQI.aqi_value}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {locationAQI.emoji}
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                                    <h4 style={{
                                        fontSize: '1.1rem', fontWeight: 800,
                                        color: 'var(--text-primary)', margin: 0
                                    }}>
                                        {locationAQI.city || locationAQI.station || 'Your Location'}
                                    </h4>
                                </div>

                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                    background: `${getMarkerColor(locationAQI.aqi_value)}20`,
                                    color: getMarkerColor(locationAQI.aqi_value),
                                    fontSize: '0.8rem', fontWeight: 700,
                                    marginBottom: 'var(--space-sm)'
                                }}>
                                    {locationAQI.emoji} {locationAQI.category}
                                </div>

                                <p style={{
                                    fontSize: '0.82rem', color: 'var(--text-secondary)',
                                    margin: '0 0 var(--space-md) 0', lineHeight: 1.5
                                }}>
                                    {locationAQI.advice}
                                </p>

                                {/* Coordinates */}
                                <div style={{
                                    fontSize: '0.72rem', color: 'var(--text-muted)',
                                    marginBottom: 'var(--space-md)', display: 'flex',
                                    gap: 'var(--space-md)', flexWrap: 'wrap'
                                }}>
                                    <span>🌐 {locationAQI.userLat}°N, {locationAQI.userLng}°E</span>
                                    {locationAQI.station && <span>📡 Station: {locationAQI.station}</span>}
                                    {locationAQI.note && <span>ℹ️ {locationAQI.note}</span>}
                                </div>

                                {/* Pollutant Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                    gap: 'var(--space-sm)'
                                }}>
                                    {[
                                        { label: 'PM2.5', value: locationAQI.pm25, unit: 'μg/m³' },
                                        { label: 'PM10', value: locationAQI.pm10, unit: 'μg/m³' },
                                        { label: 'NO₂', value: locationAQI.no2, unit: 'ppb' },
                                        { label: 'SO₂', value: locationAQI.so2, unit: 'ppb' },
                                        { label: 'CO', value: locationAQI.co, unit: 'ppm' },
                                        { label: 'O₃', value: locationAQI.o3, unit: 'ppb' },
                                        { label: 'Temp', value: locationAQI.temperature, unit: '°C' },
                                        { label: 'Humidity', value: locationAQI.humidity != null ? Math.round(locationAQI.humidity) : null, unit: '%' },
                                    ].filter(p => p.value != null).map((p, i) => (
                                        <div key={i} style={{
                                            padding: '8px 6px', textAlign: 'center',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(148,163,184,0.1)'
                                        }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {p.label}
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                                                {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
                                            </div>
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{p.unit}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Source & time footer */}
                        <div style={{
                            marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)',
                            borderTop: '1px solid rgba(148,163,184,0.1)',
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.68rem', color: 'var(--text-muted)'
                        }}>
                            <span>Source: {locationAQI.source === 'waqi' ? 'WAQI (Real-time)' : 'Demo / Nearest Station'}</span>
                            <span>Updated: {locationAQI.fetched_at ? new Date(locationAQI.fetched_at).toLocaleString() : 'Just now'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="stats-grid stagger">
                <div className="stat-card cyan">
                    <div className="stat-icon cyan">🏙️</div>
                    <div className="stat-value">{aqiData.length || 14}</div>
                    <div className="stat-label">Cities Monitored</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green">📊</div>
                    <div className="stat-value">{stats.total_reports || 0}</div>
                    <div className="stat-label">Total Reports</div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-icon purple">👥</div>
                    <div className="stat-value">{stats.total_users || 0}</div>
                    <div className="stat-label">Active Citizens</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon amber">⚠️</div>
                    <div className="stat-value" style={{ color: topCity ? getMarkerColor(topCity.aqi_value) : 'inherit' }}>
                        {topCity ? topCity.aqi_value : '--'}
                    </div>
                    <div className="stat-label">Highest AQI {topCity ? `(${topCity.city})` : ''}</div>
                </div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div className="tabs">
                    <button className={`tab ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
                        📊 City Cards
                    </button>
                    <button className={`tab ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>
                        🗺️ Map View
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : view === 'map' ? (
                /* Map View */
                <div className="map-container" style={{ marginBottom: 'var(--space-2xl)' }}>
                    <MapContainer
                        center={[22.5, 78.5]}
                        zoom={5}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        {aqiData.map((city, index) => (
                            city.latitude && city.longitude && (
                                <CircleMarker
                                    key={index}
                                    center={[city.latitude, city.longitude]}
                                    radius={Math.max(8, Math.min(25, city.aqi_value / 10))}
                                    pathOptions={{
                                        color: getMarkerColor(city.aqi_value),
                                        fillColor: getMarkerColor(city.aqi_value),
                                        fillOpacity: 0.6,
                                        weight: 2
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 160 }}>
                                            <strong style={{ fontSize: '1rem' }}>{city.city}</strong>
                                            <div style={{
                                                fontSize: '1.8rem',
                                                fontWeight: 900,
                                                color: getMarkerColor(city.aqi_value),
                                                margin: '4px 0'
                                            }}>
                                                AQI {city.aqi_value}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {city.category} {city.emoji}
                                            </div>
                                            {city.pm25 && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                                    PM2.5: {city.pm25} μg/m³
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            )
                        ))}
                    </MapContainer>
                </div>
            ) : (
                /* Grid View */
                <div className="aqi-grid stagger">
                    {aqiData.map((city, index) => (
                        <div
                            key={index}
                            className="aqi-city-card"
                            onClick={() => setSelectedCity(selectedCity === index ? null : index)}
                        >
                            <div className="aqi-city-header">
                                <div className="aqi-city-name">{city.city}</div>
                                <span className={`aqi-badge ${getAQIClass(city.aqi_value)}`}>
                                    {city.emoji} {city.category}
                                </span>
                            </div>
                            <div className="aqi-city-value" style={{ color: getMarkerColor(city.aqi_value) }}>
                                AQI {city.aqi_value}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                                {city.advice}
                            </p>

                            {city.pm25 && (
                                <div className="aqi-city-params">
                                    <div className="aqi-param">
                                        <span className="aqi-param-label">PM2.5</span>
                                        <span className="aqi-param-value">{city.pm25}</span>
                                    </div>
                                    <div className="aqi-param">
                                        <span className="aqi-param-label">PM10</span>
                                        <span className="aqi-param-value">{city.pm10 || '--'}</span>
                                    </div>
                                    {selectedCity === index && (
                                        <>
                                            <div className="aqi-param">
                                                <span className="aqi-param-label">NO₂</span>
                                                <span className="aqi-param-value">{city.no2 || '--'}</span>
                                            </div>
                                            <div className="aqi-param">
                                                <span className="aqi-param-label">SO₂</span>
                                                <span className="aqi-param-value">{city.so2 || '--'}</span>
                                            </div>
                                            <div className="aqi-param">
                                                <span className="aqi-param-label">CO</span>
                                                <span className="aqi-param-value">{city.co || '--'}</span>
                                            </div>
                                            <div className="aqi-param">
                                                <span className="aqi-param-label">O₃</span>
                                                <span className="aqi-param-value">{city.o3 || '--'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
