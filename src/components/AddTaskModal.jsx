import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, FileText, Check, Flag } from 'lucide-react';
import './AddTransactionModal.css';
import { format, addDays, parseISO } from 'date-fns';
import { supabase } from '../supabaseClient';

const AddTaskModal = ({ onClose, task = null }) => {
    const [title, setTitle] = useState('');
    const [dateTab, setDateTab] = useState('today');
    const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [priority, setPriority] = useState(false); // false = normal, true = high
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const dateInputRef = useRef(null);

    useEffect(() => {
        if (task) {
            // Split title if it contains description (from previous hack) or just set title
            // If we standardized 'Title - Desc', we could split. But for now, just load title.
            // If DB 'title' has everything, just show it.
            setTitle(task.title);
            if (task.priority === 'high') setPriority(true);

            if (task.due_date) {
                const d = parseISO(task.due_date);
                setCustomDate(format(d, 'yyyy-MM-dd'));
                // Determine tab?
                const today = format(new Date(), 'yyyy-MM-dd');
                const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                const dStr = format(d, 'yyyy-MM-dd');
                if (dStr === today) setDateTab('today');
                else if (dStr === tomorrow) setDateTab('tomorrow');
                else setDateTab('other');
            }
        }
    }, [task]);

    const handleSave = async () => {
        if (!title.trim()) return alert('Digite o título da tarefa');
        setLoading(true);

        let finalDate = new Date();
        if (dateTab === 'tomorrow') finalDate = addDays(new Date(), 1);
        else if (dateTab === 'other') finalDate = parseISO(customDate);
        else if (dateTab === 'today') finalDate = new Date(); // Explicitly reset to today if tab is today

        // If editing, use existing date logic or override? 
        // Logic above sets date based on UI.

        const finalTitle = description ? `${title} - ${description}` : title;

        const payload = {
            title: finalTitle,
            completed: task ? task.completed : false,
            priority: priority ? 'high' : 'normal',
            due_date: finalDate.toISOString(),
            category: 'Geral', // Required by DB, hardcoded as per request "no categories in UI"
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        let result;
        if (task) {
            result = await supabase.from('tasks').update(payload).eq('id', task.id);
        } else {
            result = await supabase.from('tasks').insert([payload]);
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
            <div className={`atm-header task`}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}><span style={{ fontSize: '1rem' }}>Cancelar</span></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    {task ? 'Editar Tarefa' : 'Nova Tarefa'} <ChevronDown size={16} />
                </div>
                <div style={{ width: 60 }}></div>
            </div>

            <div className={`atm-value-section task`}>
                <div className="atm-value-label">O que precisa ser feito?</div>
                <div className="atm-value-input">
                    <input
                        className="atm-value-input-text"
                        placeholder="Nome da tarefa..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        autoFocus={!task}
                    />
                </div>
            </div>

            <div className="atm-body">
                <div className="atm-row">
                    <div className="atm-label"><Flag size={18} /> {priority ? 'Alta Prioridade' : 'Normal'}</div>
                    <div className={`atm-toggle ${priority ? 'checked' : ''} task`} onClick={() => setPriority(!priority)}>
                        <div className="atm-toggle-handle"></div>
                    </div>
                </div>

                <div className="atm-row">
                    <div className="atm-label"><Calendar size={18} /> Data</div>
                    <div className="atm-date-tabs">
                        <button className={`atm-date-tab ${dateTab === 'today' ? 'active' : ''}`} onClick={() => setDateTab('today')}>Hoje</button>
                        <button className={`atm-date-tab ${dateTab === 'tomorrow' ? 'active' : ''}`} onClick={() => setDateTab('tomorrow')}>Amanhã</button>
                        <button className={`atm-date-tab ${dateTab === 'other' ? 'active' : ''}`} onClick={() => {
                            setDateTab('other');
                            setTimeout(() => dateInputRef.current?.showPicker(), 100);
                        }}>Outros</button>
                        <input type="date" ref={dateInputRef} style={{ position: 'absolute', opacity: 0, width: 1, height: 1, bottom: 0 }} value={customDate} onChange={e => setCustomDate(e.target.value)} />
                    </div>
                </div>

                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><FileText size={18} /></div>
                        <input className="atm-input" placeholder="Detalhes adicionais" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                <button className={`btn btn-primary`} style={{ width: '100%', height: '50px', fontSize: '1rem', borderRadius: '99px', background: '#8b5cf6', marginTop: '1rem' }} onClick={handleSave}>
                    {loading ? 'Salvando...' : 'Salvar Tarefa'}
                </button>
            </div>
        </div>
    );
};

export default AddTaskModal;
