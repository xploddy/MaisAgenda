import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Planning.css';

const Planning = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Generate a week view
    const startDate = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    return (
        <div>
            <header className="flex justify-between items-center mb-6 pt-4">
                <h1>Planejamento</h1>
                <div className="flex gap-2">
                    <button className="icon-btn"><ChevronLeft size={20} /></button>
                    <span className="font-semibold capitalize">
                        {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button className="icon-btn"><ChevronRight size={20} /></button>
                </div>
            </header>

            {/* Week Calendar Strip */}
            <div className="calendar-strip">
                {weekDays.map((day, idx) => {
                    const isSelected = format(day, 'd') === format(selectedDate, 'd');
                    const isToday = format(day, 'd') === format(new Date(), 'd');

                    return (
                        <div
                            key={idx}
                            className={`day-item ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setSelectedDate(day)}
                        >
                            <span className="day-name">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                            <span className="day-number">{format(day, 'd')}</span>
                        </div>
                    );
                })}
            </div>

            <section className="mt-6">
                <h2 className="section-title">
                    Agenda de {format(selectedDate, 'dd/MM', { locale: ptBR })}
                </h2>
                <div className="flex flex-col gap-3">
                    <EventItem time="09:00" title="Daily Tech" type="work" />
                    <EventItem time="12:30" title="Almoço com Cliente" type="personal" />
                    <EventItem time="15:00" title="Revisão de Metas" type="work" />
                    <EventItem time="18:00" title="Academia" type="health" />
                </div>
            </section>
        </div>
    );
};

const EventItem = ({ time, title, type }) => {
    const colors = {
        work: 'border-blue-500',
        personal: 'border-green-500',
        health: 'border-rose-500'
    };

    return (
        <div className={`card flex gap-4 items-center border-l-4 ${colors[type] || 'border-gray-300'}`}>
            <div className="flex items-center gap-2 text-muted text-sm font-bold min-w-[60px]">
                <Clock size={14} />
                {time}
            </div>
            <div className="font-medium">{title}</div>
        </div>
    );
};

export default Planning;
