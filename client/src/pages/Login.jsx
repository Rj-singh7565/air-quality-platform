import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-scale-in">
                <div className="auth-header">
                    <div className="auth-logo">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="url(#grad1)" strokeWidth="2.5" fill="none" />
                            <path d="M16 28 C16 20, 24 12, 24 12 C24 12, 32 20, 32 28 C32 32, 28 36, 24 36 C20 36, 16 32, 16 28Z"
                                fill="url(#grad1)" opacity="0.8" />
                            <path d="M20 30 C20 26, 24 20, 24 20 C24 20, 28 26, 28 30 C28 32, 26 34, 24 34 C22 34, 20 32, 20 30Z"
                                fill="#0f172a" />
                            <defs>
                                <linearGradient id="grad1" x1="0" y1="0" x2="48" y2="48">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <h1>AirWatch</h1>
                    </div>
                    <h2 className="auth-title">Welcome Back</h2>
                    <p className="auth-subtitle">Sign in to monitor air quality and report pollution</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
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
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            autoComplete="current-password"
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
                                Signing in...
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
