import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import api from '../services/api';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler
);

const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#dddd00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
};

const Predictions = () => {
    const [prediction, setPrediction] = useState(null);
    const [cityAqi, setCityAqi] = useState([]);
    const [selectedCity, setSelectedCity] = useState('Delhi');
    const [loading, setLoading] = useState(true);

    const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
        'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Varanasi'];

    useEffect(() => {
        fetchPredictions();
    }, [selectedCity]);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const [predRes, citiesRes] = await Promise.allSettled([
                api.get('/aqi/predict', { params: { city: selectedCity } }),
                api.get('/aqi/cities')
            ]);

            if (predRes.status === 'fulfilled') {
                setPrediction(predRes.value.data.data);
            }
            if (citiesRes.status === 'fulfilled') {
                setCityAqi(citiesRes.value.data.data || []);
            }
        } catch (error) {
            console.error('Predictions error:', error);
        } finally {
            setLoading(false);
        }
    };

    const lineChartData = prediction ? {
        labels: prediction.predictions.map(p => {
            const date = new Date(p.date);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }),
        datasets: [{
            label: 'Predicted AQI',
            data: prediction.predictions.map(p => p.aqi_value),
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: prediction.predictions.map(p => getAQIColor(p.aqi_value)),
            pointBorderColor: prediction.predictions.map(p => getAQIColor(p.aqi_value)),
            pointRadius: 6,
            pointHoverRadius: 8,
            borderWidth: 3
        }]
    } : null;

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#94a3b8', font: { family: 'Inter' } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(148, 163, 184, 0.2)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    afterBody: (context) => {
                        const idx = context[0].dataIndex;
                        const pred = prediction.predictions[idx];
                        return [
                            `Category: ${pred.category}`,
                            `Confidence: ${Math.round(pred.confidence * 100)}%`
                        ];
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { family: 'Inter' } },
                grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            y: {
                ticks: { color: '#64748b', font: { family: 'Inter' } },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                min: 0,
                max: 500
            }
        }
    };

    const barChartData = cityAqi.length > 0 ? {
        labels: cityAqi.map(c => c.city),
        datasets: [{
            label: 'Current AQI',
            data: cityAqi.map(c => c.aqi_value),
            backgroundColor: cityAqi.map(c => getAQIColor(c.aqi_value) + '80'),
            borderColor: cityAqi.map(c => getAQIColor(c.aqi_value)),
            borderWidth: 2,
            borderRadius: 8
        }]
    } : null;

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#94a3b8', font: { family: 'Inter' } }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(148, 163, 184, 0.2)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
                grid: { color: 'rgba(148, 163, 184, 0.05)' }
            },
            y: {
                ticks: { color: '#64748b', font: { family: 'Inter' } },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                min: 0
            }
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">📈 AQI Predictions</h1>
                <p className="page-subtitle">
                    AI-powered air quality forecasts and city comparisons
                </p>
            </div>

            {/* City Selector */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select City:</label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {cities.map(city => (
                        <button
                            key={city}
                            className={`btn ${city === selectedCity ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setSelectedCity(city)}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : (
                <>
                    {/* Current AQI + Prediction */}
                    {prediction && (
                        <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
                            <div className="card">
                                <h3 className="card-title">Current AQI - {prediction.city}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', marginTop: 'var(--space-lg)' }}>
                                    <div className="aqi-value-large" style={{ color: getAQIColor(prediction.current_aqi) }}>
                                        {prediction.current_aqi}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                            {prediction.emoji} {prediction.category}
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'var(--space-xs)' }}>
                                            {prediction.advice}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="card-title">7-Day Forecast Summary</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)', marginTop: 'var(--space-lg)' }}>
                                    {prediction.predictions.map((pred, i) => (
                                        <div key={i} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                                {new Date(pred.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 800,
                                                color: getAQIColor(pred.aqi_value),
                                                background: getAQIColor(pred.aqi_value) + '15',
                                                borderRadius: 'var(--radius-md)',
                                                padding: '8px 4px'
                                            }}>
                                                {pred.aqi_value}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                {pred.emoji}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prediction Chart */}
                    {lineChartData && (
                        <div className="prediction-container" style={{ marginBottom: 'var(--space-2xl)' }}>
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
                                📊 7-Day AQI Prediction for {selectedCity}
                            </h3>
                            <div style={{ height: 350 }}>
                                <Line data={lineChartData} options={lineChartOptions} />
                            </div>
                        </div>
                    )}

                    {/* City Comparison */}
                    {barChartData && (
                        <div className="prediction-container">
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>
                                🏙️ City-wise AQI Comparison
                            </h3>
                            <div style={{ height: 400 }}>
                                <Bar data={barChartData} options={barChartOptions} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Predictions;
