import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, FileText, Tag, Clock, ChevronRight, MapPin, Bell, Repeat, AlignLeft } from 'lucide-react';
import './AddTransactionModal.css';
import { format, parseISO } from 'date-fns';
import { supabase } from '../supabaseClient';

const AddPlanningModal = ({ onClose, event = null }) => {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [allDay, setAllDay] = useState(false);

    // Dates/Times
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('09:00');
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endTime, setEndTime] = useState('10:00');

    const [repeat, setRepeat] = useState('none');
    const [reminder, setReminder] = useState('15');
    const [type, setType] = useState('work');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setLocation(event.location || '');
            setAllDay(event.all_day || false);
            setDescription(event.description || '');
            setType(event.type || 'work');
            setRepeat(event.repeat_frequency || 'none');
            setReminder(String(event.reminder_minutes || '0'));

            if (event.start_time) {
                const s = parseISO(event.start_time);
                setStartDate(format(s, 'yyyy-MM-dd'));
                setStartTime(format(s, 'HH:mm'));
            }
            if (event.end_time) {
                const e = parseISO(event.end_time);
                setEndDate(format(e, 'yyyy-MM-dd'));
                setEndTime(format(e, 'HH:mm'));
            }
        }
    }, [event]);

    const handleSave = async () => {
        if (!title.trim()) return alert('Digite o título do evento');
        setLoading(true);

        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        const payload = {
            title: title,
            description: description,
            location: location,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            all_day: allDay,
            repeat_frequency: repeat,
            reminder_minutes: parseInt(reminder),
            type: type,
            status: 'busy',
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        let result;
        if (event) {
            result = await supabase.from('calendar_events').update(payload).eq('id', event.id);
        } else {
            result = await supabase.from('calendar_events').insert([payload]);
        }

        setLoading(false);
        if (result.error) {
            alert('Erro: ' + result.error.message);
        } else {
            onClose();
            window.location.reload();
        }
    };

    return (
        <div className="atm-overlay">
            <div className={`atm-header planning`}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}><span style={{ fontSize: '1rem' }}>Cancelar</span></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    {event ? 'Editar Evento' : 'Novo Evento'} <ChevronDown size={16} />
                </div>
                <div style={{ width: 60 }}></div>
            </div>

            <div className={`atm-value-section planning`}>
                <div className="atm-value-label">Título do evento</div>
                <div className="atm-value-input">
                    <input
                        className="atm-value-input-text"
                        placeholder="Ex: Reunião, Médico..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        autoFocus={!event}
                    />
                </div>
            </div>

            <div className="atm-body">
                {/* LOCATION */}
                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><MapPin size={18} /></div>
                        <input className="atm-input" placeholder="Adicionar local" value={location} onChange={e => setLocation(e.target.value)} />
                    </div>
                </div>

                {/* ALL DAY */}
                <div className="atm-row">
                    <div className="atm-label"><Clock size={18} /> Dia Inteiro</div>
                    <div className={`atm-toggle ${allDay ? 'checked' : ''} planning`} onClick={() => setAllDay(!allDay)}>
                        <div className="atm-toggle-handle"></div>
                    </div>
                </div>

                {/* DATES */}
                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <span style={{ fontSize: '0.9rem', width: 50, fontWeight: 600 }}>Início</span>
                        <input type="date" className="atm-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        {!allDay && <input type="time" className="atm-input" style={{ flex: '0 0 auto', width: 80 }} value={startTime} onChange={e => setStartTime(e.target.value)} />}
                    </div>
                    <div className="atm-field-item">
                        <span style={{ fontSize: '0.9rem', width: 50, fontWeight: 600 }}>Fim</span>
                        <input type="date" className="atm-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        {!allDay && <input type="time" className="atm-input" style={{ flex: '0 0 auto', width: 80 }} value={endTime} onChange={e => setEndTime(e.target.value)} />}
                    </div>
                </div>

                {/* SETTINGS */}
                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><Bell size={18} /></div>
                        <span style={{ flex: 1 }}>Lembrete</span>
                        <select className="atm-input" style={{ textAlign: 'right', fontWeight: 600 }} value={reminder} onChange={e => setReminder(e.target.value)}>
                            <option value="0">Sem aviso</option>
                            <option value="5">5 min antes</option>
                            <option value="10">10 min antes</option>
                            <option value="15">15 min antes</option>
                            <option value="30">30 min antes</option>
                            <option value="60">1 hora antes</option>
                        </select>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><Repeat size={18} /></div>
                        <span style={{ flex: 1 }}>Repetir</span>
                        <select className="atm-input" style={{ textAlign: 'right', fontWeight: 600 }} value={repeat} onChange={e => setRepeat(e.target.value)}>
                            <option value="none">Nunca</option>
                            <option value="daily">Diariamente</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="monthly">Mensalmente</option>
                        </select>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                </div>

                {/* EXTRA */}
                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><Tag size={18} /></div>
                        <select className="atm-input" value={type} onChange={e => setType(e.target.value)}>
                            <option value="work">Trabalho</option>
                            <option value="personal">Pessoal</option>
                            <option value="health">Saúde</option>
                            <option value="leisure">Lazer</option>
                        </select>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><AlignLeft size={18} /></div>
                        <input className="atm-input" placeholder="Descrição / Notas" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                <button className={`btn btn-primary`} style={{ width: '100%', height: '50px', fontSize: '1rem', borderRadius: '99px', background: '#f59e0b', marginTop: '1rem' }} onClick={handleSave}>
                    {loading ? 'Salvando...' : 'Salvar Evento'}
                </button>
            </div>
        </div>
    );
};

export default AddPlanningModal;
