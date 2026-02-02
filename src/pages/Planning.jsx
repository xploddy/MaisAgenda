import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Bell, User, Moon, Sun, X, Menu, Briefcase, Users, Heart, Trash2, AlertCircle, LogOut } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, setMonth, differenceInMinutes, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';
import AddPlanningModal from '../components/AddPlanningModal';

const Planning = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Core State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);

    // UI State
    const [editingEvent, setEditingEvent] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    // Notification State
    const [activeReminders, setActiveReminders] = useState([]);
    const [toastNotifications, setToastNotifications] = useState([]);
    const [dismissedReminders, setDismissedReminders] = useState(new Set());
    const [snoozedReminders, setSnoozedReminders] = useState(new Map());
    const [toastedEventIds, setToastedEventIds] = useState(new Set());

    // Helper: Safe Format
    const safeFormat = (date, fmtStr) => {
        if (!date || !isValid(date)) return '';
        try {
            return format(date, fmtStr, { locale: ptBR });
        } catch (e) {
            console.error('Date format error', e);
            return '';
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [selectedDate, currentMonth, location]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (allEvents.length > 0) {
                checkReminders(allEvents);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [allEvents, dismissedReminders, snoozedReminders, toastedEventIds]);

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .order('start_time', { ascending: true });

            if (error) throw error;

            if (data) {
                setAllEvents(data);
                // Filter for selected date safely
                const dailyEvents = data.filter(e => {
                    if (!e.start_time) return false;
                    const d = parseISO(e.start_time);
                    return isValid(d) && isSameDay(d, selectedDate);
                });
                setEvents(dailyEvents);
                checkReminders(data);
            }
        } catch (err) {
            console.error("Error fetching events:", err);
            // Optionally set error state here
        }
    };

    const checkReminders = (eventsList) => {
        const now = new Date();
        const active = [];
        const newToasts = [];

        eventsList.forEach(event => {
            if (!event.start_time || !event.reminder_minutes) return;

            const eventId = String(event.id);
            const eventStart = parseISO(event.start_time);

            if (!isValid(eventStart)) return;

            const minutesUntil = differenceInMinutes(eventStart, now);
            const reminderThreshold = event.reminder_minutes;

            const snoozeTime = snoozedReminders.get(eventId);
            if (snoozeTime && snoozeTime > now) return;

            if (minutesUntil > 0 && minutesUntil <= reminderThreshold && !dismissedReminders.has(eventId)) {
                const reminder = {
                    id: eventId,
                    title: event.title,
                    startTime: eventStart,
                    minutesUntil,
                    location: event.location,
                    type: event.type
                };
                active.push(reminder);

                if (!toastedEventIds.has(eventId)) {
                    newToasts.push(reminder);
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

    const confirmDelete = async () => {
        if (!deleteId) return;
        await supabase.from('calendar_events').delete().eq('id', deleteId);
        setDeleteId(null);
        fetchEvents();
    };

    const dismissReminder = (id, e) => {
        if (e) e.stopPropagation();
        const sId = String(id);
        setDismissedReminders(prev => new Set([...prev, sId]));
        setActiveReminders(prev => prev.filter(r => r.id !== sId));
        setToastNotifications(prev => prev.filter(r => r.id !== sId));
    };

    const snoozeReminder = (id, e) => {
        if (e) e.stopPropagation();
        const sId = String(id);
        const snoozeUntil = new Date(new Date().getTime() + 10 * 60000);
        setSnoozedReminders(prev => new Map(prev).set(sId, snoozeUntil));
        setActiveReminders(prev => prev.filter(r => r.id !== sId));
        setToastNotifications(prev => prev.filter(r => r.id !== sId));
    };

    const handleMonthSelect = (m) => {
        setCurrentMonth(setMonth(currentMonth, m));
        setIsMonthPickerOpen(false);
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            const cloneDay = day;
            const hasEvent = allEvents.some(e => {
                if (!e.start_time) return false;
                const d = parseISO(e.start_time);
                return isValid(d) && isSameDay(d, cloneDay);
            });

            days.push(
                <div key={day.toString()} className={`calendar-day ${!isSameMonth(day, monthStart) ? "other-month" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}
                    onClick={() => setSelectedDate(cloneDay)}>
                    <span>{safeFormat(day, "d")}</span>
                    {hasEvent && !isSameDay(day, selectedDate) && <div className="event-dot"></div>}
                </div>
            );
            day = addDays(day, 1);
        }
        rows.push(<div className="calendar-grid-row" key={day.toString()}>{days}</div>);
        days = [];
    }

    return (
        <div className="planning-page animate-fade-in">
            <header className="top-bar-modern">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="page-title">Plano</h1>
                <div className="header-actions">
                    <button className="icon-action-btn" onClick={() => setShowNotifications(true)}>
                        <Bell size={24} />
                        {activeReminders.length > 0 && <span className="notification-badge"></span>}
                    </button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}><Menu size={24} /></button>
                </div>
            </header>

            <div className="calendar-card">
                <div className="calendar-nav">
                    <button className="nav-arrow-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={20} /></button>
                    <span className="month-label clickable" onClick={() => setIsMonthPickerOpen(true)}>
                        {safeFormat(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button className="nav-arrow-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={20} /></button>
                </div>

                {isMonthPickerOpen && (
                    <div className="month-picker-overlay animate-fade-in">
                        <div className="month-grid">
                            {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                <button key={m} className={`month-btn ${currentMonth.getMonth() === m ? 'active' : ''}`} onClick={() => handleMonthSelect(m)}>
                                    {format(setMonth(new Date(), m), 'MMM', { locale: ptBR })}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="calendar-week-names">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="calendar-cells">{rows}</div>
            </div>

            <section className="agenda-section">
                <h2>Agenda de {safeFormat(selectedDate, "dd 'de' MMMM")}</h2>
                <div className="event-list">
                    {events.length === 0 ? <div className="empty-state">Livre para hoje.</div> :
                        events.map(evt => (
                            <div key={evt.id} className="event-item-modern">
                                <div className={`event-icon ${evt.type}`}>
                                    {evt.type === 'work' ? <Briefcase size={18} /> : evt.type === 'personal' ? <Users size={18} /> : <Heart size={18} />}
                                </div>
                                <div className="event-info" onClick={() => setEditingEvent(evt)}>
                                    <div className="event-title">
                                        {evt.title}
                                        {evt.reminder_minutes > 0 && (
                                            <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '0.5rem', fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                                <Bell size={10} style={{ marginRight: '0.25rem' }} /> {evt.reminder_minutes}min
                                            </span>
                                        )}
                                    </div>
                                    <div className="event-time">
                                        <Clock size={12} /> {safeFormat(parseISO(evt.start_time), 'HH:mm')}
                                        {evt.end_time && ` - ${safeFormat(parseISO(evt.end_time), 'HH:mm')}`}
                                    </div>
                                    {evt.location && <div className="event-loc"><MapPin size={10} /> {evt.location}</div>}
                                </div>
                                <button className="delete-btn" onClick={() => setDeleteId(evt.id)}><Trash2 size={16} /></button>
                            </div>
                        ))
                    }
                </div>
            </section>

            {editingEvent && <AddPlanningModal event={editingEvent} onClose={() => { setEditingEvent(null); fetchEvents(); }} />}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="modal-overlay" style={{ alignItems: 'center' }}>
                    <div className="modal-content animate-fade-in" style={{ textAlign: 'center', maxWidth: '320px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><AlertCircle size={32} /></div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Evento?</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, background: 'var(--color-bg)' }} onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={confirmDelete}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MENU */}
            {showMenu && (
                <div className="modal-overlay" onClick={() => setShowMenu(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: 0 }}>
                    <div className="modal-content animate-slide-right" onClick={e => e.stopPropagation()} style={{ width: '280px', height: '100%', borderRadius: 0, padding: '2rem 1.5rem' }}>
                        <div className="modal-header"><h3 className="modal-title">Menu</h3><button className="modal-close-btn" onClick={() => setShowMenu(false)}><X size={20} /></button></div>
                        <div className="menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => navigate('/profile')} className="btn menu-btn"><User size={20} /> Perfil</button>
                            <button onClick={() => { toggleTheme(); setShowMenu(false); }} className="btn menu-btn">{currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />} Tema</button>
                            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn menu-btn"><LogOut size={20} /> Sair</button>
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
                            {activeReminders.length > 0 ? (
                                <div className="reminders-section">
                                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', opacity: 0.6, fontWeight: 700 }}>Lembretes</h4>
                                    {activeReminders.map(rem => (
                                        <div key={rem.id} className="reminder-card-modal" style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '1rem', marginBottom: '0.75rem', border: '1px solid var(--color-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{rem.title}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>Em {rem.minutesUntil} min</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', opacity: 0.8, marginBottom: '1rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center' }}><Clock size={14} style={{ marginRight: 4 }} /> {safeFormat(rem.startTime, 'HH:mm')}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={(e) => snoozeReminder(rem.id, e)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer' }}>Adiar 10m</button>
                                                <button onClick={(e) => dismissReminder(rem.id, e)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600, cursor: 'pointer' }}>Dispensar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="empty-state">Tudo em dia! ✨</div>}
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
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Em {notif.minutesUntil} min • {safeFormat(notif.startTime, 'HH:mm')}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Planning;
