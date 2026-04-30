import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('user');
    const [organisation, setOrganisation] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (role === 'municipal_admin' && !organisation.trim()) {
            setError('Please provide your municipality / organisation name');
            return;
        }

        setLoading(true);
        try {
            if (role === 'municipal_admin') {
                // Municipal authority — register via direct API (no auto-login, pending approval)
                const res = await api.post('/auth/register', { name, email, password, role, organisation });
                if (res.data.data?.pending) {
                    setPendingApproval(true);
                } else {
                    navigate('/');
                }
            } else {
                await register(name, email, password);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (pendingApproval) {
        return (
            <div className="auth-container">
                <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>⏳</div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 'var(--space-md)', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Registration Submitted!
                    </h2>
                    <div style={{
                        padding: 'var(--space-lg)', background: 'rgba(6,182,212,0.08)',
                        border: '1px solid rgba(6,182,212,0.25)', borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-xl)'
                    }}>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>
                            Your <strong style={{ color: 'var(--accent-primary)' }}>Municipal Authority</strong> account is pending approval by the Super Admin.
                        </p>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                            Once approved, you'll be able to log in and access the full admin panel to review, verify, and act on citizen reports.
                        </p>
                    </div>
                    <div style={{
                        display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap',
                        justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-muted)',
                        marginBottom: 'var(--space-xl)'
                    }}>
                        <span>✅ Identity Verification</span>
                        <span>·</span>
                        <span>✅ Authority Validation</span>
                        <span>·</span>
                        <span>⏳ Admin Approval</span>
                    </div>
                    <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card animate-scale-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="url(#grad2)" strokeWidth="2.5" fill="none" />
                            <path d="M16 28 C16 20, 24 12, 24 12 C24 12, 32 20, 32 28 C32 32, 28 36, 24 36 C20 36, 16 32, 16 28Z"
                                fill="url(#grad2)" opacity="0.8" />
                            <path d="M20 30 C20 26, 24 20, 24 20 C24 20, 28 26, 28 30 C28 32, 26 34, 24 34 C22 34, 20 32, 20 30Z"
                                fill="#0f172a" />
                            <defs>
                                <linearGradient id="grad2" x1="0" y1="0" x2="48" y2="48">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <h1>AirWatch</h1>
                    </div>
                    <h2 className="auth-title">Create Your Account</h2>
                    <p className="auth-subtitle">Join the community. Report pollution. Earn rewards.</p>
                </div>

                {/* Role Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    <button
                        type="button"
                        onClick={() => setRole('user')}
                        style={{
                            padding: 'var(--space-md)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${role === 'user' ? 'var(--accent-primary)' : 'rgba(148,163,184,0.2)'}`,
                            background: role === 'user' ? 'rgba(6,182,212,0.1)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>👤</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: role === 'user' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Citizen</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Report pollution, earn rewards</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('municipal_admin')}
                        style={{
                            padding: 'var(--space-md)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${role === 'municipal_admin' ? '#8b5cf6' : 'rgba(148,163,184,0.2)'}`,
                            background: role === 'municipal_admin' ? 'rgba(139,92,246,0.1)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>🏛️</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: role === 'municipal_admin' ? '#8b5cf6' : 'var(--text-primary)' }}>Municipal Authority</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Requires admin approval</div>
                    </button>
                </div>

                {role === 'municipal_admin' && (
                    <div style={{
                        padding: 'var(--space-md)', background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--accent-amber)'
                    }}>
                        ⚠️ Municipal authority accounts require Super Admin approval before you can log in. You'll be notified once your account is reviewed.
                    </div>
                )}

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            className="form-input"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    {role === 'municipal_admin' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="organisation">Municipality / Organisation *</label>
                            <input
                                id="organisation"
                                className="form-input"
                                type="text"
                                value={organisation}
                                onChange={(e) => setOrganisation(e.target.value)}
                                placeholder="e.g., Delhi Municipal Corporation"
                                required={role === 'municipal_admin'}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email Address</label>
                        <input
                            id="reg-email"
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <input
                            id="reg-password"
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                        <input
                            id="confirm-password"
                            className="form-input"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                                {role === 'municipal_admin' ? 'Submitting application...' : 'Creating account...'}
                            </>
                        ) : (
                            role === 'municipal_admin' ? '🏛️ Submit Authority Application' : '🚀 Create Citizen Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
