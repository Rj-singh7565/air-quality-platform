import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const statusStyle = (status) => {
    const map = {
        pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '⏳', label: 'Pending' },
        reviewing: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', icon: '🔍', label: 'Under Review' },
        resolved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: '✅', label: 'Resolved' },
        rejected: { bg: 'rgba(244,63,94,0.15)', color: '#f43f5e', icon: '❌', label: 'Rejected' },
    };
    return map[status] || map.pending;
};

const MyReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [uploadingId, setUploadingId] = useState(null);
    const [previewReport, setPreviewReport] = useState(null);
    const [toast, setToast] = useState(null);
    const fileInputRefs = useRef({});

    useEffect(() => {
        fetchReports();
    }, [statusFilter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/my', {
                params: { status: statusFilter || undefined, limit: 50 }
            });
            setReports(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleResolutionUpload = async (reportId, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        setUploadingId(reportId);
        try {
            const formData = new FormData();
            formData.append('resolution_image', file);

            const res = await api.post(`/reports/${reportId}/resolve`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast(res.data.message || 'Resolution proof uploaded successfully!');
            fetchReports();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to upload resolution proof', 'error');
        } finally {
            setUploadingId(null);
        }
    };

    const getTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    return (
        <div className="animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>{toast.message}</div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewReport && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(8px)', padding: 'var(--space-xl)'
                }} onClick={() => setPreviewReport(null)}>
                    <div style={{ maxWidth: 700, width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="card" style={{ padding: 'var(--space-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                                <h3 style={{ fontWeight: 700 }}>{previewReport.title}</h3>
                                <button onClick={() => setPreviewReport(null)} style={{
                                    background: 'none', border: 'none', color: 'var(--text-muted)',
                                    fontSize: '1.4rem', cursor: 'pointer'
                                }}>✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                                {previewReport.image_url && (
                                    <div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>📸 BEFORE (Original Report)</p>
                                        <img src={previewReport.image_url} alt="Before" style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: 250 }} />
                                    </div>
                                )}
                                {previewReport.resolution_image_url && (
                                    <div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>✅ AFTER (Resolution Proof)</p>
                                        <img src={previewReport.resolution_image_url} alt="After" style={{ width: '100%', borderRadius: 'var(--radius-md)', objectFit: 'cover', maxHeight: 250 }} />
                                    </div>
                                )}
                            </div>
                            {previewReport.rejection_reason && (
                                <div style={{
                                    marginTop: 'var(--space-lg)', padding: 'var(--space-md)',
                                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                                    borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: '#f87171'
                                }}>
                                    ❌ <strong>Rejection Reason:</strong> {previewReport.rejection_reason}
                                </div>
                            )}
                            {previewReport.admin_notes && (
                                <div style={{
                                    marginTop: 'var(--space-md)', padding: 'var(--space-md)',
                                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                    borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: '#93c5fd'
                                }}>
                                    📝 <strong>Admin Note:</strong> {previewReport.admin_notes}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <h1 className="page-title">📋 My Reports</h1>
                <p className="page-subtitle">
                    Track all your submitted reports. Upload resolution proof to mark issues as solved.
                </p>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'center' }}>
                {['', 'pending', 'reviewing', 'resolved', 'rejected'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        {s === '' ? '🔍 All' : `${statusStyle(s).icon} ${statusStyle(s).label}`}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {reports.length} report{reports.length !== 1 ? 's' : ''}
                </span>
            </div>

            {loading ? (
                <div className="loading-spinner" style={{ height: '40vh' }}>
                    <div className="spinner"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No Reports Found</div>
                    <p>
                        {statusFilter ? `No ${statusFilter} reports found.` : "You haven't submitted any reports yet."}
                    </p>
                </div>
            ) : (
                <div className="stagger">
                    {reports.map(report => {
                        const style = statusStyle(report.status);
                        const canUploadResolution = ['pending', 'reviewing'].includes(report.status) && !report.resolution_image_url;

                        return (
                            <div key={report.id} className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-xl)' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 6 }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                                                background: report.report_type === 'polluter' ? 'rgba(249,115,22,0.15)' : 'rgba(6,182,212,0.15)',
                                                color: report.report_type === 'polluter' ? '#fb923c' : 'var(--accent-primary)'
                                            }}>
                                                {report.report_type === 'polluter' ? '⚖️ Polluter' : '🌫️ Issue'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {getTimeAgo(report.created_at)}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{report.title}</h3>
                                        {report.city && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>📍 {report.city}</p>}
                                    </div>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.8rem', fontWeight: 600,
                                        background: style.bg, color: style.color, whiteSpace: 'nowrap'
                                    }}>
                                        {style.icon} {style.label}
                                    </span>
                                </div>

                                {/* Rejection reason shown to citizen */}
                                {report.status === 'rejected' && report.rejection_reason && (
                                    <div style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                                        fontSize: '0.85rem', color: '#f87171'
                                    }}>
                                        ❌ <strong>Rejection reason:</strong> {report.rejection_reason}
                                    </div>
                                )}

                                {/* Admin note */}
                                {report.admin_notes && (
                                    <div style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                                        fontSize: '0.85rem', color: '#93c5fd'
                                    }}>
                                        📝 <strong>Authority note:</strong> {report.admin_notes}
                                    </div>
                                )}

                                {/* Fine badge */}
                                {report.fine_amount > 0 && (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)',
                                        padding: '4px 12px', background: 'rgba(139,92,246,0.12)',
                                        border: '1px solid rgba(139,92,246,0.2)', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.82rem', color: '#a78bfa', marginBottom: 'var(--space-md)'
                                    }}>
                                        ⚖️ Fine of ₹{report.fine_amount.toLocaleString()} issued
                                    </div>
                                )}

                                {/* Reward badge */}
                                {report.reward_amount > 0 && (
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)',
                                        padding: '4px 12px', background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-full)',
                                        fontSize: '0.82rem', color: 'var(--accent-green)', marginBottom: 'var(--space-md)'
                                    }}>
                                        🏆 +{report.reward_amount} pts rewarded
                                    </div>
                                )}

                                {/* Resolution proof status */}
                                {report.resolution_image_url && (
                                    <div style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)',
                                        fontSize: '0.85rem', color: 'var(--accent-amber)'
                                    }}>
                                        🔍 Resolution proof uploaded — awaiting authority verification
                                    </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setPreviewReport(report)}
                                    >
                                        👁️ View Details
                                    </button>

                                    {/* Upload resolution proof - camera only */}
                                    {canUploadResolution && (
                                        <>
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white' }}
                                                onClick={() => fileInputRefs.current[report.id]?.click()}
                                                disabled={uploadingId === report.id}
                                            >
                                                {uploadingId === report.id ? (
                                                    <>
                                                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                                                        Uploading...
                                                    </>
                                                ) : '📸 Upload "After" Proof'}
                                            </button>
                                            <input
                                                ref={el => fileInputRefs.current[report.id] = el}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                capture="environment"
                                                style={{ display: 'none' }}
                                                onChange={(e) => handleResolutionUpload(report.id, e.target.files[0])}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyReports;
