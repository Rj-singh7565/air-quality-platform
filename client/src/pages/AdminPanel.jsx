import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FINE_RULES = [
    { category: 'industrial', label: '🏭 Industrial Emissions', amount: 50000 },
    { category: 'burning_waste', label: '🔥 Burning Waste', amount: 25000 },
    { category: 'vehicle', label: '🚗 Vehicle Violations', amount: 10000 },
    { category: 'construction', label: '🏗️ Construction Dust', amount: 15000 },
    { category: 'smoke', label: '🌫️ Smoke Pollution', amount: 20000 },
    { category: 'dust', label: '💨 Dust Pollution', amount: 8000 },
    { category: 'other', label: '📋 Other Violations', amount: 5000 },
];

const getStatusStyle = (status) => {
    const styles = {
        pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: '⏳' },
        reviewing: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', icon: '🔍' },
        resolved: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: '✅' },
        rejected: { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', icon: '❌' }
    };
    return styles[status] || styles.pending;
};

const getSeverityColor = (severity) => {
    const colors = { low: '#10b981', moderate: '#f59e0b', high: '#f97316', critical: '#f43f5e' };
    return colors[severity] || '#94a3b8';
};

const AdminPanel = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [authorities, setAuthorities] = useState([]);
    const [fines, setFines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [reportTypeFilter, setReportTypeFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [rewardModal, setRewardModal] = useState(null);
    const [rewardPoints, setRewardPoints] = useState(50);
    const [rewardMessage, setRewardMessage] = useState('');
    const [fineModal, setFineModal] = useState(null);
    const [fineData, setFineData] = useState({ polluter_name: '', polluter_contact: '', fine_reason: '' });
    const [statusModal, setStatusModal] = useState(null);
    const [statusData, setStatusData] = useState({ status: 'reviewing', admin_notes: '', rejection_reason: '' });
    const [actionLoading, setActionLoading] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchData();
    }, [statusFilter, categoryFilter, sortBy, reportTypeFilter, activeTab]);

    const fetchData = async () => {
        try {
            const calls = [
                api.get('/admin/stats'),
                api.get('/admin/reports', {
                    params: {
                        status: statusFilter || undefined,
                        category: categoryFilter || undefined,
                        sort: sortBy,
                        report_type: reportTypeFilter || undefined,
                        limit: 50
                    }
                })
            ];

            if (user?.role === 'super_admin') {
                calls.push(api.get('/admin/authorities'));
            }

            calls.push(api.get('/admin/fines'));

            const results = await Promise.allSettled(calls);

            if (results[0].status === 'fulfilled') setStats(results[0].value.data.data);
            if (results[1].status === 'fulfilled') setReports(results[1].value.data.data || []);

            if (user?.role === 'super_admin') {
                if (results[2].status === 'fulfilled') setAuthorities(results[2].value.data.data || []);
                if (results[3].status === 'fulfilled') setFines(results[3].value.data.data || []);
            } else {
                if (results[2].status === 'fulfilled') setFines(results[2].value.data.data || []);
            }
        } catch (error) {
            console.error('Admin fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const updateStatus = async () => {
        if (!statusModal) return;
        setActionLoading(statusModal.id);
        try {
            const res = await api.put(`/admin/reports/${statusModal.id}/status`, statusData);
            showToast(res.data.message);
            setStatusModal(null);
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to update', 'error');
        } finally {
            setActionLoading('');
        }
    };

    const handleReward = async () => {
        if (!rewardModal) return;
        setActionLoading(rewardModal.id);
        try {
            const res = await api.post(`/admin/reports/${rewardModal.id}/reward`, {
                points: rewardPoints,
                message: rewardMessage
            });
            showToast(res.data.message);
            setRewardModal(null);
            setRewardPoints(50);
            setRewardMessage('');
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to reward', 'error');
        } finally {
            setActionLoading('');
        }
    };

    const handleFine = async () => {
        if (!fineModal) return;
        const rule = FINE_RULES.find(r => r.category === fineModal.category);
        const amount = rule?.amount || 5000;
        setActionLoading(fineModal.id);
        try {
            const res = await api.post(`/admin/reports/${fineModal.id}/fine`, {
                fine_amount: amount,
                ...fineData
            });
            showToast(res.data.message);
            setFineModal(null);
            setFineData({ polluter_name: '', polluter_contact: '', fine_reason: '' });
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to apply fine', 'error');
        } finally {
            setActionLoading('');
        }
    };

    const handleVerifyResolution = async (reportId, verified) => {
        setActionLoading(reportId);
        try {
            const res = await api.post(`/admin/reports/${reportId}/verify-resolution`, {
                verified,
                admin_notes: verified ? 'Resolution verified by authority.' : 'Resolution proof insufficient. More evidence required.'
            });
            showToast(res.data.message);
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to verify resolution', 'error');
        } finally {
            setActionLoading('');
        }
    };

    const handleAuthorityAction = async (id, action) => {
        setActionLoading(id);
        try {
            const res = await api.put(`/admin/authorities/${id}/approve`, { action });
            showToast(res.data.message);
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to update authority', 'error');
        } finally {
            setActionLoading('');
        }
    };

    if (loading) {
        return (
            <div className="loading-spinner" style={{ height: '80vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    const pendingResolutions = reports.filter(r => r.resolution_image_url && r.status === 'reviewing');
    const polluterReports = reports.filter(r => r.report_type === 'polluter');
    const pendingAuthCount = authorities.filter(a => a.approval_status === 'pending').length;

    return (
        <div className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>{toast.message}</div>
                </div>
            )}

            {/* Status Update Modal */}
            {statusModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: 'var(--space-lg)'
                }} onClick={() => setStatusModal(null)}>
                    <div className="card animate-scale-in" style={{ maxWidth: 500, width: '100%' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                            📝 Update Report Status
                        </h3>
                        <div style={{
                            padding: 'var(--space-md)', background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.9rem'
                        }}>
                            {statusModal.title}
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Status</label>
                            <select className="form-select" value={statusData.status}
                                onChange={e => setStatusData(p => ({ ...p, status: e.target.value }))}>
                                <option value="reviewing">🔍 Start Reviewing</option>
                                <option value="resolved">✅ Mark Resolved</option>
                                <option value="rejected">❌ Reject</option>
                            </select>
                        </div>

                        {statusData.status === 'rejected' && (
                            <div className="form-group">
                                <label className="form-label">Rejection Reason *</label>
                                <textarea className="form-textarea" style={{ minHeight: 80 }}
                                    value={statusData.rejection_reason}
                                    onChange={e => setStatusData(p => ({ ...p, rejection_reason: e.target.value }))}
                                    placeholder="Explain why this report is being rejected..."
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Admin Note (optional)</label>
                            <textarea className="form-textarea" style={{ minHeight: 70 }}
                                value={statusData.admin_notes}
                                onChange={e => setStatusData(p => ({ ...p, admin_notes: e.target.value }))}
                                placeholder="Additional note for the citizen..."
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={updateStatus}
                                disabled={actionLoading === statusModal.id || (statusData.status === 'rejected' && !statusData.rejection_reason)}>
                                {actionLoading === statusModal.id ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reward Modal */}
            {rewardModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setRewardModal(null)}>
                    <div className="card animate-scale-in" style={{ maxWidth: 480, width: '90%', margin: 'var(--space-xl)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                            🏆 Reward Citizen
                        </h3>
                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
                            <div style={{ fontWeight: 600 }}>{rewardModal.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                Reported by: <strong>{rewardModal.reporter_name}</strong>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reward Points (1-500)</label>
                            <input className="form-input" type="number" min="1" max="500"
                                value={rewardPoints} onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)} />
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                {[25, 50, 100, 200].map(pts => (
                                    <button key={pts} className={`btn btn-sm ${rewardPoints === pts ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setRewardPoints(pts)}>{pts} pts</button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Message (optional)</label>
                            <textarea className="form-textarea" value={rewardMessage}
                                onChange={(e) => setRewardMessage(e.target.value)}
                                placeholder="e.g., Thank you for reporting this critical issue!"
                                style={{ minHeight: 80 }} />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setRewardModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleReward}
                                disabled={!rewardPoints || rewardPoints < 1 || actionLoading === rewardModal.id}>
                                {actionLoading === rewardModal.id ? 'Awarding...' : `🏆 Award ${rewardPoints} Points`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fine Modal */}
            {fineModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setFineModal(null)}>
                    <div className="card animate-scale-in" style={{ maxWidth: 500, width: '90%', margin: 'var(--space-xl)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
                            ⚖️ Apply Fine
                        </h3>
                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
                            <div style={{ fontWeight: 600 }}>{fineModal.title}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                Category: {fineModal.category?.replace('_', ' ')}
                            </div>
                        </div>

                        <div style={{
                            padding: 'var(--space-md)', background: 'rgba(139,92,246,0.1)',
                            border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-lg)', fontSize: '0.9rem'
                        }}>
                            <div style={{ fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>📋 Predefined Fine Amount:</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c4b5fd' }}>
                                ₹{(FINE_RULES.find(r => r.category === fineModal.category)?.amount || 5000).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                As per {fineModal.category?.replace('_', ' ')} violation rules
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Polluter Name (optional)</label>
                            <input className="form-input" type="text"
                                value={fineData.polluter_name}
                                onChange={e => setFineData(p => ({ ...p, polluter_name: e.target.value }))}
                                placeholder="Individual or entity name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact / Vehicle No. (optional)</label>
                            <input className="form-input" type="text"
                                value={fineData.polluter_contact}
                                onChange={e => setFineData(p => ({ ...p, polluter_contact: e.target.value }))}
                                placeholder="Phone, vehicle number, etc." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fine Reason</label>
                            <textarea className="form-textarea" style={{ minHeight: 70 }}
                                value={fineData.fine_reason}
                                onChange={e => setFineData(p => ({ ...p, fine_reason: e.target.value }))}
                                placeholder="Reason for issuing the fine..." />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setFineModal(null)}>Cancel</button>
                            <button className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                                onClick={handleFine} disabled={actionLoading === fineModal.id}>
                                {actionLoading === fineModal.id ? 'Applying...' : '⚖️ Apply Fine'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="page-header">
                <h1 className="page-title">
                    {user?.role === 'super_admin' ? '🛡️ Super Admin Panel' : '🏛️ Municipal Admin Panel'}
                </h1>
                <p className="page-subtitle">
                    Review citizen complaints, verify reports, manage polluter fines and reward contributors
                </p>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
                <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    📊 Overview
                </button>
                <button className={`tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => setActiveTab('complaints')}>
                    📋 Reports ({stats?.total_reports || 0})
                </button>
                <button className={`tab ${activeTab === 'polluter' ? 'active' : ''}`} onClick={() => { setActiveTab('polluter'); setReportTypeFilter('polluter'); }}>
                    ⚖️ Polluter ({stats?.polluter_reports || 0})
                </button>
                <button className={`tab ${activeTab === 'resolutions' ? 'active' : ''}`} onClick={() => setActiveTab('resolutions')}>
                    ✅ Resolutions {stats?.pending_resolutions > 0 ? `(${stats.pending_resolutions} pending)` : ''}
                </button>
                <button className={`tab ${activeTab === 'fines' ? 'active' : ''}`} onClick={() => setActiveTab('fines')}>
                    💰 Fines ({stats?.total_fines_count || 0})
                </button>
                <button className={`tab ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
                    🏆 Rewards
                </button>
                {user?.role === 'super_admin' && (
                    <button className={`tab ${activeTab === 'authorities' ? 'active' : ''}`} onClick={() => setActiveTab('authorities')}
                        style={pendingAuthCount > 0 ? { color: '#f59e0b' } : {}}>
                        🏛️ Authorities {pendingAuthCount > 0 ? `(${pendingAuthCount} pending)` : ''}
                    </button>
                )}
            </div>

            {/* ===== OVERVIEW TAB ===== */}
            {activeTab === 'overview' && stats && (
                <div className="animate-fade-in">
                    <div className="stats-grid stagger">
                        <div className="stat-card amber">
                            <div className="stat-icon amber">⏳</div>
                            <div className="stat-value">{stats.pending}</div>
                            <div className="stat-label">Pending Review</div>
                        </div>
                        <div className="stat-card cyan">
                            <div className="stat-icon cyan">🔍</div>
                            <div className="stat-value">{stats.reviewing}</div>
                            <div className="stat-label">Under Review</div>
                        </div>
                        <div className="stat-card green">
                            <div className="stat-icon green">✅</div>
                            <div className="stat-value">{stats.resolved}</div>
                            <div className="stat-label">Resolved</div>
                        </div>
                        <div className="stat-card purple">
                            <div className="stat-icon purple">⚖️</div>
                            <div className="stat-value">{stats.total_fines_count || 0}</div>
                            <div className="stat-label">Fines Issued</div>
                        </div>
                    </div>

                    <div className="stats-grid stagger" style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="stat-card">
                            <div className="stat-icon amber">💰</div>
                            <div className="stat-value">₹{(stats.total_fines_amount || 0).toLocaleString()}</div>
                            <div className="stat-label">Total Fines</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{stats.total_rewards_points}</div>
                            <div className="stat-label">Points Awarded</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon cyan">👤</div>
                            <div className="stat-value">{stats.total_citizens}</div>
                            <div className="stat-label">Active Citizens</div>
                        </div>
                        {user?.role === 'super_admin' && (
                            <div className="stat-card amber">
                                <div className="stat-icon amber">⏳</div>
                                <div className="stat-value">{stats.pending_authorities || 0}</div>
                                <div className="stat-label">Pending Authorities</div>
                            </div>
                        )}
                    </div>

                    <div className="grid-2" style={{ marginTop: 'var(--space-xl)' }}>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>📊 Reports by Category</h3>
                            {stats.by_category?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm) 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                    <span style={{ textTransform: 'capitalize' }}>{item.category.replace('_', ' ')}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>📋 Fine Rules</h3>
                            {FINE_RULES.map((rule, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm) 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                    <span style={{ fontSize: '0.9rem' }}>{rule.label}</span>
                                    <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.9rem' }}>₹{rule.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== REPORTS / POLLUTER TAB ===== */}
            {(activeTab === 'complaints' || activeTab === 'polluter') && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="pending">⏳ Pending</option>
                            <option value="reviewing">🔍 Reviewing</option>
                            <option value="resolved">✅ Resolved</option>
                            <option value="rejected">❌ Rejected</option>
                        </select>
                        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
                            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All Categories</option>
                            <option value="smoke">🌫️ Smoke</option>
                            <option value="burning_waste">🔥 Burning Waste</option>
                            <option value="dust">💨 Dust</option>
                            <option value="industrial">🏭 Industrial</option>
                            <option value="vehicle">🚗 Vehicle</option>
                            <option value="construction">🏗️ Construction</option>
                            <option value="other">📋 Other</option>
                        </select>
                        <select className="form-select" style={{ width: 'auto', minWidth: 140 }}
                            value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="severity">By Severity</option>
                            <option value="upvotes">Most Upvoted</option>
                        </select>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {reports.filter(r => activeTab === 'polluter' ? r.report_type === 'polluter' : true).length} reports
                        </span>
                    </div>

                    {reports.filter(r => activeTab === 'polluter' ? r.report_type === 'polluter' : true).length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No Reports Found</div>
                        </div>
                    ) : (
                        <div className="stagger">
                            {reports.filter(r => activeTab === 'polluter' ? r.report_type === 'polluter' : true).map((report) => {
                                const ss = getStatusStyle(report.status);
                                return (
                                    <div key={report.id} className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-xl)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem',
                                                        fontWeight: 700, textTransform: 'uppercase',
                                                        background: report.report_type === 'polluter' ? 'rgba(249,115,22,0.15)' : 'rgba(6,182,212,0.12)',
                                                        color: report.report_type === 'polluter' ? '#fb923c' : 'var(--accent-primary)'
                                                    }}>
                                                        {report.report_type === 'polluter' ? '⚖️ Polluter' : '🌫️ Issue'}
                                                    </span>
                                                </div>
                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>{report.title}</h3>
                                                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    <span>👤 {report.reporter_name}</span>
                                                    <span>📧 {report.reporter_email}</span>
                                                    {report.city && <span>📍 {report.city}</span>}
                                                    <span>📅 {new Date(report.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                                fontSize: '0.8rem', fontWeight: 600, background: ss.bg, color: ss.color
                                            }}>
                                                {ss.icon} {report.status}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                                            <span className={`report-tag tag-${report.category}`}>{report.category.replace('_', ' ')}</span>
                                            <span style={{ fontSize: '0.85rem' }}>
                                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: getSeverityColor(report.severity), marginRight: 4 }}></span>
                                                {report.severity}
                                            </span>
                                            {report.ai_verified ? (
                                                <span className="ai-badge ai-verified">🤖 AI Verified ({Math.round(report.ai_confidence * 100)}%)</span>
                                            ) : (
                                                <span className="ai-badge ai-unverified">⏳ Not AI Verified</span>
                                            )}
                                        </div>

                                        {report.description && (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
                                                {report.description}
                                            </p>
                                        )}

                                        {report.image_url && (
                                            <img src={report.image_url} alt={report.title}
                                                style={{ maxHeight: 200, borderRadius: 'var(--radius-md)', objectFit: 'cover', marginBottom: 'var(--space-md)' }}
                                                loading="lazy" />
                                        )}

                                        {report.admin_notes && (
                                            <div style={{ padding: 'var(--space-md)', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
                                                <strong style={{ color: 'var(--accent-blue)' }}>📝 Admin Note:</strong> {report.admin_notes}
                                            </div>
                                        )}

                                        {report.reward_amount > 0 && (
                                            <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                🏆 <strong style={{ color: 'var(--accent-green)' }}>+{report.reward_amount} pts</strong> awarded by {report.rewarded_by}
                                            </div>
                                        )}

                                        {report.fine_amount > 0 && (
                                            <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                ⚖️ Fine of <strong style={{ color: '#a78bfa' }}>₹{report.fine_amount.toLocaleString()}</strong> issued
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                                            {report.status !== 'resolved' && report.status !== 'rejected' && (
                                                <button className="btn btn-sm btn-secondary"
                                                    onClick={() => { setStatusModal(report); setStatusData({ status: 'reviewing', admin_notes: '', rejection_reason: '' }); }}
                                                    disabled={actionLoading === report.id}>
                                                    📝 Update Status
                                                </button>
                                            )}

                                            {report.report_type === 'polluter' && report.status !== 'rejected' && !report.fine_amount && (
                                                <button className="btn btn-sm"
                                                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white' }}
                                                    onClick={() => setFineModal(report)}
                                                    disabled={actionLoading === report.id}>
                                                    ⚖️ Apply Fine
                                                </button>
                                            )}

                                            {report.status !== 'rejected' && !report.reward_amount && (
                                                <button className="btn btn-sm"
                                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', marginLeft: 'auto' }}
                                                    onClick={() => setRewardModal(report)}
                                                    disabled={actionLoading === report.id}>
                                                    🏆 Reward
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ===== RESOLUTIONS TAB ===== */}
            {activeTab === 'resolutions' && (
                <div className="animate-fade-in">
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Citizens have uploaded "after" photos as proof of resolution. Verify and award points if valid.
                        </p>
                    </div>
                    {reports.filter(r => r.resolution_image_url).length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-title">No Pending Resolutions</div>
                            <p>Citizens haven't uploaded any resolution proofs yet.</p>
                        </div>
                    ) : (
                        <div className="stagger">
                            {reports.filter(r => r.resolution_image_url).map(report => (
                                <div key={report.id} className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-xl)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{report.title}</h3>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                👤 {report.reporter_name} · 📍 {report.city || 'Unknown'} · {new Date(report.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem',
                                            fontWeight: 600, background: getStatusStyle(report.status).bg, color: getStatusStyle(report.status).color
                                        }}>
                                            {getStatusStyle(report.status).icon} {report.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                                        {report.image_url && (
                                            <div>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', fontWeight: 700, textTransform: 'uppercase' }}>📸 Before</p>
                                                <img src={report.image_url} alt="Before" style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: 200 }} />
                                            </div>
                                        )}
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', fontWeight: 700, textTransform: 'uppercase' }}>✅ After (Uploaded by Citizen)</p>
                                            <img src={report.resolution_image_url} alt="After" style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: 200 }} />
                                        </div>
                                    </div>

                                    {report.status === 'reviewing' && (
                                        <div style={{ display: 'flex', gap: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                                                onClick={() => handleVerifyResolution(report.id, true)}
                                                disabled={actionLoading === report.id}
                                            >
                                                ✅ Verify Resolution (+15 pts)
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleVerifyResolution(report.id, false)}
                                                disabled={actionLoading === report.id}
                                            >
                                                ❌ Reject Proof
                                            </button>
                                        </div>
                                    )}
                                    {report.status === 'resolved' && (
                                        <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', color: 'var(--accent-green)', fontSize: '0.85rem' }}>
                                            ✅ Resolution verified and confirmed
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== FINES TAB ===== */}
            {activeTab === 'fines' && (
                <div className="animate-fade-in">
                    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#a78bfa' }}>{stats?.total_fines_count || 0}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Fines Issued</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-green)' }}>₹{(stats?.total_fines_amount || 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Amount</div>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📜 Fine Records</h3>

                    {fines.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">⚖️</div>
                            <div className="empty-state-title">No Fines Issued Yet</div>
                            <p>Review polluter reports and apply fines from the Polluter tab.</p>
                        </div>
                    ) : (
                        <div className="stagger">
                            {fines.map((fine, i) => (
                                <div key={i} className="card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-lg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{fine.report_title}</div>
                                            {fine.polluter_name && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>🏭 Polluter: {fine.polluter_name}</p>}
                                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                Issued by {fine.issued_by_name} · {new Date(fine.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa' }}>₹{fine.fine_amount.toLocaleString()}</div>
                                            <span style={{
                                                fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                                background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)'
                                            }}>✅ {fine.status}</span>
                                        </div>
                                    </div>
                                    {fine.fine_reason && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
                                            📝 {fine.fine_reason}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== REWARDS TAB ===== */}
            {activeTab === 'rewards' && (
                <div className="animate-fade-in">
                    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-amber)' }}>{stats?.total_rewards_given || 0}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rewards Given</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-green)' }}>{stats?.total_rewards_points || 0}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Points Distributed</div>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-lg)' }}>📜 Recent Rewards</h3>

                    {stats?.recent_rewards?.length > 0 ? (
                        <div className="stagger">
                            {stats.recent_rewards.map((reward, i) => (
                                <div key={i} className="leaderboard-item">
                                    <div style={{ fontSize: '1.5rem' }}>🏆</div>
                                    <div className="leaderboard-avatar">{reward.citizen_name?.charAt(0).toUpperCase()}</div>
                                    <div className="leaderboard-info">
                                        <div className="leaderboard-name">{reward.citizen_name}</div>
                                        <div className="leaderboard-stats">
                                            For: "{reward.report_title}" · {new Date(reward.created_at).toLocaleDateString()}
                                        </div>
                                        {reward.message && <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: 2 }}>💬 {reward.message}</div>}
                                    </div>
                                    <div className="leaderboard-score" style={{ color: 'var(--accent-green)' }}>+{reward.points} pts</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏆</div>
                            <div className="empty-state-title">No Rewards Given Yet</div>
                            <p>Review complaints and reward citizens for their contributions!</p>
                        </div>
                    )}
                </div>
            )}

            {/* ===== AUTHORITIES TAB (Super Admin only) ===== */}
            {activeTab === 'authorities' && user?.role === 'super_admin' && (
                <div className="animate-fade-in">
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: '0.9rem' }}>
                        Review and approve municipal authority registrations. Only approve verified government entities.
                    </p>
                    {authorities.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">🏛️</div>
                            <div className="empty-state-title">No Authorities Registered</div>
                        </div>
                    ) : (
                        <div className="stagger">
                            {authorities.map(auth => (
                                <div key={auth.id} className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-xl)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                                                <div className="leaderboard-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                                                    {auth.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{auth.name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{auth.email}</div>
                                                </div>
                                            </div>
                                            {auth.organisation && (
                                                <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: 8 }}>
                                                    🏛️ {auth.organisation}
                                                </p>
                                            )}
                                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                Applied: {new Date(auth.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                                            <span style={{
                                                padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600,
                                                background: auth.approval_status === 'pending' ? 'rgba(245,158,11,0.15)' :
                                                    auth.approval_status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                                                color: auth.approval_status === 'pending' ? '#f59e0b' :
                                                    auth.approval_status === 'approved' ? '#10b981' : '#f43f5e'
                                            }}>
                                                {auth.approval_status === 'pending' ? '⏳' : auth.approval_status === 'approved' ? '✅' : '❌'} {auth.approval_status}
                                            </span>

                                            {auth.approval_status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                                                        onClick={() => handleAuthorityAction(auth.id, 'approve')}
                                                        disabled={actionLoading === auth.id}
                                                    >
                                                        ✅ Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleAuthorityAction(auth.id, 'reject')}
                                                        disabled={actionLoading === auth.id}
                                                    >
                                                        ❌ Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
