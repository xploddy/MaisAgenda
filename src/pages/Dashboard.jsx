import React, { useState, useEffect } from 'react';
import { Bell, Plus, CheckSquare, ShoppingBag, Calendar, LogOut, Briefcase, Users, Moon, Sun, X, AlertCircle, Menu, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const Dashboard = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ tasks: 0, shopping: 0, finance: 0 });
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [todayEvents, setTodayEvents] = useState([]);

    useEffect(() => {
        fetchData();
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

    const fetchData = async () => {
        try {
            const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false);
            const { count: shopCount } = await supabase.from('shopping_items').select('*', { count: 'exact', head: true }).eq('bought', false);
            const { count: finCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

            setCounts({ tasks: tasksCount || 0, shopping: shopCount || 0, finance: finCount || 0 });

            const { data: tasks } = await supabase.from('tasks').select('*').eq('completed', false);
            if (tasks) {
                const filtered = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
                setOverdueTasks(filtered);
            }

            const { data: events } = await supabase.from('calendar_events').select('*');
            if (events) {
                const today = events.filter(e => isToday(parseISO(e.start_time)));
                setTodayEvents(today);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const menuItems = [
        { label: 'Meu Perfil', icon: User, onClick: () => navigate('/profile') },
        { label: 'Tema: ' + (currentTheme === 'light' ? 'Escuro' : 'Claro'), icon: currentTheme === 'light' ? Moon : Sun, onClick: () => { toggleTheme(); setShowMenu(false); } },
        { label: 'Sair', icon: LogOut, onClick: async () => { await supabase.auth.signOut(); navigate('/login'); } },
    ];

    return (
        <div className="dashboard-container animate-fade-in">
            <header className="top-bar">
                <div className="user-greeting">
                    <h1>Bom dia,</h1>
                    <h2 className="capitalize">{userData.name}!</h2>
                </div>
                <div className="header-actions">
                    <button className="icon-action-btn" onClick={() => setShowNotifications(true)}>
                        <Bell size={24} color="#6b7280" />
                        {(overdueTasks.length > 0 || todayEvents.length > 0) && <span className="notification-badge"></span>}
                    </button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}>
                        <Menu size={24} color="#6b7280" />
                    </button>
                </div>
            </header>

            {/* Summary Section */}
            <div className="dashboard-summary-grid">
                <StatWidget color="blue" number={counts.tasks} label="Tarefas" icon={CheckSquare} onClick={() => navigate('/tasks')} />
                <StatWidget color="green" number={counts.shopping} label="Compras" icon={ShoppingBag} onClick={() => navigate('/shopping')} />
                <StatWidget color="red" number={counts.finance} label="Financeiro" icon={Calendar} onClick={() => navigate('/finance')} />
            </div>

            {/* Quick Access */}
            <div className="quick-access-strip">
                <QuickBtn label="Nova Tarefa" icon={Plus} onClick={() => navigate('/tasks?add=true')} />
                <QuickBtn label="Nova Compra" icon={ShoppingBag} onClick={() => navigate('/shopping?add=true')} />
                <QuickBtn label="Novo Evento" icon={Calendar} onClick={() => navigate('/planning?add=true')} />
            </div>

            <section className="dashboard-section">
                <div className="section-header">
                    <h2>Agenda de Hoje</h2>
                    <button className="see-all-btn" onClick={() => navigate('/planning')}>Ver tudo</button>
                </div>
                {todayEvents.length === 0 ? (
                    <div className="empty-dashboard-card">
                        <Calendar size={32} />
                        <p>Nenhum compromisso marcado para hoje.</p>
                    </div>
                ) : (
                    todayEvents.map(event => (
                        <CompactAgendaItem key={event.id} icon={event.type === 'work' ? Briefcase : Users} text={event.title} time={format(parseISO(event.start_time), 'HH:mm')} location={event.location} />
                    ))
                )}
            </section>

            {/* Hamburger Menu Overlay */}
            {showMenu && (
                <div className="modal-overlay" onClick={() => setShowMenu(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: 0 }}>
                    <div className="modal-content animate-slide-right" onClick={e => e.stopPropagation()} style={{ width: '280px', height: '100%', borderRadius: 0, padding: '2rem 1.5rem' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Menu</h3>
                            <button className="modal-close-btn" onClick={() => setShowMenu(false)}><X size={20} /></button>
                        </div>
                        <div className="menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {menuItems.map((item, idx) => (
                                <button key={idx} onClick={item.onClick} className="btn" style={{ justifyContent: 'flex-start', background: 'var(--color-bg)', color: 'var(--color-text-main)', width: '100%', gap: '1rem' }}>
                                    <item.icon size={20} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Overlay */}
            {showNotifications && (
                <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Bell size={20} color="var(--color-primary)" /> Notificações</h3>
                            <button className="modal-close-btn" onClick={() => setShowNotifications(false)}><X size={20} /></button>
                        </div>
                        <div className="notification-list">
                            {overdueTasks.length > 0 && (
                                <div className="notif-item overdue">
                                    <AlertCircle size={18} />
                                    <div>Você tem <strong>{overdueTasks.length}</strong> tarefas atrasadas!</div>
                                </div>
                            )}
                            {todayEvents.length > 0 && (
                                <div className="notif-item info">
                                    <Calendar size={18} />
                                    <div>Você tem <strong>{todayEvents.length}</strong> eventos hoje.</div>
                                </div>
                            )}
                            {overdueTasks.length === 0 && todayEvents.length === 0 && (
                                <div className="empty-state">Tudo em dia! ✨</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatWidget = ({ color, number, label, icon: Icon, onClick }) => (
    <div className={`stat-widget ${color}`} onClick={onClick}>
        <div className="widget-top">
            <span className="widget-num">{number}</span>
            <div className="widget-icon"><Icon size={16} color="white" /></div>
        </div>
        <span className="widget-label">{label}</span>
    </div>
);

const QuickBtn = ({ label, icon: Icon, onClick }) => (
    <div className="quick-action-btn" onClick={onClick}>
        <div className="icon-box"><Icon size={20} /></div>
        <span className="label-text">{label}</span>
    </div>
);

const CompactAgendaItem = ({ icon: Icon, text, time, location }) => (
    <div className="compact-agenda-card">
        <div className="icon-wrapper"><Icon size={18} /></div>
        <div className="content">
            <div className="title">{text}</div>
            <div className="subtext">
                {time} {location && <span style={{ marginLeft: '10px', opacity: 0.7 }}><MapPin size={10} /> {location}</span>}
            </div>
        </div>
    </div>
);

export default Dashboard;
