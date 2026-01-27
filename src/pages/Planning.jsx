import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, Calendar as CalendarIcon, Briefcase, Users, Heart, Save } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';

const Planning = () => {
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({ title: '', time: '09:00', type: 'work' });

    useEffect(() => {
        fetchEvents();
    }, [selectedDate, currentMonth]);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });

        if (data) {
            setAllEvents(data);
            setEvents(data.filter(e => isSameDay(parseISO(e.start_time), selectedDate)));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [hours, mins] = formData.time.split(':');
        const eventDate = new Date(selectedDate);
        eventDate.setHours(parseInt(hours), parseInt(mins), 0, 0);

        const payload = {
            title: formData.title,
            start_time: eventDate.toISOString(),
            type: formData.type,
            user_id: user.id
        };

        if (editingEvent) {
            await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
        } else {
            await supabase.from('calendar_events').insert([payload]);
        }

        fetchEvents();
        closeModal();
    };

    const deleteEvent = async (id) => {
        if (!window.confirm("Excluir agendamento?")) return;
        await supabase.from('calendar_events').delete().eq('id', id);
        fetchEvents();
    };

    const openModal = (event = null) => {
        if (event) {
            setEditingEvent(event);
            setFormData({
                title: event.title,
                time: format(parseISO(event.start_time), 'HH:mm'),
                type: event.type
            });
        } else {
            setEditingEvent(null);
            setFormData({ title: '', time: '09:00', type: 'work' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingEvent(null); };

    // Calendar logic
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
                <div
                    key={day}
                    className={`calendar-day ${!isSameMonth(day, monthStart) ? "other-month" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}
                    onClick={() => setSelectedDate(cloneDay)}
                >
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
            <header className="planning-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1>Planejamento</h1>
                <button className="icon-btn-ghost"><CalendarIcon size={24} /></button>
            </header>

            <div className="calendar-card">
                <div className="calendar-nav">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={20} /></button>
                    <span className="month-label">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={20} /></button>
                </div>
                <div className="calendar-week-names">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="calendar-cells">{rows}</div>
            </div>

            <section className="agenda-section">
                <div className="section-header">
                    <h2>Agenda de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h2>
                    <button className="add-event-compact" onClick={() => openModal()}><Plus size={20} /></button>
                </div>

                <div className="event-list">
                    {events.length === 0 ? (
                        <div className="empty-state">Nenhum agendamento para hoje.</div>
                    ) : (
                        events.map((evt) => (
                            <div key={evt.id} className="event-item-modern">
                                <div className={`event-icon ${evt.type}`}>
                                    {evt.type === 'work' ? <Briefcase size={16} /> : evt.type === 'personal' ? <Users size={16} /> : <Heart size={16} />}
                                </div>
                                <div className="event-info" onClick={() => openModal(evt)}>
                                    <div className="event-title">{evt.title}</div>
                                    <div className="event-time"><Clock size={12} /> {format(parseISO(evt.start_time), 'HH:mm')}</div>
                                </div>
                                <button className="delete-btn" onClick={() => deleteEvent(evt.id)}><Trash2 size={16} /></button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <button className="fab" onClick={() => openModal()}><Plus size={32} /></button>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><CalendarIcon size={20} color="var(--color-primary)" /> {editingEvent ? 'Editar Plano' : 'Novo Plano'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">O que você vai fazer?</label>
                            <div className="input-container">
                                <Briefcase size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Reunião de equipe" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Horário</label>
                                    <div className="input-container">
                                        <Clock size={20} color="var(--color-text-muted)" />
                                        <input type="time" className="input-field" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Tipo</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="work">Trabalho</option>
                                            <option value="personal">Pessoal</option>
                                            <option value="health">Saúde</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-submit">
                                <Save size={20} /> {editingEvent ? 'Salvar Alterações' : 'Agendar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
