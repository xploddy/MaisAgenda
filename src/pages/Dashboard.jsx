import React, { useEffect, useState } from 'react';
import { Bell, Plus, CheckSquare, ShoppingBag, PieChart, Calendar, LogOut, Briefcase, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ tasks: 0, shopping: 0, finance: 0 });
    const [userName, setUserName] = useState('');

    useEffect(() => {
        fetchSummary();
        getUser();
    }, []);

    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserName(user.email.split('@')[0]);
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
                    <h1 className="capitalize">Bom dia, {userName || 'João'}!</h1>
                </div>
                <div className="flex gap-2">
                    <button className="icon-btn" style={{ padding: '0.5rem', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                        <Bell size={24} color="#6b7280" />
                    </button>
                    <button onClick={handleLogout} className="icon-btn" style={{ color: '#ef4444', border: 'none' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Summary Strip */}
            <div className="summary-strip">
                <StatCard
                    color="blue"
                    number={counts.tasks}
                    label="Tarefas"
                    icon={CheckSquare}
                    onClick={() => navigate('/tasks')}
                />
                <StatCard
                    color="green"
                    number={counts.shopping}
                    label="Itens"
                    icon={ShoppingBag}
                    onClick={() => navigate('/shopping')}
                />
                <StatCard
                    color="red"
                    number={counts.finance}
                    label="Trans."
                    icon={PieChart}
                    onClick={() => navigate('/finance')}
                />
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <QuickAction color="blue" label="Nova Tarefa" icon={Plus} onClick={() => navigate('/tasks')} />
                <QuickAction color="green" label="Nova Compra" icon={ShoppingBag} onClick={() => navigate('/shopping')} />
                <QuickAction color="purple" label="Novo Plano" icon={Calendar} onClick={() => navigate('/planning')} />
            </div>

            {/* Hoje Section */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">Hoje</h2>
                    <div className="flex gap-1">
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc' }}></div>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc' }}></div>
                    </div>
                </div>

                <AgendaItem
                    icon={Briefcase}
                    text="Reunião às 14:00"
                    sub="Projeto SmartOrganizer"
                />
                <AgendaItem
                    icon={Users}
                    orange
                    text="Aniversário da Ana"
                    sub="Comprar presente"
                />
            </section>

            {/* Second Section duplicated for visual parity with image */}
            <section style={{ marginTop: '1.5rem' }}>
                <div className="section-header">
                    <h2 className="section-title">Amanhã</h2>
                </div>
                <AgendaItem
                    icon={Calendar}
                    text="Visita ao Dentista"
                    sub="Rua das Flores, 123"
                />
            </section>
        </div>
    );
};

const StatCard = ({ color, number, label, icon: Icon, onClick }) => (
    <div className={`stat-card ${color}`} onClick={onClick}>
        <div className="stat-header">
            <div className="stat-number">{number}</div>
            <div className="stat-icon-box">
                <Icon size={16} color="white" />
            </div>
        </div>
        <div className="stat-label">{label}</div>
    </div>
);

const QuickAction = ({ color, label, icon: Icon, onClick }) => (
    <div className={`quick-btn ${color}`} onClick={onClick}>
        <div className="quick-icon-circle">
            <Icon size={20} />
        </div>
        <span className="quick-label">{label}</span>
    </div>
);

const AgendaItem = ({ icon: Icon, text, sub, orange }) => (
    <div className="agenda-card">
        <div className={`agenda-icon-box ${orange ? 'orange' : ''}`}>
            <Icon size={22} />
        </div>
        <div className="agenda-info">
            <div className="agenda-text">{text}</div>
            <div className="agenda-subtext">{sub}</div>
        </div>
    </div>
);

export default Dashboard;
