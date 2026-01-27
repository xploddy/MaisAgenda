import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, ShieldCheck, Download, Share2, Key, ChevronLeft, Save, Moon, Sun } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Profile = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserData({
                    name: user.user_metadata?.full_name || user.email.split('@')[0],
                    email: user.email
                });
            }
        };
        getUser();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            data: { full_name: userData.name }
        });
        setLoading(false);
        if (error) alert(error.message);
        else alert('Perfil atualizado!');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!newPassword) return;
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) alert(error.message);
        else alert('Senha alterada!');
        setNewPassword('');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="profile-page animate-fade-in">
            <header className="modal-header" style={{ padding: '1.5rem 0' }}>
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="modal-title">Meu Perfil</h1>
                <div style={{ width: 44 }}></div>
            </header>

            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-bg)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justify-content: 'center' }}>
                    <User size={40} color="var(--color-primary)" />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{userData.name}</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{userData.email}</p>
            </div>

            <section className="dashboard-section">
                <h2 className="section-title">Ajustes da Conta</h2>
                <form onSubmit={handleUpdateProfile} className="card">
                    <label className="form-label">Seu Apelido</label>
                    <div className="input-container">
                        <User size={18} color="var(--color-text-muted)" />
                        <input className="input-field" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        {loading ? 'Salvando...' : 'Salvar Apelido'}
                    </button>
                </form>

                <form onSubmit={handleChangePassword} className="card">
                    <label className="form-label">Mudar Senha</label>
                    <div className="input-container">
                        <Key size={18} color="var(--color-text-muted)" />
                        <input type="password" placeholder="Nova senha" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'var(--color-text-main)' }}>
                        Redefinir Senha
                    </button>
                </form>
            </section>

            <section className="dashboard-section">
                <h2 className="section-title">Dados e Preferências</h2>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button onClick={toggleTheme} className="btn" style={{ justifyContent: 'space-between', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}>
                        <div className="flex gap-2 items-center">
                            {currentTheme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
                            {currentTheme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                        </div>
                    </button>
                    <button className="btn" style={{ justifyContent: 'space-between', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}>
                        <div className="flex gap-2 items-center"><Download size={18}/> Exportar Tarefas</div>
                    </button>
                    <button className="btn" style={{ justifyContent: 'space-between', background: 'var(--color-bg)', color: 'var(--color-text-main)' }}>
                        <div className="flex gap-2 items-center"><Share2 size={18}/> Compartilhar Planos</div>
                    </button>
                </div>
            </section>

            <button onClick={handleLogout} className="btn" style={{ width: '100%', color: 'var(--color-danger)', background: 'transparent', fontWeight: 700, marginTop: '1rem' }}>
                <LogOut size={20} style={{ marginRight: '0.5rem' }} /> Sair da Conta
            </button>
        </div >
    );
};

export default Profile;
