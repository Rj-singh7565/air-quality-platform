import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [particles, setParticles] = useState([]);
    const { login, user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Generate floating particles for background
    useEffect(() => {
        const p = Array.from({ length: 18 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 6 + 2,
            duration: Math.random() * 8 + 6,
            delay: Math.random() * 4,
        }));
        setParticles(p);
    }, []);

    // Redirect if already logged in as admin
    useEffect(() => {
        if (isAuthenticated && user) {
            if (['municipal_admin', 'super_admin'].includes(user.role)) {
                navigate('/admin-dashboard', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userData = await login(email, password);
            if (['municipal_admin', 'super_admin'].includes(userData?.role)) {
                navigate('/admin-dashboard', { replace: true });
            } else {
                setError('Access denied. This portal is for administrators only.');
                // Clear auth since user is not admin
                localStorage.removeItem('aw_token');
                window.location.reload();
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
            if (err.response?.data?.pending) {
                setError('Your municipal authority account is pending approval by the Super Admin.');
            } else if (err.response?.data?.rejected) {
                setError('Your account registration was rejected. Please contact the administrator.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2e 40%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
            {/* Animated background gradient orbs */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
            }}>
                <div style={{
                    position: 'absolute', top: '10%', left: '5%', width: 450, height: 450,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                    animation: 'orb1 8s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
                    animation: 'orb2 10s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', width: 300, height: 300,
                    borderRadius: '50%', transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, rgba(244,63,94,0.06) 0%, transparent 70%)',
                    animation: 'orb3 12s ease-in-out infinite',
                }} />

                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }} />

                {/* Floating particles */}
                {particles.map(p => (
                    <div key={p.id} style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: p.id % 3 === 0
                            ? 'rgba(139,92,246,0.6)'
                            : p.id % 3 === 1
                                ? 'rgba(6,182,212,0.6)'
                                : 'rgba(244,63,94,0.4)',
                        animation: `float ${p.duration}s ${p.delay}s ease-in-out infinite`,
                        boxShadow: `0 0 ${p.size * 2}px currentColor`,
                    }} />
                ))}
            </div>

            {/* Main card */}
            <div style={{
                width: '100%',
                maxWidth: 460,
                position: 'relative',
                zIndex: 10,
                animation: 'slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
                {/* Top accent bar */}
                <div style={{
                    height: 4,
                    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #f43f5e)',
                    borderRadius: '12px 12px 0 0',
                }} />

                {/* Card body */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderTop: 'none',
                    borderRadius: '0 0 16px 16px',
                    padding: '2.5rem',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)',
                }}>
                    {/* Shield Icon + Title */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: 80, height: 80, margin: '0 auto 1.25rem',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))',
                            border: '2px solid rgba(139,92,246,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                            boxShadow: '0 0 30px rgba(139,92,246,0.3)',
                            animation: 'pulse 3s ease-in-out infinite',
                        }}>
                            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z"
                                    fill="url(#shieldGrad)" opacity="0.9" />
                                <path d="M9 12l2 2 4-4" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <defs>
                                    <linearGradient id="shieldGrad" x1="4" y1="2" x2="20" y2="22">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            {/* Rotating ring */}
                            <div style={{
                                position: 'absolute', inset: -6,
                                borderRadius: '50%',
                                border: '2px solid transparent',
                                borderTopColor: 'rgba(139,92,246,0.6)',
                                borderRightColor: 'rgba(6,182,212,0.4)',
                                animation: 'spin 4s linear infinite',
                            }} />
                        </div>

                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '3px 12px',
                            background: 'rgba(244,63,94,0.12)',
                            border: '1px solid rgba(244,63,94,0.3)',
                            borderRadius: 999,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#fb7185',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '1rem',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fb7185', animation: 'blink 1.5s ease-in-out infinite' }} />
                            Restricted Access
                        </div>

                        <h1 style={{
                            fontSize: '1.7rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #e2e8f0, #a78bfa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                        }}>
                            Admin Portal
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                            AirWatch Municipal Control Center
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(244,63,94,0.1)',
                            border: '1px solid rgba(244,63,94,0.25)',
                            borderRadius: 10,
                            color: '#fb7185',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            animation: 'shake 0.3s ease-in-out',
                        }}>
                            <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Admin Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '1.1rem', pointerEvents: 'none',
                                }}>📧</span>
                                <input
                                    id="admin-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="admin@municipality.gov"
                                    required
                                    autoComplete="email"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                        background: 'rgba(30,41,59,0.8)',
                                        border: '1px solid rgba(148,163,184,0.15)',
                                        borderRadius: 10,
                                        color: '#f1f5f9',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onFocus={e => {
                                        e.target.style.borderColor = 'rgba(139,92,246,0.6)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)';
                                        e.target.style.background = 'rgba(51,65,85,0.8)';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = 'rgba(148,163,184,0.15)';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.background = 'rgba(30,41,59,0.8)';
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.75rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#94a3b8',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '1.1rem', pointerEvents: 'none',
                                }}>🔐</span>
                                <input
                                    id="admin-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••"
                                    required
                                    minLength={6}
                                    autoComplete="current-password"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 3rem 0.875rem 2.75rem',
                                        background: 'rgba(30,41,59,0.8)',
                                        border: '1px solid rgba(148,163,184,0.15)',
                                        borderRadius: 10,
                                        color: '#f1f5f9',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onFocus={e => {
                                        e.target.style.borderColor = 'rgba(139,92,246,0.6)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)';
                                        e.target.style.background = 'rgba(51,65,85,0.8)';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = 'rgba(148,163,184,0.15)';
                                        e.target.style.boxShadow = 'none';
                                        e.target.style.background = 'rgba(30,41,59,0.8)';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#64748b', fontSize: '1rem', padding: '4px',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                    onMouseLeave={e => e.target.style.color = '#64748b'}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Submit button */}
                        <button
                            id="admin-login-btn"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.95rem',
                                background: loading
                                    ? 'rgba(139,92,246,0.4)'
                                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                border: 'none',
                                borderRadius: 10,
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.25s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                letterSpacing: '0.02em',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(139,92,246,0.4)',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 28px rgba(139,92,246,0.5)';
                                }
                            }}
                            onMouseLeave={e => {
                                e.target.style.transform = 'none';
                                e.target.style.boxShadow = '0 4px 20px rgba(139,92,246,0.4)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                    Authenticating...
                                </>
                            ) : (
                                <>🛡️ Access Admin Panel</>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        margin: '1.75rem 0',
                    }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.12)' }} />
                        <span style={{ color: '#475569', fontSize: '0.8rem' }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.12)' }} />
                    </div>

                    {/* Links */}
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/login" style={{
                            color: '#64748b', fontSize: '0.875rem', transition: 'color 0.2s',
                            textDecoration: 'none',
                        }}
                            onMouseEnter={e => e.target.style.color = '#94a3b8'}
                            onMouseLeave={e => e.target.style.color = '#64748b'}
                        >
                            ← Back to Citizen Login
                        </Link>
                    </div>

                    {/* Security notice */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(139,92,246,0.06)',
                        border: '1px solid rgba(139,92,246,0.12)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        fontSize: '0.78rem',
                        color: '#64748b',
                        lineHeight: 1.5,
                    }}>
                        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🔒</span>
                        <span>
                            This portal is for <strong style={{ color: '#8b5cf6' }}>authorized municipal administrators</strong> only.
                            Unauthorized access attempts are logged and monitored.
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes orb1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -20px) scale(1.05); }
                    66% { transform: translate(-20px, 15px) scale(0.98); }
                }
                @keyframes orb2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    40% { transform: translate(-25px, 20px) scale(1.08); }
                    70% { transform: translate(20px, -10px) scale(0.96); }
                }
                @keyframes orb3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.15); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
                    50% { transform: translateY(-20px) scale(1.1); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(32px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 30px rgba(139,92,246,0.3); }
                    50% { box-shadow: 0 0 50px rgba(139,92,246,0.5), 0 0 80px rgba(6,182,212,0.2); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
