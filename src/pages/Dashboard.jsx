import React from 'react';
import { Bell, Plus, CheckSquare, ShoppingBag, PieChart, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const userName = "João";

    return (
        <div>
            <header className="dashboard-header">
                <div>
                    <h1>Bom dia, {userName}!</h1>
                    <p className="text-muted text-sm">Aqui está o seu resumo de hoje.</p>
                </div>
                <button className="icon-btn" style={{ position: 'relative' }}>
                    <Bell size={24} />
                    <span style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 8, height: 8, backgroundColor: '#ef4444',
                        borderRadius: '50%', border: '2px solid var(--color-surface)'
                    }}></span>
                </button>
            </header>

            {/* Summary Cards */}
            <div className="dashboard-scroll-container">
                <SummaryCard
                    icon={CheckSquare}
                    title="Tarefas"
                    value="3 Pendentes"
                    className="card-blue"
                    onClick={() => navigate('/tasks')}
                />
                <SummaryCard
                    icon={ShoppingBag}
                    title="Compras"
                    value="5 Itens"
                    className="card-green"
                    onClick={() => navigate('/shopping')}
                />
                <SummaryCard
                    icon={PieChart}
                    title="Finanças"
                    value="2 Contas"
                    sub="Vencendo"
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

            {/* Today's Agenda */}
            <section>
                <h2 className="section-title">Hoje</h2>
                <div className="flex flex-col">
                    <AgendaItem time="14:00" title="Reunião de Projeto" />
                    <AgendaItem time="19:00" title="Aniversário da Ana" />
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

const AgendaItem = ({ time, title }) => (
    <div className="agenda-item">
        <div className="agenda-time">{time}</div>
        <div style={{ fontWeight: 500 }}>{title}</div>
    </div>
);

export default Dashboard;
