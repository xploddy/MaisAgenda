import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, Edit2, Calendar as CalendarIcon, Briefcase, Users, Heart, Save, MapPin, Repeat, Bell, AlignLeft, UserPlus, Check, AlertCircle, Menu, LogOut, User, Moon, Sun } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, setMonth, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';

const Planning = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [activeNotifications, setActiveNotifications] = useState([]);
    const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
    const [formData, setFormData] = useState({
        title: '', location: '', startDate: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00',
        endDate: format(new Date(), 'yyyy-MM-dd'), endTime: '10:00',
        allDay: false, repeatFrequency: 'none', reminderMinutes: '15',
        status: 'busy', description: '', participants: [], type: 'work'
    });

    useEffect(() => {
        fetchEvents();
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            openModal();
            navigate('/planning', { replace: true });
        }
    }, [selectedDate, currentMonth, location]);

    // Check notifications every minute
    useEffect(() => {
        const interval = setInterval(() => {
            if (allEvents.length > 0) {
                checkNotifications(allEvents);
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [allEvents, dismissedNotifications]);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });

        if (data) {
            setAllEvents(data);
            setEvents(data.filter(e => isSameDay(parseISO(e.start_time), selectedDate)));
            checkNotifications(data);
        }
    };

    const checkNotifications = (eventsList) => {
        const now = new Date();
        const notifications = [];

        eventsList.forEach(event => {
            if (event.reminder_minutes && event.reminder_minutes > 0) {
                const eventStart = parseISO(event.start_time);
                const minutesUntilEvent = differenceInMinutes(eventStart, now);
                const reminderThreshold = event.reminder_minutes;

                // Show notification if we're within the reminder window
                if (minutesUntilEvent > 0 && minutesUntilEvent <= reminderThreshold && !dismissedNotifications.has(event.id)) {
                    notifications.push({
                        id: event.id,
                        title: event.title,
                        startTime: eventStart,
                        minutesUntil: minutesUntilEvent,
                        type: event.type,
                        location: event.location
                    });
                }
            }
        });

        setActiveNotifications(notifications);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const start = new Date(`${formData.startDate}T${formData.startTime}`);
        const end = new Date(`${formData.endDate}T${formData.endTime}`);

        const payload = {
            title: formData.title,
            location: formData.location || null,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            all_day: formData.allDay,
            repeat_frequency: formData.repeatFrequency,
            reminder_minutes: parseInt(formData.reminderMinutes),
            status: formData.status,
            description: formData.description || null,
            participants: formData.participants || [],
            type: formData.type,
            user_id: user.id
        };

        const result = editingEvent
            ? await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id)
            : await supabase.from('calendar_events').insert([payload]);

        if (result.error) {
            alert("Erro ao salvar: " + result.error.message);
        } else {
            fetchEvents();
            closeModal();
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await supabase.from('calendar_events').delete().eq('id', deleteId);
        setDeleteId(null);
        fetchEvents();
    };

    const openModal = (event = null) => {
        if (event) {
            const start = parseISO(event.start_time);
            const end = event.end_time ? parseISO(event.end_time) : start;
            setEditingEvent(event);
            setFormData({
                title: event.title,
                location: event.location || '',
                startDate: format(start, 'yyyy-MM-dd'),
                startTime: format(start, 'HH:mm'),
                endDate: format(end, 'yyyy-MM-dd'),
                endTime: format(end, 'HH:mm'),
                allDay: event.all_day || false,
                repeatFrequency: event.repeat_frequency || 'none',
                reminderMinutes: event.reminder_minutes?.toString() || '15',
                status: event.status || 'busy',
                description: event.description || '',
                participants: event.participants || [],
                type: event.type || 'work'
            });
        } else {
            setEditingEvent(null);
            setFormData({
                title: '', location: '', startDate: format(selectedDate, 'yyyy-MM-dd'), startTime: '09:00',
                endDate: format(selectedDate, 'yyyy-MM-dd'), endTime: '10:00',
                allDay: false, repeatFrequency: 'none', reminderMinutes: '15',
                status: 'busy', description: '', participants: [], type: 'work'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingEvent(null); };

    const dismissNotification = (eventId) => {
        setDismissedNotifications(prev => new Set([...prev, eventId]));
        setActiveNotifications(prev => prev.filter(n => n.id !== eventId));
    };

    const handleMonthSelect = (m) => {
        setCurrentMonth(setMonth(currentMonth, m));
        setIsMonthPickerOpen(false);
    };

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
            const hasEvent = allEvents.some(e => isSameDay(parseISO(e.start_time), cloneDay));
            days.push(
                <div key={day} className={`calendar-day ${!isSameMonth(day, monthStart) ? "other-month" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}
                    onClick={() => { setSelectedDate(cloneDay); setFormData({ ...formData, startDate: format(cloneDay, 'yyyy-MM-dd'), endDate: format(cloneDay, 'yyyy-MM-dd') }); }}>
                    <span>{format(day, "d")}</span>
                    {hasEvent && !isSameDay(day, selectedDate) && <div className="event-dot"></div>}
                </div>
            );
            day = addDays(day, 1);
        }
        rows.push(<div className="calendar-grid-row" key={day}>{days}</div>);
        days = [];
    }

    return (
        <div className="planning-page animate-fade-in">
            <header className="top-bar-modern">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="page-title">Plano</h1>
                <div className="header-actions">
                    <button className="icon-action-btn no-bg" style={{ boxShadow: 'none' }}><CalendarIcon size={24} color="var(--color-primary)" /></button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}><Menu size={24} /></button>
                </div>
            </header>

            {/* NOTIFICATION BANNERS */}
            {activeNotifications.length > 0 && (
                <div style={{ position: 'fixed', top: '80px', left: '1rem', right: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeNotifications.map(notif => (
                        <div key={notif.id} className="notification-banner animate-fade-in" style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            color: 'white',
                            padding: '1rem 1.25rem',
                            borderRadius: '1rem',
                            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            animation: 'slideDown 0.3s ease-out'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Bell size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem', fontWeight: 600 }}>
                                    Em {notif.minutesUntil} minuto{notif.minutesUntil !== 1 ? 's' : ''}
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                                    {notif.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Clock size={12} />
                                    {format(notif.startTime, 'HH:mm')}
                                    {notif.location && (
                                        <>
                                            <span style={{ opacity: 0.6 }}>•</span>
                                            <MapPin size={12} />
                                            {notif.location}
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => dismissNotification(notif.id)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                <X size={18} color="white" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="calendar-card">
                <div className="calendar-nav">
                    <button className="nav-arrow-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={20} /></button>
                    <span className="month-label clickable" onClick={() => setIsMonthPickerOpen(true)}>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
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
                <h2>Agenda de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h2>
                <div className="event-list">
                    {events.length === 0 ? <div className="empty-state">Livre para hoje.</div> :
                        events.map(evt => (
                            <div key={evt.id} className="event-item-modern">
                                <div className={`event-icon ${evt.type}`}>
                                    {evt.type === 'work' ? <Briefcase size={18} /> : evt.type === 'personal' ? <Users size={18} /> : <Heart size={18} />}
                                </div>
                                <div className="event-info" onClick={() => openModal(evt)}>
                                    <div className="event-title">
                                        {evt.title}
                                        {evt.reminder_minutes > 0 && (
                                            <span style={{
                                                marginLeft: '0.5rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.7rem',
                                                color: 'var(--color-primary)',
                                                fontWeight: 700
                                            }}>
                                                <Bell size={10} style={{ marginRight: '0.25rem' }} />
                                                {evt.reminder_minutes}min
                                            </span>
                                        )}
                                    </div>
                                    <div className="event-time"><Clock size={12} /> {format(parseISO(evt.start_time), 'HH:mm')}{evt.end_time && ` - ${format(parseISO(evt.end_time), 'HH:mm')}`}</div>
                                    {evt.location && <div className="event-loc"><MapPin size={10} /> {evt.location}</div>}
                                </div>
                                <button className="delete-btn" onClick={() => setDeleteId(evt.id)}><Trash2 size={16} /></button>
                            </div>
                        ))
                    }
                </div>
            </section>

            <button className="fab" onClick={() => openModal()}><Plus size={32} /></button>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal} style={{ alignItems: 'center' }}>
                    <div className="modal-content scrollable-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><CalendarIcon size={20} color="var(--color-primary)" /> {editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">Título</label>
                            <div className="input-container"><AlignLeft size={20} color="var(--color-text-muted)" /><input autoFocus type="text" className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>

                            <label className="form-label">Local</label>
                            <div className="input-container"><MapPin size={20} color="var(--color-text-muted)" /><input type="text" className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>

                            <div className="form-grid">
                                <div>
                                    <label className="form-label">Início</label>
                                    <div className="input-container icon-stack">
                                        <input type="date" className="input-field minimal" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                        {!formData.allDay && <input type="time" className="input-field minimal" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Fim</label>
                                    <div className="input-container icon-stack">
                                        <input type="date" className="input-field minimal" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                        {!formData.allDay && <input type="time" className="input-field minimal" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />}
                                    </div>
                                </div>
                            </div>

                            <div className="checkbox-row" onClick={() => setFormData({ ...formData, allDay: !formData.allDay })}>
                                <div className={`custom-checkbox ${formData.allDay ? 'checked' : ''}`}>{formData.allDay && <Check size={12} color="white" strokeWidth={4} />}</div>
                                <span>Dia Inteiro</span>
                            </div>

                            <div className="form-grid">
                                <div>
                                    <label className="form-label">Repetir</label>
                                    <div className="input-container"><select className="input-field" value={formData.repeatFrequency} onChange={e => setFormData({ ...formData, repeatFrequency: e.target.value })}><option value="none">Nunca</option><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div>
                                </div>
                                <div>
                                    <label className="form-label">Lembrete</label>
                                    <div className="input-container"><select className="input-field" value={formData.reminderMinutes} onChange={e => setFormData({ ...formData, reminderMinutes: e.target.value })}><option value="0">Sem aviso</option><option value="5">5 min</option><option value="15">15 min</option><option value="60">1 hora</option></select></div>
                                </div>
                            </div>

                            <label className="form-label">Descrição</label>
                            <div className="input-container"><textarea className="input-field" rows="2" style={{ resize: 'none', padding: '1rem 0' }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea></div>

                            <button type="submit" className="btn btn-primary btn-submit" style={{ marginTop: '1rem' }}><Save size={20} /> Salvar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="modal-overlay" style={{ alignItems: 'center' }}>
                    <div className="modal-content animate-fade-in" style={{ textAlign: 'center', maxWidth: '320px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Evento?</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Esta ação não pode ser desfeita. Você tem certeza?</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, background: 'var(--color-bg)' }} onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={confirmDelete}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default Planning;
