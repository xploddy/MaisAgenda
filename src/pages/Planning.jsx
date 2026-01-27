import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Planning.css';

const Planning = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [formData, setFormData] = useState({ title: '', time: '09:00', type: 'work' });

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    useEffect(() => {
        fetchEvents();
    }, [selectedDate]);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });

        if (!error && data) {
            setAllEvents(data);
            setEvents(data.filter(e => isSameDay(parseISO(e.start_time), selectedDate)));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [hours, minutes] = formData.time.split(':');
        const eventDate = new Date(selectedDate);
        eventDate.setHours(parseInt(hours), parseInt(minutes));

        const payload = { title: formData.title, start_time: eventDate.toISOString(), type: formData.type };

        if (editingEvent) {
            const { error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
            if (!error) fetchEvents();
        } else {
            const { error } = await supabase.from('calendar_events').insert([{ ...payload, user_id: user.id }]);
            if (!error) fetchEvents();
        }
        closeModal();
    };

    const deleteEvent = async (id) => {
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (!error) fetchEvents();
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

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-6 pt-4">
                <h1>Planejamento</h1>
                <div className="flex gap-2 items-center bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm border border-border">
                    <button className="icon-btn p-1" onClick={() => setSelectedDate(addDays(selectedDate, -7))}><ChevronLeft size={20} /></button>
                    <span className="font-semibold capitalize text-xs min-w-[90px] text-center">
                        {format(selectedDate, 'MMM yyyy', { locale: ptBR })}
                    </span>
                    <button className="icon-btn p-1" onClick={() => setSelectedDate(addDays(selectedDate, 7))}><ChevronRight size={20} /></button>
                </div>
            </header>

            <div className="calendar-strip">
                {weekDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const hasEvent = allEvents.some(e => isSameDay(parseISO(e.start_time), day));

                    return (
                        <div key={idx} className={`day-item ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => setSelectedDate(day)}>
                            <span className="day-name">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                            <span className="day-number">{format(day, 'd')}</span>
                            {hasEvent && !isSelected && <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>}
                        </div>
                    );
                })}
            </div>

            <section className="mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title mb-0">Agenda de {format(selectedDate, 'dd/MM', { locale: ptBR })}</h2>
                    <button onClick={() => openModal()} className="icon-btn text-primary bg-primary/10 rounded-full p-2"><Plus size={20} /></button>
                </div>
                <div className="flex flex-col gap-3">
                    {events.length === 0 && <p className="text-muted text-center py-4 text-sm">Nada planejado para este dia.</p>}
                    {events.map((evt, idx) => (
                        <div key={idx} className={`card flex justify-between items-center border-l-4 ${evt.type === 'work' ? 'border-blue-500' : evt.type === 'personal' ? 'border-green-500' : 'border-rose-500'}`}>
                            <div className="flex items-center gap-4" onClick={() => openModal(evt)}>
                                <div className="flex items-center gap-2 text-muted text-xs font-bold min-w-[50px]">
                                    <Clock size={12} /> {format(parseISO(evt.start_time), 'HH:mm')}
                                </div>
                                <div className="font-medium text-sm">{evt.title}</div>
                            </div>
                            <button className="text-muted hover:text-red-500" onClick={() => deleteEvent(evt.id)}><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
            </section>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input autoFocus type="text" required className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="form-label">Horário</label>
                                    <input type="time" required className="form-input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                                <div className="flex-1">
                                    <label className="form-label">Tipo</label>
                                    <select className="form-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="work">Trabalho</option>
                                        <option value="personal">Pessoal</option>
                                        <option value="health">Saúde</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-2">{editingEvent ? 'Salvar Alterações' : 'Agendar'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planning;
