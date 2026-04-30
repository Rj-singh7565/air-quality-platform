import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState } from 'react';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportPollution from './pages/ReportPollution';
import Hotspots from './pages/Hotspots';
import Predictions from './pages/Predictions';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import MyReports from './pages/MyReports';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-spinner" style={{ height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-spinner" style={{ height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!['municipal_admin', 'super_admin'].includes(user?.role)) return <Navigate to="/" replace />;
    return children;
};

const AirWatchLogo = () => (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="url(#logoGrad)" strokeWidth="2.5" fill="none" />
        <path d="M16 28 C16 20, 24 12, 24 12 C24 12, 32 20, 32 28 C32 32, 28 36, 24 36 C20 36, 16 32, 16 28Z"
            fill="url(#logoGrad)" opacity="0.8" />
        <path d="M20 30 C20 26, 24 20, 24 20 C24 20, 28 26, 28 30 C28 32, 26 34, 24 34 C22 34, 20 32, 20 30Z"
            fill="#0f172a" />
        <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
        </defs>
    </svg>
);

const citizenNavItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/report', label: 'Report Pollution', icon: '📸' },
    { path: '/my-reports', label: 'My Reports', icon: '📋' },
    { path: '/hotspots', label: 'Hotspots', icon: '🔥' },
    { path: '/predictions', label: 'Predictions', icon: '📈' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { path: '/profile', label: 'My Profile', icon: '👤' },
];

const AppLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <>
            {/* Mobile Header */}
            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                    ☰
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AirWatchLogo />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        AirWatch
                    </span>
                </div>
                <div style={{ width: 40 }}></div>
            </div>

            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <div className="app-layout">
                {/* Sidebar */}
                <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-logo">
                        <AirWatchLogo />
                        <h1>AirWatch</h1>
                    </div>

                    <div className="sidebar-nav">
                        {/* Citizen nav items (hidden for admin-only roles) */}
                        {user?.role !== 'municipal_admin' && user?.role !== 'super_admin' && citizenNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setSidebarOpen(false)}
                                end={item.path === '/'}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}

                        {/* If citizen, also show dashboard */}
                        {(user?.role === 'municipal_admin' || user?.role === 'super_admin') && (
                            <>
                                <NavLink
                                    to="/"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                    end
                                >
                                    <span style={{ fontSize: '1.1rem' }}>📊</span>
                                    Dashboard
                                </NavLink>
                                <NavLink
                                    to="/leaderboard"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🏆</span>
                                    Leaderboard
                                </NavLink>
                            </>
                        )}

                        {/* Admin section */}
                        {(user?.role === 'municipal_admin' || user?.role === 'super_admin') && (
                            <>
                                <div style={{
                                    margin: 'var(--space-md) var(--space-md) var(--space-xs)',
                                    padding: 'var(--space-xs) 0',
                                    borderTop: '1px solid rgba(148,163,184,0.15)',
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: 'var(--text-muted)'
                                }}>
                                    {user?.role === 'super_admin' ? 'Super Admin' : 'Admin Panel'}
                                </div>
                                <NavLink
                                    to="/admin"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                                    Municipal Panel
                                </NavLink>
                            </>
                        )}
                    </div>

                    {user && (
                        <div className="sidebar-user">
                            <div className="sidebar-user-info">
                                <div className="sidebar-user-avatar">
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="sidebar-user-name">{user.name}</div>
                                    <div className="sidebar-user-score">
                                        {user.role === 'super_admin'
                                            ? '🛡️ Super Admin'
                                            : user.role === 'municipal_admin'
                                                ? `🏛️ ${user.organisation || 'Municipal Auth'}`
                                                : `⭐ ${user.contribution_score || 0} pts`
                                        }
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                style={{
                                    width: '100%', marginTop: 'var(--space-sm)', padding: '8px',
                                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                                    borderRadius: 'var(--radius-md)', color: '#f87171', cursor: 'pointer',
                                    fontSize: '0.8rem', transition: 'all 0.2s'
                                }}
                            >
                                🚪 Sign Out
                            </button>
                        </div>
                    )}
                </nav>

                {/* Main Content */}
                <main className="main-content">
                    {children}
                </main>
            </div>
        </>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <AppLayout><Dashboard /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/report" element={
                        <ProtectedRoute>
                            <AppLayout><ReportPollution /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/my-reports" element={
                        <ProtectedRoute>
                            <AppLayout><MyReports /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/hotspots" element={
                        <ProtectedRoute>
                            <AppLayout><Hotspots /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/predictions" element={
                        <ProtectedRoute>
                            <AppLayout><Predictions /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/leaderboard" element={
                        <ProtectedRoute>
                            <AppLayout><Leaderboard /></AppLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <AppLayout><Profile /></AppLayout>
                        </ProtectedRoute>
                    } />

                    <Route path="/admin" element={
                        <AdminRoute>
                            <AppLayout><AdminPanel /></AppLayout>
                        </AdminRoute>
                    } />

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
