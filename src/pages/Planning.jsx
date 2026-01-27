import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, Edit2, Calendar as CalendarIcon, Briefcase, Users, Heart } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';
import './Shopping.css';

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

        if (error) {
            console.error("Fetch Events Error:", error);
            return;
        }

        if (data) {
            setAllEvents(data);
            const daysEvents = data.filter(e => isSameDay(parseISO(e.start_time), selectedDate));
            setEvents(daysEvents);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
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
                const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('calendar_events').insert([payload]);
                if (error) throw error;
            }

            fetchEvents();
            closeModal();
        } catch (err) {
            alert("Erro ao salvar: " + err.message);
        }
    };

    const deleteEvent = async (id) => {
        if (!window.confirm("Excluir agendamento?")) return;
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (error) console.error(error);
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

    // Calendar Render Helpers
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => (
        <div className="calendar-nav">
            <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={prevMonth}><ChevronLeft size={20} /></button>
            <span className="month-label capitalize" style={{ color: 'var(--color-text-main)' }}>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>
    );

    const renderCells = () => {
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
            rows.push(<div className="calendar-grid" key={day}>{days}</div>);
            days = [];
        }
        return <div className="calendar-body">{rows}</div>;
    };

    return (
        <div className="planning-page animate-fade-in">
            <header className="planning-header">
                <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>Planejamento</h1>
                <button className="icon-btn" style={{ background: 'transparent', border: 'none' }}>
                    <CalendarIcon size={24} color="#6b7280" />
                </button>
            </header>

            <div className="calendar-card">
                {renderHeader()}
                <div className="calendar-grid">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => <div key={d} className="calendar-day-name">{d}</div>)}
                </div>
                {renderCells()}
            </div>

            <section>
                <h2 className="section-title" style={{ marginBottom: '1rem', color: 'var(--color-text-main)' }}>Agenda de {format(selectedDate, 'dd/MM')}</h2>
                <div className="event-list">
                    {events.length === 0 ? (
                        <p className="text-center text-muted py-6">Nenhum agendamento.</p>
                    ) : (
                        events.map((evt) => (
                            <div key={evt.id} className={`event-card`}>
                                <div className={`event-icon-circle ${evt.type === 'work' ? 'blue' : evt.type === 'personal' ? 'green' : 'red'}`}>
                                    {evt.type === 'work' ? <Briefcase size={16} /> : evt.type === 'personal' ? <Users size={16} /> : <Heart size={16} />}
                                </div>
                                <div className="event-details" onClick={() => openModal(evt)}>
                                    <div className="event-title" style={{ color: 'var(--color-text-main)' }}>{evt.title}</div>
                                    <div className="event-time">{format(parseISO(evt.start_time), 'HH:mm')}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => deleteEvent(evt.id)} className="p-2 text-red-400"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <button className="fab" onClick={() => openModal()}>
                <Plus size={32} />
            </button>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-main)' }}>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={closeModal}><X size={24} color="var(--color-text-main)" /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input autoFocus type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>
                            <div className="flex gap-4">
                                <div className="form-group flex-1">
                                    <label className="form-label">Horário</label>
                                    <input type="time" className="form-input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Tipo</label>
                                    <select className="form-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="work">Trabalho</option>
                                        <option value="personal">Pessoal</option>
                                        <option value="health">Saúde</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full mt-4">Salvar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
