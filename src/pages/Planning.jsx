import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Calendar as CalendarIcon, Briefcase, Users, Heart } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';
import './Shopping.css'; // For FAB

const Planning = () => {
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', time: '09:00', type: 'work' });

    useEffect(() => {
        fetchEvents();
    }, [selectedDate]);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });
        if (!error && data) {
            setEvents(data.filter(e => isSameDay(parseISO(e.start_time), selectedDate)));
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => (
        <div className="calendar-nav">
            <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={prevMonth}><ChevronLeft size={20} /></button>
            <span className="month-label capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>
    );

    const renderDays = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        return <div className="calendar-grid">{days.map(d => <div key={d} className="calendar-day-name">{d}</div>)}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;
                days.push(
                    <div
                        key={day}
                        className={`calendar-day ${!isSameMonth(day, monthStart) ? "other-month" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <span>{formattedDate}</span>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="calendar-grid" key={day}>{days}</div>);
            days = [];
        }
        return <div className="calendar-body">{rows}</div>;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [hours, mins] = formData.time.split(':');
        const start_time = new Date(selectedDate);
        start_time.setHours(parseInt(hours), parseInt(mins));
        await supabase.from('calendar_events').insert([{ ...formData, start_time: start_time.toISOString(), user_id: user.id }]);
        fetchEvents();
        closeModal();
    };

    const closeModal = () => { setIsModalOpen(false); };

    return (
        <div className="planning-page animate-fade-in">
            <header className="planning-header">
                <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Planejamento</h1>
                <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    <CalendarIcon size={24} color="#6b7280" />
                </button>
            </header>

            <div className="calendar-card">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>

            <section>
                <h2 className="section-title" style={{ marginBottom: '1rem' }}>Sua Agenda</h2>
                <div className="event-list">
                    {events.length === 0 ? (
                        <p className="text-center text-muted py-4">Nenhum evento hoje.</p>
                    ) : (
                        events.map((evt, idx) => (
                            <div key={idx} className="event-card">
                                <div className={`event-icon-circle ${evt.type === 'work' ? 'blue' : evt.type === 'personal' ? 'green' : 'red'}`}>
                                    {evt.type === 'work' ? <Briefcase size={16} /> : evt.type === 'personal' ? <Users size={16} /> : <Heart size={16} />}
                                </div>
                                <div className="event-details">
                                    <div className="event-title">{evt.title}</div>
                                    <div className="event-time">{format(parseISO(evt.start_time), 'HH:mm')}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <button className="fab" onClick={() => setIsModalOpen(true)}>
                <Plus size={32} />
            </button>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Novo Agendamento</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={closeModal}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Título do Evento</label>
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
                            <button type="submit" className="btn btn-primary w-full mt-4">Agendar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
