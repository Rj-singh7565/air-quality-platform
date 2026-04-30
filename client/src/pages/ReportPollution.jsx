import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { classifyImage } from '../services/aiClassifier';
import api from '../services/api';

// Custom marker icon
const customIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const LocationPicker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        }
    });

    return position ? <Marker position={position} icon={customIcon} /> : null;
};

const ReportPollution = () => {
    const { user, updateUser } = useAuth();
    const [reportType, setReportType] = useState('issue');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        severity: 'moderate',
        address: '',
        city: ''
    });
    const [position, setPosition] = useState(null);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [captureTimestamp, setCaptureTimestamp] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const cameraInputRef = useRef(null);
    const imgRef = useRef(null);

    // Try to get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                },
                () => {
                    setPosition([28.6139, 77.2090]);
                }
            );
        }
    }, []);

    // Camera-only capture handler
    const handleCameraCapture = useCallback(async (file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setImage(file);
        setError('');
        // Record exact capture timestamp
        setCaptureTimestamp(new Date().toISOString());

        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }, []);

    // Run AI classification when image loads
    const handleImageLoad = useCallback(async () => {
        if (!imgRef.current) return;

        setAiLoading(true);
        setAiResult(null);

        try {
            const result = await classifyImage(imgRef.current);
            setAiResult(result);

            if (result.success && result.isPollution && result.category !== 'unknown') {
                setFormData(prev => ({
                    ...prev,
                    category: result.category
                }));
            }
        } catch (err) {
            console.error('AI classification error:', err);
        } finally {
            setAiLoading(false);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title || !formData.category) {
            setError('Please provide a title and category');
            return;
        }

        if (!position) {
            setError('Please select a location on the map');
            return;
        }

        if (!image) {
            setError('Please capture a photo using your camera. Gallery uploads are not allowed to ensure authenticity.');
            return;
        }

        setSubmitting(true);

        try {
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('report_type', reportType);
            submitData.append('category', formData.category);
            submitData.append('severity', formData.severity);
            submitData.append('latitude', position[0]);
            submitData.append('longitude', position[1]);
            submitData.append('address', formData.address);
            submitData.append('city', formData.city);

            if (aiResult?.success) {
                submitData.append('ai_verified', aiResult.isPollution);
                submitData.append('ai_confidence', aiResult.confidence);
                submitData.append('ai_classification', aiResult.classification);
            }

            submitData.append('image', image);

            await api.post('/reports', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            updateUser({
                reports_count: (user.reports_count || 0) + 1,
                contribution_score: (user.contribution_score || 0) + 10
            });

            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="animate-scale-in" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🎉</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>
                    {reportType === 'polluter' ? 'Polluter Report Submitted!' : 'Report Submitted!'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    Thank you for your contribution. You earned <strong style={{ color: 'var(--accent-green)' }}>+10 points</strong>!
                </p>
                {reportType === 'polluter' && (
                    <div style={{
                        padding: 'var(--space-md)', background: 'rgba(139,92,246,0.1)',
                        border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-lg)', fontSize: '0.9rem', color: '#a78bfa'
                    }}>
                        ⚖️ A municipal authority will verify this polluter report and may apply a fine based on the rules.
                    </div>
                )}
                {aiResult?.isPollution && (
                    <p style={{ color: 'var(--accent-green)', marginBottom: 'var(--space-lg)' }}>
                        ✅ AI verified this report with {Math.round(aiResult.confidence * 100)}% confidence — +5 bonus points!
                    </p>
                )}
                <button
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                        setSubmitted(false);
                        setFormData({ title: '', description: '', category: '', severity: 'moderate', address: '', city: '' });
                        setImage(null);
                        setImagePreview(null);
                        setAiResult(null);
                        setCaptureTimestamp(null);
                        setReportType('issue');
                    }}
                >
                    Submit Another Report
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📸 Report Pollution</h1>
                <p className="page-subtitle">
                    Capture real-time pollution using your camera. Location &amp; timestamp are auto-recorded.
                </p>
            </div>

            {/* Report Type Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <button
                    type="button"
                    onClick={() => setReportType('issue')}
                    style={{
                        padding: 'var(--space-lg)',
                        borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${reportType === 'issue' ? 'var(--accent-primary)' : 'rgba(148,163,184,0.2)'}`,
                        background: reportType === 'issue' ? 'rgba(6,182,212,0.1)' : 'var(--bg-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>🌫️</div>
                    <div style={{ fontWeight: 700, color: reportType === 'issue' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        Pollution Issue
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Report a pollution problem in your area
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => setReportType('polluter')}
                    style={{
                        padding: 'var(--space-lg)',
                        borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${reportType === 'polluter' ? '#f97316' : 'rgba(148,163,184,0.2)'}`,
                        background: reportType === 'polluter' ? 'rgba(249,115,22,0.1)' : 'var(--bg-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>⚖️</div>
                    <div style={{ fontWeight: 700, color: reportType === 'polluter' ? '#f97316' : 'var(--text-primary)' }}>
                        Report Polluter
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Report a specific entity causing pollution
                    </div>
                </button>
            </div>

            {reportType === 'polluter' && (
                <div style={{
                    padding: 'var(--space-md)', background: 'rgba(249,115,22,0.08)',
                    border: '1px solid rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-xl)', fontSize: '0.9rem', color: '#fb923c'
                }}>
                    ⚖️ <strong>Polluter Report:</strong> A municipal authority will review this and may apply a fine based on our predefined rules. Provide as much detail as possible.
                </div>
            )}

            {error && <div className="auth-error" style={{ marginBottom: 'var(--space-lg)' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="grid-2">
                    {/* Left Column - Camera Capture */}
                    <div>
                        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-sm)' }}>
                                📷 Capture Evidence
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                                📍 Camera-only • Auto location &amp; timestamp • No gallery uploads allowed
                            </p>

                            {!imagePreview ? (
                                <div
                                    className="upload-area"
                                    onClick={() => cameraInputRef.current?.click()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📷</div>
                                    <p className="upload-text">Tap to open camera</p>
                                    <p className="upload-hint">Real-time capture only • JPEG, PNG, WebP • Max 5MB</p>
                                    <button type="button" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
                                        📸 Open Camera
                                    </button>
                                </div>
                            ) : (
                                <div className="upload-preview" style={{ position: 'relative' }}>
                                    <img
                                        ref={imgRef}
                                        src={imagePreview}
                                        alt="Captured evidence"
                                        onLoad={handleImageLoad}
                                        crossOrigin="anonymous"
                                    />
                                    <button
                                        type="button"
                                        className="upload-preview-remove"
                                        onClick={() => {
                                            setImage(null);
                                            setImagePreview(null);
                                            setAiResult(null);
                                            setCaptureTimestamp(null);
                                        }}
                                    >
                                        ✕
                                    </button>
                                    {captureTimestamp && (
                                        <div style={{
                                            position: 'absolute', bottom: 8, left: 8,
                                            background: 'rgba(0,0,0,0.7)', color: '#fff',
                                            fontSize: '0.7rem', padding: '3px 8px',
                                            borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)'
                                        }}>
                                            📅 {new Date(captureTimestamp).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Camera input - capture only, no gallery */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={(e) => handleCameraCapture(e.target.files[0])}
                            />
                        </div>

                        {/* Location Info Card */}
                        {position && (
                            <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>Auto-detected Location</span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    {position[0].toFixed(4)}, {position[1].toFixed(4)}
                                </p>
                            </div>
                        )}

                        {/* AI Analysis */}
                        {(aiLoading || aiResult) && (
                            <div className="ai-analysis animate-slide-up">
                                <div className="ai-analysis-title">
                                    🤖 AI Analysis
                                    {aiLoading && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>}
                                </div>

                                {aiLoading ? (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Analyzing image for pollution indicators...
                                    </p>
                                ) : aiResult?.success ? (
                                    <>
                                        <div className="ai-results-grid">
                                            <div className="ai-result-item">
                                                <div className="ai-result-label">Classification</div>
                                                <div className="ai-result-value" style={{ fontSize: '0.9rem' }}>
                                                    {aiResult.classification}
                                                </div>
                                            </div>
                                            <div className="ai-result-item">
                                                <div className="ai-result-label">Confidence</div>
                                                <div className="ai-result-value" style={{
                                                    color: aiResult.confidence > 0.7 ? 'var(--accent-green)' :
                                                        aiResult.confidence > 0.4 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                                                }}>
                                                    {Math.round(aiResult.confidence * 100)}%
                                                </div>
                                                <div className="confidence-bar">
                                                    <div
                                                        className={`confidence-fill ${aiResult.confidence > 0.7 ? 'confidence-high' :
                                                            aiResult.confidence > 0.4 ? 'confidence-medium' : 'confidence-low'
                                                            }`}
                                                        style={{ width: `${aiResult.confidence * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="ai-result-item">
                                                <div className="ai-result-label">Pollution</div>
                                                <div className="ai-result-value">
                                                    {aiResult.isPollution ? '✅ Detected' : '❌ Not Detected'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                                        ⚠️ Could not analyze image. You can still submit your report manually.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Form */}
                    <div>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
                                📝 Report Details
                            </h3>

                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder={reportType === 'polluter' ? 'e.g., Factory illegally burning waste...' : 'e.g., Heavy smoke from factory near...'}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    required
                                >
                                    <option value="">Select category</option>
                                    <option value="smoke">🌫️ Smoke</option>
                                    <option value="burning_waste">🔥 Burning Waste</option>
                                    <option value="dust">💨 Dust</option>
                                    <option value="industrial">🏭 Industrial Emissions</option>
                                    <option value="vehicle">🚗 Vehicle Exhaust</option>
                                    <option value="construction">🏗️ Construction</option>
                                    <option value="other">📋 Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Severity</label>
                                <select
                                    className="form-select"
                                    value={formData.severity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                                >
                                    <option value="low">🟢 Low</option>
                                    <option value="moderate">🟡 Moderate</option>
                                    <option value="high">🟠 High</option>
                                    <option value="critical">🔴 Critical</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder={reportType === 'polluter'
                                        ? 'Describe the polluting activity, who is responsible, frequency...'
                                        : 'Describe the pollution you observed...'
                                    }
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">City</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        placeholder="e.g., Delhi"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Nearby landmark"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Picker */}
                        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
                                📍 Confirm Location *
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                                Click on the map to adjust the pollution location
                            </p>
                            <div className="map-container" style={{ height: '250px' }}>
                                <MapContainer
                                    center={position || [28.6139, 77.2090]}
                                    zoom={12}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; CARTO'
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />
                                    <LocationPicker position={position} setPosition={setPosition} />
                                </MapContainer>
                            </div>
                            {position && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                                    📍 {position[0].toFixed(4)}, {position[1].toFixed(4)}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{
                                width: '100%', marginTop: 'var(--space-lg)',
                                background: reportType === 'polluter'
                                    ? 'linear-gradient(135deg, #f97316, #ef4444)'
                                    : undefined
                            }}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                                    Submitting...
                                </>
                            ) : reportType === 'polluter' ? '⚖️ Submit Polluter Report' : '🚀 Submit Report'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ReportPollution;
