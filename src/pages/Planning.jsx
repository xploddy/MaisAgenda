import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, Edit2, Calendar as CalendarIcon, Briefcase, Users, Heart, Save, MapPin, Repeat, Bell, AlignLeft, UserPlus, Check } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO, setMonth, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Planning.css';

const Planning = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        location: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endDate: format(new Date(), 'yyyy-MM-dd'),
        endTime: '10:00',
        allDay: false,
        repeatFrequency: 'none',
        reminderMinutes: '15',
        status: 'busy',
        description: '',
        participants: [],
        type: 'work'
    });

    useEffect(() => {
        fetchEvents();
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            openModal();
            navigate('/planning', { replace: true });
        }
    }, [selectedDate, currentMonth, location]);

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

        const start = new Date(`${formData.startDate}T${formData.startTime}`);
        const end = new Date(`${formData.endDate}T${formData.endTime}`);

        const payload = {
            title: formData.title,
            location: formData.location,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            all_day: formData.allDay,
            repeat_frequency: formData.repeatFrequency,
            reminder_minutes: parseInt(formData.reminderMinutes),
            status: formData.status,
            description: formData.description,
            participants: formData.participants,
            type: formData.type,
            user_id: user.id
        };

        try {
            if (editingEvent) {
                await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
            } else {
                await supabase.from('calendar_events').insert([payload]);
            }
            fetchEvents();
            closeModal();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar evento. Certifique-se de que rodou as migrações SQL.");
        }
    };

    const deleteEvent = async (id) => {
        if (!window.confirm("Excluir agendamento?")) return;
        await supabase.from('calendar_events').delete().eq('id', id);
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
                title: '',
                location: '',
                startDate: format(selectedDate, 'yyyy-MM-dd'),
                startTime: '09:00',
                endDate: format(selectedDate, 'yyyy-MM-dd'),
                endTime: '10:00',
                allDay: false,
                repeatFrequency: 'none',
                reminderMinutes: '15',
                status: 'busy',
                description: '',
                participants: [],
                type: 'work'
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingEvent(null); };

    const handleAddParticipant = () => {
        const email = prompt("Email do participante:");
        if (email && email.includes('@')) {
            setFormData({ ...formData, participants: [...formData.participants, email] });
        }
    };

    const removeParticipant = (index) => {
        const newList = [...formData.participants];
        newList.splice(index, 1);
        setFormData({ ...formData, participants: newList });
    };

    // Month picker logic
    const months = Array.from({ length: 12 }, (_, i) => i);
    const handleMonthSelect = (m) => {
        const newDate = setMonth(currentMonth, m);
        setCurrentMonth(newDate);
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
                <div key={day} className={`calendar-day ${!isSameMonth(day, monthStart) ? "other-month" : ""} ${isSameDay(day, selectedDate) ? "selected" : ""} ${isSameDay(day, new Date()) ? "today" : ""}`} onClick={() => { setSelectedDate(cloneDay); setFormData({ ...formData, startDate: format(cloneDay, 'yyyy-MM-dd'), endDate: format(cloneDay, 'yyyy-MM-dd') }); }}>
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
                <div style={{ width: 44 }}></div>
            </header>

            <div className="calendar-card">
                <div className="calendar-nav">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={20} /></button>
                    <span className="month-label clickable" onClick={() => setIsMonthPickerOpen(true)}>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={20} /></button>
                </div>
                {isMonthPickerOpen && (
                    <div className="month-picker-overlay animate-fade-in">
                        <div className="month-grid">
                            {months.map(m => (
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
                <div className="section-header">
                    <h2>Agenda de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h2>
                </div>
                <div className="event-list">
                    {events.length === 0 ? <div className="empty-state">Nenhum agendamento para este dia.</div> :
                        events.map(evt => (
                            <div key={evt.id} className="event-item-modern">
                                <div className={`event-icon ${evt.type}`}>
                                    {evt.type === 'work' ? <Briefcase size={16} /> : evt.type === 'personal' ? <Users size={16} /> : <Heart size={16} />}
                                </div>
                                <div className="event-info" onClick={() => openModal(evt)}>
                                    <div className="event-title">{evt.title}</div>
                                    <div className="event-time">
                                        <Clock size={12} /> {format(parseISO(evt.start_time), 'HH:mm')}
                                        {evt.end_time && ` - ${format(parseISO(evt.end_time), 'HH:mm')}`}
                                    </div>
                                    {evt.location && <div className="event-loc"><MapPin size={10} /> {evt.location}</div>}
                                </div>
                                <button className="delete-btn" onClick={() => deleteEvent(evt.id)}><Trash2 size={16} /></button>
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
                            <label className="form-label">Título do Evento</label>
                            <div className="input-container">
                                <AlignLeft size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Reunião de Projeto" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <label className="form-label">Local ou Sala</label>
                            <div className="input-container">
                                <MapPin size={20} color="var(--color-text-muted)" />
                                <input type="text" className="input-field" placeholder="Ex: Sala 402 ou Meet" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>

                            <div className="form-grid">
                                <div>
                                    <label className="form-label">Início</label>
                                    <div className="input-container icon-stack">
                                        <input type="date" className="input-field minimal" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                        {!formData.allDay && <input type="time" className="input-field minimal" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Término</label>
                                    <div className="input-container icon-stack">
                                        <input type="date" className="input-field minimal" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                        {!formData.allDay && <input type="time" className="input-field minimal" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />}
                                    </div>
                                </div>
                            </div>

                            <div className="checkbox-row" onClick={() => setFormData({ ...formData, allDay: !formData.allDay })}>
                                <div className={`custom-checkbox ${formData.allDay ? 'checked' : ''}`}>
                                    {formData.allDay && <Check size={12} color="white" strokeWidth={4} />}
                                </div>
                                <span>Dia Inteiro</span>
                            </div>

                            <div className="form-grid">
                                <div>
                                    <label className="form-label">Repetir</label>
                                    <div className="input-container">
                                        <Repeat size={18} color="var(--color-text-muted)" />
                                        <select className="input-field" value={formData.repeatFrequency} onChange={e => setFormData({ ...formData, repeatFrequency: e.target.value })}>
                                            <option value="none">Não repetir</option>
                                            <option value="daily">Diário</option>
                                            <option value="weekly">Semanal</option>
                                            <option value="monthly">Mensal</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Lembrete</label>
                                    <div className="input-container">
                                        <Bell size={18} color="var(--color-text-muted)" />
                                        <select className="input-field" value={formData.reminderMinutes} onChange={e => setFormData({ ...formData, reminderMinutes: e.target.value })}>
                                            <option value="0">Sem lembrete</option>
                                            <option value="5">5 min antes</option>
                                            <option value="15">15 min antes</option>
                                            <option value="30">30 min antes</option>
                                            <option value="60">1 hora antes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid">
                                <div>
                                    <label className="form-label">Status</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="busy">Ocupado</option>
                                            <option value="available">Disponível</option>
                                            <option value="away">Ausente</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Categoria</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="work">Trabalho</option>
                                            <option value="personal">Pessoal</option>
                                            <option value="health">Saúde</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <label className="form-label">Descrição Breve</label>
                            <div className="input-container" style={{ alignItems: 'flex-start' }}>
                                <textarea className="input-field" rows="2" style={{ resize: 'none', padding: '1rem 0' }} placeholder="Adicione notas aqui..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                            </div>

                            <label className="form-label">Participantes</label>
                            <div className="participants-container">
                                {formData.participants.map((p, idx) => (
                                    <div key={idx} className="participant-chip">
                                        {p} <button type="button" onClick={() => removeParticipant(idx)}><X size={10} /></button>
                                    </div>
                                ))}
                                <button type="button" className="add-participant-btn" onClick={handleAddParticipant}>
                                    <UserPlus size={16} /> Convidar
                                </button>
                            </div>

                            <button type="submit" className="btn btn-primary btn-submit" style={{ marginTop: '1rem' }}><Save size={20} /> Salvar Evento</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
