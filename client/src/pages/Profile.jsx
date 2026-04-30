import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
    const { user, logout } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${user.id}/profile`);
            setReports(res.data.data.recent_reports || []);
        } catch (error) {
            console.error('Profile error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeForScore = (score) => {
        if (score >= 500) return { name: '🌟 Guardian', color: '#fbbf24' };
        if (score >= 200) return { name: '💎 Champion', color: '#06b6d4' };
        if (score >= 100) return { name: '🔥 Warrior', color: '#f97316' };
        if (score >= 50) return { name: '🌱 Contributor', color: '#10b981' };
        return { name: '👋 Newcomer', color: '#94a3b8' };
    };

    const badge = getBadgeForScore(user?.contribution_score || 0);
    const daysActive = user ? Math.ceil((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">👤 My Profile</h1>
                <p className="page-subtitle">
                    Track your contributions and impact
                </p>
            </div>

            {/* Profile Card */}
            <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: 'white',
                        flexShrink: 0
                    }}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-xs)' }}>
                            {user?.name}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                            {user?.email}
                        </p>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-full)',
                            background: badge.color + '20',
                            color: badge.color,
                            fontWeight: 700,
                            fontSize: '0.85rem'
                        }}>
                            {badge.name}
                        </span>
                    </div>
                    <button className="btn btn-danger" onClick={logout}>
                        🚪 Sign Out
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid stagger">
                <div className="stat-card cyan">
                    <div className="stat-icon cyan">⭐</div>
                    <div className="stat-value">{user?.contribution_score || 0}</div>
                    <div className="stat-label">Total Points</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green">📊</div>
                    <div className="stat-value">{user?.reports_count || 0}</div>
                    <div className="stat-label">Reports Filed</div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-icon purple">🤖</div>
                    <div className="stat-value">{user?.verified_reports || 0}</div>
                    <div className="stat-label">AI Verified</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon amber">📅</div>
                    <div className="stat-value">{daysActive}</div>
                    <div className="stat-label">Days Active</div>
                </div>
            </div>

            {/* Recent Reports */}
            <div style={{ marginTop: 'var(--space-2xl)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                    📋 My Recent Reports
                </h3>

                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-title">No Reports Yet</div>
                        <p>Start reporting pollution to earn points and badges!</p>
                    </div>
                ) : (
                    <div className="stagger">
                        {reports.map((report, index) => (
                            <div key={index} className="report-card">
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
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {report.ai_verified ? (
                                            <span className="ai-badge ai-verified">✅ Verified</span>
                                        ) : (
                                            <span className="ai-badge ai-unverified">⏳ Pending</span>
                                        )}
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: report.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                            color: report.status === 'resolved' ? 'var(--accent-green)' : 'var(--text-secondary)'
                                        }}>
                                            {report.status}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span>👍 {report.upvotes || 0}</span>
                                    <span>👎 {report.downvotes || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
