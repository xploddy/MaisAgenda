import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                alert('Cadastro realizado! Verifique seu e-mail.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-fade-in">
                <div className="login-header">
                    <div className="app-logo">
                        <LayoutGrid size={32} />
                    </div>
                    <h1 className="login-title" style={{ color: 'var(--color-text-main)' }}>
                        {isSignUp ? 'Criar Conta' : '+Agenda'}
                    </h1>
                    <p className="login-subtitle">Gestão Pessoal & Profissional</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleAuth} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="form-input"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-input"
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Carregando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
                    </button>
                </form>

                <div className="login-footer">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="link-btn">
                        {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastrar'}
                    </button>

                    <div className="login-copyright">
                        Alexandre S. © 2026
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;
