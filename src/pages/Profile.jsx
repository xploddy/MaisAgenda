import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, LogOut, Download, Share2, Key, ChevronLeft, Moon, Sun,
    CreditCard, LayoutGrid, Tag, Upload, Settings, Wallet, Target, TrendingUp, Bookmark, ChevronRight, Calculator, Plus, Trash2, Edit2, X, AlertCircle, Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import './Profile.css';

// Generic List Manager for Local Settings (simulating DB tables)
const ListManager = ({ title, storageKey, defaultItems, itemRender, onBack }) => {
    const [items, setItems] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', value: '' });

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) setItems(JSON.parse(stored));
        else setItems(defaultItems);
    }, [storageKey]);

    const saveItems = (newItems) => {
        setItems(newItems);
        localStorage.setItem(storageKey, JSON.stringify(newItems));
    };

    const handleAdd = () => {
        if (!newItem.name) return;
        const updated = [...items, { id: Date.now(), ...newItem }];
        saveItems(updated);
        setNewItem({ name: '', value: '' });
        setIsAddOpen(false);
    };

    const handleDelete = (id) => {
        if (confirm('Tem certeza?')) {
            saveItems(items.filter(i => i.id !== id));
        }
    };

    return (
        <div className="profile-page animate-fade-in">
            <header className="options-header">
                <button className="icon-btn-ghost" onClick={onBack}><ChevronLeft size={24} /></button>
                <h1 className="options-title">{title}</h1>
                <button className="icon-btn-ghost" onClick={() => setIsAddOpen(true)}><Plus size={24} /></button>
            </header>
            <div className="menu-section">
                {items.length === 0 ? <div style={{ padding: '1rem', opacity: 0.5, textAlign: 'center' }}>Nenhum item.</div> :
                    items.map(item => (
                        <div key={item.id} className="menu-item" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                {itemRender ? itemRender(item) : <span className="menu-text">{item.name}</span>}
                            </div>
                            <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem' }}><Trash2 size={18} /></button>
                        </div>
                    ))
                }
            </div>

            {isAddOpen && (
                <div className="modal-overlay" style={{ alignItems: 'flex-end' }}>
                    <div className="modal-content" style={{ borderRadius: '1.5rem 1.5rem 0 0', padding: '1.5rem' }}>
                        <h3 className="modal-title" style={{ marginBottom: '1rem' }}>Novo Item</h3>
                        <input className="input-field" placeholder="Nome" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} autoFocus style={{ marginBottom: '1rem' }} />
                        {storageKey.includes('accounts') || storageKey.includes('goals') || storageKey.includes('invest') ? (
                            <input className="input-field" type="number" placeholder="Valor / Saldo Inicial (R$)" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} style={{ marginBottom: '1rem' }} />
                        ) : null}
                        {storageKey.includes('cards') ? (
                            <input className="input-field" type="number" placeholder="Limite (R$)" value={newItem.value} onChange={e => setNewItem({ ...newItem, value: e.target.value })} style={{ marginBottom: '1rem' }} />
                        ) : null}
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAdd}>Salvar</button>
                        <button className="btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent' }} onClick={() => setIsAddOpen(false)}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Profile Component
const Profile = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [subScreen, setSubScreen] = useState(null);
    const [startDay, setStartDay] = useState(localStorage.getItem('startMonthDay') || '1');
    const [activeTab, setActiveTab] = useState('manager'); // manager, track, about

    // Data for About
    const [userCount, setUserCount] = useState(0); // Dummy stat

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

    // Sub-screens
    if (subScreen === 'categories') return <ListManager title="Categorias" storageKey="user_categories" defaultItems={[{ id: 1, name: 'Alimentação' }, { id: 2, name: 'Moradia' }, { id: 3, name: 'Lazer' }]} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'tags') return <ListManager title="Tags" storageKey="user_tags" defaultItems={[{ id: 1, name: 'Essencial' }, { id: 2, name: 'Supérfluo' }]} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'accounts') return <ListManager title="Contas" storageKey="user_accounts" defaultItems={[{ id: 1, name: 'Carteira', value: '0' }, { id: 2, name: 'Banco Principal', value: '1000' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>R$ {Number(i.value).toFixed(2)}</span></div>} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'cards') return <ListManager title="Cartões de Crédito" storageKey="user_cards" defaultItems={[{ id: 1, name: 'Nubank', value: '5000' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Limite: R$ {Number(i.value).toFixed(2)}</span></div>} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'goals') return <ListManager title="Objetivos" storageKey="user_goals" defaultItems={[{ id: 1, name: 'Viagem', value: '10000' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Meta: R$ {Number(i.value).toFixed(2)}</span></div>} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'investments') return <ListManager title="Investimentos" storageKey="user_investments" defaultItems={[]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>R$ {Number(i.value).toFixed(2)}</span></div>} onBack={() => setSubScreen(null)} />;

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
                <div className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`} onClick={() => setActiveTab('manager')}>Gerenciar</div>
                <div className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>Acompanhar</div>
                <div className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Sobre</div>
            </div>

            {activeTab === 'manager' && (
                <>
                    <div className="menu-section">
                        <button className="menu-item" onClick={() => setSubScreen('accounts')}>
                            <Wallet size={20} className="menu-icon" />
                            <span className="menu-text">Contas</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('cards')}>
                            <CreditCard size={20} className="menu-icon" />
                            <span className="menu-text">Cartões de crédito</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('goals')}>
                            <Target size={20} className="menu-icon" />
                            <span className="menu-text">Objetivos</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('investments')}>
                            <TrendingUp size={20} className="menu-icon" />
                            <span className="menu-text">Investimentos</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                    </div>

                    <div className="menu-section">
                        <button className="menu-item" onClick={() => setSubScreen('categories')}>
                            <Bookmark size={20} className="menu-icon" />
                            <span className="menu-text">Categorias</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('tags')}>
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
                </>
            )}

            {activeTab === 'track' && (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                    <TrendingUp size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3>Em Breve</h3>
                    <p>Relatórios detalhados e insights.</p>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>SmartOrganizer</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Versão 1.0.0</p>
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>O organizador inteligente para sua vida financeira e pessoal.</p>
                    </div>
                </div>
            )}

            <button className="menu-item logout" onClick={handleLogout} style={{ margin: '0 1rem', background: 'transparent', border: 'none' }}>
                <LogOut size={20} />
                <span className="menu-text">Sair do app</span>
            </button>
        </div>
    );
};

export default Profile;
