import React, { useEffect, useState } from 'react';
import { Bell, Plus, CheckSquare, ShoppingBag, PieChart, Calendar, LogOut } from 'lucide-react';
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
            setUserName(user.email.split('@')[0]); // Simple username from email
        }
    };

    const fetchSummary = async () => {
        try {
            const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false);
            const { count: shopCount } = await supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('bought', false);

            // For finance, maybe count overdue? or just total count. Let's do bills count for now (assuming all expenses are bills to pay if future? generic count for now)
            // Actually the mock said "2 Contas Vencendo". I don't have a due date in transactions, only date. 
            // Let's just count transactions this month.
            const startOfMonth = new Date(); startOfMonth.setDate(1);
            const { count: finCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('date', startOfMonth.toISOString());

            setCounts({ tasks: tasksCount || 0, shopping: shopCount || 0, finance: finCount || 0 });
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // App.jsx will redirect
    };

    return (
        <div className="pb-20">
            <header className="dashboard-header">
                <div>
                    <h1 className="capitalize">Bom dia, {userName || 'Usuário'}!</h1>
                    <p className="text-muted text-sm">Aqui está o seu resumo de hoje.</p>
                </div>
                <div className="flex gap-2">
                    <button className="icon-btn relative">
                        <Bell size={24} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button onClick={handleLogout} className="icon-btn text-red-500 bg-red-50 rounded-full">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="dashboard-scroll-container">
                <SummaryCard
                    icon={CheckSquare}
                    title="Tarefas"
                    value={`${counts.tasks} Pendentes`}
                    className="card-blue"
                    onClick={() => navigate('/tasks')}
                />
                <SummaryCard
                    icon={ShoppingBag}
                    title="Compras"
                    value={`${counts.shopping} Itens`}
                    className="card-green"
                    onClick={() => navigate('/shopping')}
                />
                <SummaryCard
                    icon={PieChart}
                    title="Finanças"
                    value={`${counts.finance} Movim.`}
                    sub="Este Mês"
                    className="card-rose"
                    onClick={() => navigate('/finance')}
                />
            </div>

            {/* Shortcuts */}
            <section style={{ marginBottom: '2rem' }}>
                <h2 className="section-title">Acesso Rápido</h2>
                <div className="shortcuts-grid">
                    <ShortcutButton icon={Plus} label="Nova Tarefa" onClick={() => navigate('/tasks')} />
                    <ShortcutButton icon={Plus} label="Nova Compra" onClick={() => navigate('/shopping')} />
                    <ShortcutButton icon={Calendar} label="Novo Evento" onClick={() => navigate('/planning')} />
                    <ShortcutButton icon={PieChart} label="Nova Despesa" onClick={() => navigate('/finance')} />
                </div>
            </section>

            {/* Today's Agenda - Placeholder for now as fetching complex date query is heavy for dashboard quick view */}
            <section>
                <h2 className="section-title">Hoje</h2>
                <div className="flex flex-col gap-2">
                    <div className="card text-sm text-muted p-4 text-center">
                        Verifique seu planejamento completo.
                    </div>
                </div>
            </section>
        </div>
    );
};

const SummaryCard = ({ icon: Icon, title, value, sub, className, onClick }) => (
    <div className={`summary-card ${className}`} onClick={onClick}>
        <div className="summary-icon">
            <Icon size={20} color="white" />
        </div>
        <div>
            <div className="summary-value">{value}</div>
            {sub && <div className="text-xs" style={{ opacity: 0.9 }}>{sub}</div>}
            <div className="summary-title">{title}</div>
        </div>
    </div>
);

const ShortcutButton = ({ icon: Icon, label, onClick }) => (
    <div className="shortcut-btn" onClick={onClick}>
        <div className="shortcut-icon-circle">
            <Icon size={24} />
        </div>
        <span className="text-sm font-bold">{label}</span>
    </div>
);

export default Dashboard;
