import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Planning.css';

const Planning = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]); // To show indicators if needed
    const [isAdding, setIsAdding] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', time: '09:00', type: 'work' });

    // Generate a week view
    // Better: Allow week navigation. For now, static current week or based on selectedDate.
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    useEffect(() => {
        fetchEvents();
    }, [selectedDate]); // Re-fetch might not be efficient, better fetch range. Fetching all for now for simplicity.

    const fetchEvents = async () => {
        // Ideally fetch by range. Simplified: Fetch all recent.
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) console.error(error);
        else {
            setAllEvents(data || []);
            // Filter for selected date
            const daysEvents = (data || []).filter(e => isSameDay(parseISO(e.start_time), selectedDate));
            setEvents(daysEvents);
        }
    };

    const nextWeek = () => setSelectedDate(addDays(selectedDate, 7));
    const prevWeek = () => setSelectedDate(addDays(selectedDate, -7));

    const addEvent = async (e) => {
        e.preventDefault();
        if (!newEvent.title) return;

        // Construct timestamp
        const [hours, minutes] = newEvent.time.split(':');
        const eventDate = new Date(selectedDate);
        eventDate.setHours(parseInt(hours), parseInt(minutes));

        const event = {
            title: newEvent.title,
            start_time: eventDate.toISOString(),
            type: newEvent.type
        };

        // Optimistic
        setEvents([...events, event].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        setIsAdding(false);
        setNewEvent({ title: '', time: '09:00', type: 'work' });

        const { error } = await supabase.from('calendar_events').insert([{ ...event, user_id: (await supabase.auth.getUser()).data.user.id }]);
        if (error) {
            console.error(error);
            fetchEvents();
        }
    };

    return (
        <div className="pb-20">
            <header className="flex justify-between items-center mb-6 pt-4">
                <h1>Planejamento</h1>
                <div className="flex gap-2 items-center bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm">
                    <button className="icon-btn p-1" onClick={prevWeek}><ChevronLeft size={20} /></button>
                    <span className="font-semibold capitalize text-sm min-w-[100px] text-center">
                        {format(selectedDate, 'MMM yyyy', { locale: ptBR })}
                    </span>
                    <button className="icon-btn p-1" onClick={nextWeek}><ChevronRight size={20} /></button>
                </div>
            </header>

            {/* Week Calendar Strip */}
            <div className="calendar-strip overflow-x-auto">
                {weekDays.map((day, idx) => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const hasEvent = allEvents.some(e => isSameDay(parseISO(e.start_time), day));

                    return (
                        <div
                            key={idx}
                            className={`day-item ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setSelectedDate(day)}
                        >
                            <span className="day-name">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                            <span className="day-number">{format(day, 'd')}</span>
                            {hasEvent && !isSelected && <div className="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>}
                        </div>
                    );
                })}
            </div>

            <section className="mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title mb-0">
                        Agenda de {format(selectedDate, 'dd/MM', { locale: ptBR })}
                    </h2>
                    <button onClick={() => setIsAdding(true)} className="icon-btn text-primary bg-primary/10 rounded-full p-2">
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {events.length === 0 && <p className="text-muted text-center py-4">Nada planejado para hoje.</p>}
                    {events.map((evt, idx) => (
                        <EventItem key={idx} data={evt} />
                    ))}
                </div>
            </section>

            {/* Add Event Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Novo Evento</h3>
                            <button onClick={() => setIsAdding(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={addEvent} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm text-muted">Título</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600"
                                    placeholder="Reunião, Academia..."
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm text-muted">Horário</label>
                                    <input
                                        type="time"
                                        className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-muted">Tipo</label>
                                    <select
                                        className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600"
                                        value={newEvent.type}
                                        onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                                    >
                                        <option value="work">Trabalho</option>
                                        <option value="personal">Pessoal</option>
                                        <option value="health">Saúde</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-2">Agendar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const EventItem = ({ data }) => {
    const time = format(parseISO(data.start_time), 'HH:mm');
    const colors = {
        work: 'border-blue-500',
        personal: 'border-green-500',
        health: 'border-rose-500'
    };

    return (
        <div className={`card flex gap-4 items-center border-l-4 ${colors[data.type] || 'border-gray-300'}`}>
            <div className="flex items-center gap-2 text-muted text-sm font-bold min-w-[60px]">
                <Clock size={14} />
                {time}
            </div>
            <div className="font-medium">{data.title}</div>
        </div>
    );
};

export default Planning;
