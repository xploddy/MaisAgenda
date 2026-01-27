import React, { useEffect, useState } from 'react';
import { Bell, Plus, CheckSquare, ShoppingBag, Calendar, LogOut, Briefcase, Users, Moon, Sun, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const Dashboard = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ tasks: 0, shopping: 0, finance: 0 });
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        fetchSummary();
        getUser();
    }, []);

    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserData({
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email
            });
        }
    };

    const fetchSummary = async () => {
        try {
            const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false);
            const { count: shopCount } = await supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('bought', false);
            const { count: finCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

            setCounts({ tasks: tasksCount || 0, shopping: shopCount || 0, finance: finCount || 0 });
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="dashboard-container animate-fade-in">
            <header className="top-bar">
                <div>
                    <h1 className="capitalize" style={{ color: 'var(--color-text-main)' }}>
                        Bom dia, {userData.name}!
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button className="icon-btn" onClick={toggleTheme} style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}>
                        {currentTheme === 'light' ? <Moon size={22} color="#6b7280" /> : <Sun size={22} color="#facc15" />}
                    </button>
                    <button className="icon-btn" onClick={() => setShowNotifications(true)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', position: 'relative' }}>
                        <Bell size={24} color="#6b7280" />
                        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid var(--color-surface)' }}></span>
                    </button>
                    <button onClick={handleLogout} className="icon-btn" style={{ color: '#ef4444', border: 'none', background: 'transparent' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Summary Strip */}
            <div className="summary-strip">
                <StatCard color="blue" number={counts.tasks} label="Tarefas" icon={CheckSquare} onClick={() => navigate('/tasks')} />
                <StatCard color="green" number={counts.shopping} label="Itens" icon={ShoppingBag} onClick={() => navigate('/shopping')} />
                <StatCard color="red" number={counts.finance} label="Trans." icon={Calendar} onClick={() => navigate('/finance')} />
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <QuickAction color="blue" label="Nova Tarefa" icon={Plus} onClick={() => navigate('/tasks')} />
                <QuickAction color="green" label="Nova Compra" icon={ShoppingBag} onClick={() => navigate('/shopping')} />
                <QuickAction color="purple" label="Novo Plano" icon={Calendar} onClick={() => navigate('/planning')} />
            </div>

            {/* Agenda */}
            <section>
                <div className="section-header">
                    <h2 className="section-title" style={{ color: 'var(--color-text-main)' }}>Hoje</h2>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
                    <Calendar size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p className="text-sm">Confira seu planejamento detalhado na aba de Planos.</p>
                </div>
            </section>

            {/* Notifications Modal */}
            {showNotifications && (
                <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '1.5rem' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Notificações</h3>
                            <button onClick={() => setShowNotifications(false)}><X size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="card" style={{ padding: '0.75rem', marginBottom: 0, borderLeft: '4px solid #3b82f6' }}>
                                <div className="font-semibold text-sm">Bem-vindo(a)!</div>
                                <div className="text-xs text-muted">O SmartOrganizer está pronto para te ajudar.</div>
                            </div>
                            <div className="card" style={{ padding: '0.75rem', marginBottom: 0, borderLeft: '4px solid #10b981' }}>
                                <div className="font-semibold text-sm">Meta Diária</div>
                                <div className="text-xs text-muted">Você tem {counts.tasks} tarefas pendentes hoje.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ color, number, label, icon: Icon, onClick }) => (
    <div className={`stat-card ${color}`} onClick={onClick}>
        <div className="stat-header">
            <div className="stat-number">{number}</div>
            <div className="stat-icon-box"><Icon size={16} color="white" /></div>
        </div>
        <div className="stat-label">{label}</div>
    </div>
);

const QuickAction = ({ color, label, icon: Icon, onClick }) => (
    <div className={`quick-btn ${color}`} onClick={onClick}>
        <div className="quick-icon-circle"><Icon size={20} /></div>
        <span className="quick-label">{label}</span>
    </div>
);

export default Dashboard;
