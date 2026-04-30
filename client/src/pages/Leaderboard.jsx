import { useState, useEffect } from 'react';
import api from '../services/api';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/users/leaderboard', { params: { limit: 25 } });
            setLeaderboard(res.data.data || []);
        } catch (error) {
            console.error('Leaderboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getBadgeForScore = (score) => {
        if (score >= 500) return { name: '🌟 Guardian', color: '#fbbf24' };
        if (score >= 200) return { name: '💎 Champion', color: '#06b6d4' };
        if (score >= 100) return { name: '🔥 Warrior', color: '#f97316' };
        if (score >= 50) return { name: '🌱 Contributor', color: '#10b981' };
        return { name: '👋 Newcomer', color: '#94a3b8' };
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">🏆 Leaderboard</h1>
                <p className="page-subtitle">
                    Top citizens making their cities cleaner. Report pollution to climb the ranks!
                </p>
            </div>

            {/* Reward Tiers */}
            <div className="stats-grid stagger" style={{ marginBottom: 'var(--space-2xl)' }}>
                <div className="stat-card cyan">
                    <div className="stat-icon cyan">🌱</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>Contributor</div>
                    <div className="stat-label">50+ Points</div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon green">🔥</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>Warrior</div>
                    <div className="stat-label">100+ Points</div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-icon purple">💎</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>Champion</div>
                    <div className="stat-label">200+ Points</div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon amber">🌟</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>Guardian</div>
                    <div className="stat-label">500+ Points</div>
                </div>
            </div>

            {/* Scoring Info */}
            <div className="card" style={{ marginBottom: 'var(--space-2xl)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>
                    📊 How to Earn Points
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ fontSize: '1.5rem' }}>📸</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Submit Report</div>
                            <div style={{ color: 'var(--accent-green)', fontWeight: 700 }}>+10 pts</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ fontSize: '1.5rem' }}>🤖</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Verified</div>
                            <div style={{ color: 'var(--accent-green)', fontWeight: 700 }}>+5 bonus</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ fontSize: '1.5rem' }}>👍</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Community Upvote</div>
                            <div style={{ color: 'var(--accent-green)', fontWeight: 700 }}>+2 pts</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Leaderboard List */}
            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            ) : leaderboard.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏆</div>
                    <div className="empty-state-title">No Citizens Yet</div>
                    <p>Be the first to report pollution and top the leaderboard!</p>
                </div>
            ) : (
                <div className="leaderboard-list stagger">
                    {leaderboard.map((user) => {
                        const badge = getBadgeForScore(user.contribution_score);
                        return (
                            <div key={user.id} className="leaderboard-item">
                                <div className={`leaderboard-rank ${getRankStyle(user.rank)}`}>
                                    {getRankEmoji(user.rank)}
                                </div>
                                <div className="leaderboard-avatar">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="leaderboard-info">
                                    <div className="leaderboard-name">
                                        {user.name}
                                        <span style={{
                                            marginLeft: 'var(--space-sm)',
                                            fontSize: '0.75rem',
                                            color: badge.color,
                                            fontWeight: 600
                                        }}>
                                            {badge.name}
                                        </span>
                                    </div>
                                    <div className="leaderboard-stats">
                                        {user.reports_count} reports • {user.verified_reports || 0} verified
                                    </div>
                                </div>
                                <div className="leaderboard-score">
                                    {user.contribution_score} pts
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
