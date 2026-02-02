import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, LogOut, Download, Share2, Key, ChevronLeft, Moon, Sun,
    CreditCard, LayoutGrid, Tag, Upload, Settings, Wallet, Target, TrendingUp, Bookmark, ChevronRight, Calculator
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import './Profile.css';

const Profile = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [subScreen, setSubScreen] = useState(null); // 'settings', 'about'
    const [startDay, setStartDay] = useState(localStorage.getItem('startMonthDay') || '1');

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

    const handleExport = async () => {
        try {
            const { data: trans, error } = await supabase.from('transactions').select('*');
            if (error) throw error;
            if (!trans || trans.length === 0) return alert('Sem dados para exportar.');

            const ws = XLSX.utils.json_to_sheet(trans);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
            XLSX.writeFile(wb, "SmartOrganizer_Financeiro.xlsx");
        } catch (e) {
            alert('Erro ao exportar: ' + e.message);
        }
    };

    const handleSaveStartDay = (val) => {
        setStartDay(val);
        localStorage.setItem('startMonthDay', val);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (subScreen === 'settings') {
        return (
            <div className="profile-page animate-fade-in">
                <header className="options-header">
                    <button className="icon-btn-ghost" onClick={() => setSubScreen(null)}><ChevronLeft size={24} /></button>
                    <h1 className="options-title">Preferências</h1>
                    <div style={{ width: 24 }}></div>
                </header>

                <div className="menu-section">
                    <div className="menu-item" onClick={toggleTheme}>
                        <div className="menu-icon">{currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</div>
                        <div className="menu-text">Tema {currentTheme === 'light' ? 'Escuro' : 'Claro'}</div>
                        {currentTheme === 'light' ? <div className="toggle-switch off"></div> : <div className="toggle-switch on" style={{ width: 40, height: 20, background: 'var(--color-primary)', borderRadius: 20 }}></div>}
                    </div>
                </div>

                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Configuração Financeira</h3>
                    <div className="card">
                        <label className="form-label">Dia de Início do Mês</label>
                        <div className="input-container">
                            <Calculator size={18} color="var(--color-text-muted)" />
                            <select className="input-field" value={startDay} onChange={(e) => handleSaveStartDay(e.target.value)}>
                                {[1, 5, 10, 15, 20, 25].map(d => (
                                    <option key={d} value={d}>Dia {d}</option>
                                ))}
                            </select>
                        </div>
                        <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>Define quando suas metas e orçamentos reiniciam.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page animate-fade-in">
            <header className="options-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="options-title">Mais Opções</h1>
                <div style={{ width: 24 }}>
                    <Settings size={22} className="clickable" onClick={() => setSubScreen('settings')} />
                </div>
            </header>

            <div className="tabs-container">
                <div className="tab-btn active">Gerenciar</div>
                <div className="tab-btn">Acompanhar</div>
                <div className="tab-btn">Sobre</div>
            </div>

            <div className="menu-section">
                <button className="menu-item">
                    <Wallet size={20} className="menu-icon" />
                    <span className="menu-text">Contas</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
                <button className="menu-item">
                    <CreditCard size={20} className="menu-icon" />
                    <span className="menu-text">Cartões de crédito</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
                <button className="menu-item">
                    <Target size={20} className="menu-icon" />
                    <span className="menu-text">Objetivos</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
                <button className="menu-item">
                    <TrendingUp size={20} className="menu-icon" />
                    <span className="menu-text">Investimentos</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
            </div>

            <div className="menu-section">
                <button className="menu-item">
                    <Bookmark size={20} className="menu-icon" />
                    <span className="menu-text">Categorias</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
                <button className="menu-item">
                    <Tag size={20} className="menu-icon" />
                    <span className="menu-text">Tags</span>
                    <ChevronRight size={16} style={{ opacity: 0.4 }} />
                </button>
            </div>

            <div className="menu-section">
                <button className="menu-item">
                    <Upload size={20} className="menu-icon" />
                    <span className="menu-text">Importar dados</span>
                </button>
                <button className="menu-item" onClick={handleExport}>
                    <Download size={20} className="menu-icon" />
                    <span className="menu-text">Exportar financeiro</span>
                </button>
            </div>

            <button className="menu-item logout" onClick={handleLogout} style={{ margin: '0 1rem', background: 'transparent', border: 'none' }}>
                <LogOut size={20} />
                <span className="menu-text">Sair do app</span>
            </button>
        </div>
    );
};

export default Profile;
