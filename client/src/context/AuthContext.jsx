import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('aw_token'));
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const res = await api.get('/auth/me');
            setUser(res.data.data);
        } catch (error) {
            console.error('Failed to load user:', error);
            localStorage.removeItem('aw_token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: userData, token: newToken } = res.data.data;

        localStorage.setItem('aw_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);

        return userData;
    };

    const register = async (name, email, password, role = 'user', organisation = null) => {
        const res = await api.post('/auth/register', { name, email, password, role, organisation });
        const { user: userData, token: newToken, pending } = res.data.data;

        // Municipal admins are pending - don't set token/user
        if (pending || !newToken) {
            return { pending: true, user: userData };
        }

        localStorage.setItem('aw_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);

        return userData;
    };

    const logout = () => {
        localStorage.removeItem('aw_token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const updateUser = (updates) => {
        setUser(prev => ({ ...prev, ...updates }));
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
