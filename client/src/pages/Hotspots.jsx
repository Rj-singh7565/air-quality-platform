import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import api from '../services/api';

const getMarkerColor = (category) => {
    const colors = {
        smoke: '#94a3b8',
        burning_waste: '#f59e0b',
        dust: '#d97706',
        industrial: '#8b5cf6',
        vehicle: '#3b82f6',
        construction: '#f59e0b',
        other: '#64748b'
    };
    return colors[category] || '#64748b';
};

const Hotspots = () => {
    const [hotspots, setHotspots] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('map');
    const [selectedCity, setSelectedCity] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [hotspotsRes, reportsRes] = await Promise.allSettled([
                api.get('/reports/hotspots'),
                api.get('/reports', { params: { limit: 50 } })
            ]);

            if (hotspotsRes.status === 'fulfilled') {
                setHotspots(hotspotsRes.value.data.data || []);
            }
            if (reportsRes.status === 'fulfilled') {
                setReports(reportsRes.value.data.data || []);
            }
        } catch (error) {
            console.error('Hotspots fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReports = selectedCity
        ? reports.filter(r => r.city?.toLowerCase() === selectedCity.toLowerCase())
        : reports;

    const cities = [...new Set(reports.map(r => r.city).filter(Boolean))];

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🔥 Pollution Hotspots</h1>
                <p className="page-subtitle">
                    Identify areas with concentrated pollution reports and take action
                </p>
            </div>

            {/* Hotspot Stats */}
            {hotspots.length > 0 && (
                <div className="stats-grid stagger" style={{ marginBottom: 'var(--space-2xl)' }}>
                    {hotspots.slice(0, 4).map((hotspot, i) => (
                        <div key={i} className={`stat-card ${['cyan', 'green', 'purple', 'amber'][i]}`}>
                            <div className={`stat-icon ${['cyan', 'green', 'purple', 'amber'][i]}`}>
                                {hotspot.category === 'smoke' ? '🌫️' :
                                    hotspot.category === 'burning_waste' ? '🔥' :
                                        hotspot.category === 'dust' ? '💨' :
                                            hotspot.category === 'industrial' ? '🏭' : '⚠️'}
                            </div>
                            <div className="stat-value">{hotspot.report_count}</div>
                            <div className="stat-label">{hotspot.city} - {hotspot.category.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div className="tabs">
                    <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                        🗺️ Hotspot Map
                    </button>
                    <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                        📋 All Reports
                    </button>
                </div>

                {activeTab === 'reports' && cities.length > 0 && (
                    <select
                        className="form-select"
                        style={{ width: 'auto', minWidth: 150 }}
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                    >
                        <option value="">All Cities</option>
                        {cities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : activeTab === 'map' ? (
                <div className="map-container" style={{ height: '550px' }}>
                    <MapContainer
                        center={[22.5, 78.5]}
                        zoom={5}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; CARTO'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Individual reports */}
                        {reports.map((report, index) => (
                            report.latitude && report.longitude && (
                                <CircleMarker
                                    key={`report-${index}`}
                                    center={[report.latitude, report.longitude]}
                                    radius={6}
                                    pathOptions={{
                                        color: getMarkerColor(report.category),
                                        fillColor: getMarkerColor(report.category),
                                        fillOpacity: 0.7,
                                        weight: 1
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 180 }}>
                                            <strong>{report.title}</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0' }}>
                                                {report.category.replace('_', ' ')} • {report.severity}
                                            </div>
                                            {report.ai_verified && (
                                                <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                                                    ✅ AI Verified ({Math.round(report.ai_confidence * 100)}%)
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                                by {report.reporter_name}
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            )
                        ))}

                        {/* Hotspot clusters */}
                        {hotspots.map((hotspot, index) => (
                            hotspot.avg_latitude && hotspot.avg_longitude && (
                                <CircleMarker
                                    key={`hotspot-${index}`}
                                    center={[hotspot.avg_latitude, hotspot.avg_longitude]}
                                    radius={Math.max(15, Math.min(40, hotspot.report_count * 5))}
                                    pathOptions={{
                                        color: '#f43f5e',
                                        fillColor: '#f43f5e',
                                        fillOpacity: 0.2,
                                        weight: 2,
                                        dashArray: '5, 5'
                                    }}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 160 }}>
                                            <strong>🔥 Hotspot: {hotspot.city}</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0' }}>
                                                {hotspot.report_count} reports • {hotspot.category.replace('_', ' ')}
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            )
                        ))}
                    </MapContainer>
                </div>
            ) : (
                /* Reports List */
                <div>
                    {filteredReports.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No Reports Yet</div>
                            <p>Be the first to report pollution in your area!</p>
                        </div>
                    ) : (
                        filteredReports.map((report, index) => (
                            <div key={index} className="report-card animate-fade-in">
                                <div className="report-header">
                                    <div>
                                        <div className="report-title">{report.title}</div>
                                        <div className="report-meta">
                                            <span className={`report-tag tag-${report.category}`}>
                                                {report.category.replace('_', ' ')}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                <span className={`severity-indicator severity-${report.severity}`}></span>
                                                {report.severity}
                                            </span>
                                            {report.city && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    📍 {report.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {report.ai_verified ? (
                                        <span className="ai-badge ai-verified">🤖 AI Verified</span>
                                    ) : (
                                        <span className="ai-badge ai-unverified">⏳ Pending</span>
                                    )}
                                </div>

                                {report.description && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                        {report.description}
                                    </p>
                                )}

                                {report.image_url && (
                                    <img
                                        src={report.image_url}
                                        alt={report.title}
                                        className="report-image"
                                        loading="lazy"
                                    />
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="report-votes">
                                        <button className="vote-btn upvote">
                                            👍 {report.upvotes || 0}
                                        </button>
                                        <button className="vote-btn downvote">
                                            👎 {report.downvotes || 0}
                                        </button>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {report.reporter_name} • {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Hotspots;
