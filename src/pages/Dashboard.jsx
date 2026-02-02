import React, { useState, useEffect } from 'react';
import { Bell, Plus, CheckSquare, Calendar, LogOut, Briefcase, Users, Moon, Sun, X, AlertCircle, Menu, User, Clock, MapPin, TrendingUp, CreditCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, parseISO, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

const Dashboard = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ tasks: 0, finance: 0 });
    const [userData, setUserData] = useState({ name: '', email: '' });
    const [showNotifications, setShowNotifications] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Data State
    const [overdueTasks, setOverdueTasks] = useState([]);
    const [pendingTasks, setPendingTasks] = useState([]); // Replaces TodayEvents list in main view
    const [todayEvents, setTodayEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [activeReminders, setActiveReminders] = useState([]);
    const [toastNotifications, setToastNotifications] = useState([]);
    const [dismissedReminders, setDismissedReminders] = useState(new Set());
    const [snoozedReminders, setSnoozedReminders] = useState(new Map());
    const [toastedEventIds, setToastedEventIds] = useState(new Set());

    useEffect(() => {
        const interval = setInterval(() => {
            if (allEvents.length > 0) {
                checkReminders(allEvents);
            }
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [allEvents, dismissedReminders, snoozedReminders, toastedEventIds]);

    const checkReminders = (eventsList) => {
        const now = new Date();
        const active = [];
        const newToasts = [];

        eventsList.forEach(event => {
            if (event.reminder_minutes && event.reminder_minutes > 0) {
                const eventStart = parseISO(event.start_time);
                const minutesUntil = differenceInMinutes(eventStart, now);
                const reminderThreshold = event.reminder_minutes;

                const snoozeTime = snoozedReminders.get(event.id);
                if (snoozeTime && snoozeTime > now) return;

                if (minutesUntil > 0 && minutesUntil <= reminderThreshold && !dismissedReminders.has(event.id)) {
                    const reminder = {
                        id: event.id,
                        title: event.title,
                        startTime: eventStart,
                        minutesUntil,
                        location: event.location,
                        type: event.type
                    };
                    active.push(reminder);

                    if (!toastedEventIds.has(event.id)) {
                        newToasts.push(reminder);
                    }
                }
            }
        });

        setActiveReminders(active);

        if (newToasts.length > 0) {
            setToastNotifications(prev => [...prev, ...newToasts]);
            setToastedEventIds(prev => new Set([...prev, ...newToasts.map(t => t.id)]));

            newToasts.forEach(t => {
                setTimeout(() => {
                    setToastNotifications(prev => prev.filter(item => item.id !== t.id));
                }, 8000);
            });
        }
    };

    const dismissReminder = (id) => {
        setDismissedReminders(prev => new Set([...prev, id]));
        setActiveReminders(prev => prev.filter(r => r.id !== id));
        setToastNotifications(prev => prev.filter(r => r.id !== id));
    };

    const snoozeReminder = (id) => {
        const snoozeUntil = new Date(new Date().getTime() + 10 * 60000);
        setSnoozedReminders(prev => new Map(prev).set(id, snoozeUntil));
        setActiveReminders(prev => prev.filter(r => r.id !== id));
        setToastNotifications(prev => prev.filter(r => r.id !== id));
    };

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
            // Counts
            const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false);

            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const { count: finCount } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .gte('date', startOfCurrentMonth)
                .lte('date', endOfCurrentMonth);

            setCounts({ tasks: tasksCount || 0, finance: finCount || 0 });

            // Tasks Data
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('completed', false)
                .order('due_date', { ascending: true }); // Most urgent first

            if (tasks) {
                const overdue = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
                setOverdueTasks(overdue);

                // Set pending tasks for main list (top 4)
                setPendingTasks(tasks.slice(0, 4));
            }

            // Events Data
            const { data: events } = await supabase.from('calendar_events').select('*');
            if (events) {
                const today = events.filter(e => isToday(parseISO(e.start_time)));
                setTodayEvents(today);
                setAllEvents(events);
                checkReminders(events);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="dashboard-container animate-fade-in">
            <header className="top-bar-modern">
                <div className="user-greeting">
                    <h1 style={{ fontSize: '1rem', opacity: 0.7, fontWeight: 600 }}>Bom dia,</h1>
                    <h2 className="capitalize" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{userData.name}!</h2>
                </div>
                <div className="header-actions">
                    <button className="icon-action-btn" onClick={() => setShowNotifications(true)}>
                        <Bell size={24} />
                        {(overdueTasks.length > 0 || todayEvents.length > 0 || activeReminders.length > 0) && <span className="notification-badge"></span>}
                    </button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}>
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            {/* Summary Section */}
            <div className="dashboard-summary-grid">
                <StatWidget color="blue" number={counts.tasks} label="Tarefas" icon={CheckSquare} onClick={() => navigate('/tasks')} />
                <StatWidget color="green" number={todayEvents.length} label="Agenda Hoje" icon={Calendar} onClick={() => navigate('/planning')} />
                <StatWidget color="red" number={counts.finance} label="Financeiro" icon={TrendingUp} onClick={() => navigate('/finance')} />
            </div>

            {/* Quick Access */}
            <div className="quick-access-strip">
                <QuickBtn label="Nova Tarefa" icon={Plus} onClick={() => navigate('/tasks?add=true')} />
                <QuickBtn label="Novo Evento" icon={Calendar} onClick={() => navigate('/planning?add=true')} />
                <QuickBtn label="Perfil" icon={User} onClick={() => navigate('/profile')} />
            </div>

            {/* REPLACED SECTION: Pending Tasks instead of Today's Agenda */}
            <section className="dashboard-section">
                <div className="section-header">
                    <h2>Tarefas Pendentes</h2>
                    <button className="see-all-btn" onClick={() => navigate('/tasks')}>Ver todas</button>
                </div>
                {pendingTasks.length === 0 ? (
                    <div className="empty-dashboard-card">
                        <CheckSquare size={32} />
                        <p>Nenhuma tarefa pendente. ✨</p>
                    </div>
                ) : (
                    pendingTasks.map(task => {
                        const d = task.due_date ? parseISO(task.due_date) : null;
                        const isOverdue = d && isPast(d) && !isToday(d);

                        return (
                            <div key={task.id} className="compact-agenda-card" onClick={() => navigate('/tasks')}>
                                <div className={`icon-wrapper ${isOverdue ? 'overdue-icon' : ''}`} style={{ background: isOverdue ? 'rgba(239,68,68,0.1)' : 'var(--color-bg-secondary)' }}>
                                    {isOverdue ? <AlertCircle size={18} color="#ef4444" /> : <CheckSquare size={18} />}
                                </div>
                                <div className="content">
                                    <div className="title" style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                                    <div className="subtext" style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>
                                        {d ? (isToday(d) ? 'Hoje' : format(d, "dd 'de' MMM", { locale: ptBR })) : 'Sem data'}
                                    </div>
                                </div>
                                <ChevronRight size={16} style={{ opacity: 0.3 }} />
                            </div>
                        );
                    })
                )}
            </section>

            {/* SIDEBAR MENU */}
            {showMenu && (
                <div className="modal-overlay" onClick={() => setShowMenu(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: 0 }}>
                    <div className="modal-content animate-slide-right" onClick={e => e.stopPropagation()} style={{ width: '280px', height: '100%', borderRadius: 0, padding: '2rem 1.5rem' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Menu</h3>
                            <button className="modal-close-btn" onClick={() => setShowMenu(false)}><X size={20} /></button>
                        </div>
                        <div className="menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => navigate('/profile')} className="btn menu-btn">
                                <User size={20} /> Meu Perfil
                            </button>
                            <button onClick={() => { toggleTheme(); setShowMenu(false); }} className="btn menu-btn">
                                {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />} Tema {currentTheme === 'light' ? 'Escuro' : 'Claro'}
                            </button>
                            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn menu-btn">
                                <LogOut size={20} /> Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NOTIFICATIONS */}
            {showNotifications && (
                <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Bell size={20} color="var(--color-primary)" /> Notificações</h3>
                            <button className="modal-close-btn" onClick={() => setShowNotifications(false)}><X size={20} /></button>
                        </div>
                        <div className="notification-list">
                            {activeReminders.length > 0 && (
                                <div className="reminders-section" style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', opacity: 0.6, fontWeight: 700 }}>Lembretes</h4>
                                    {activeReminders.map(rem => (
                                        <div key={rem.id} className="reminder-card-modal">
                                            {/* Reminder content SAME as before */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{rem.title}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>Em {rem.minutesUntil} min</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => snoozeReminder(rem.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>Adiar 10m</button>
                                                <button onClick={() => dismissReminder(rem.id)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: '#fee2e2', color: '#ef4444' }}>Dispensar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            {overdueTasks.length === 0 && todayEvents.length === 0 && activeReminders.length === 0 && (
                                <div className="empty-state">Tudo em dia! ✨</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* TOASTS */}
            <div className="toast-container" style={{ position: 'fixed', top: '90px', right: '1rem', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {toastNotifications.map(notif => (
                    <div key={notif.id} className="toast-notification" onClick={() => setShowNotifications(true)} style={{ background: 'var(--color-surface)', color: 'var(--color-text-main)', padding: '1rem', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '300px', borderLeft: '4px solid var(--color-primary)', cursor: 'pointer' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bell size={20} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{notif.title}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Em {notif.minutesUntil} min • {format(notif.startTime, 'HH:mm')}</div>
                        </div>
                    </div>
                ))}
            </div>
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

export default Dashboard;
