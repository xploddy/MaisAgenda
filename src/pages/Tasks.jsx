import React, { useState, useEffect } from 'react';
import { Plus, Check, ChevronLeft, Calendar, X, Trash2, Edit2, Save, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Tasks.css';

const Tasks = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({ title: '', category: 'Trabalho', priority: 'medium', due_date: format(new Date(), 'yyyy-MM-dd') });

    useEffect(() => {
        fetchTasks();
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            openModal();
            navigate('/tasks', { replace: true });
        }
    }, [location]);

    const fetchTasks = async () => {
        // Try ordering by due_date first
        let { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true })
            .order('created_at', { ascending: false });

        // If it fails (likely due to missing column), fallback to original ordering
        if (error && error.message.includes('due_date')) {
            const fallback = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
            data = fallback.data;
        }

        if (data) setTasks(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            title: formData.title,
            category: formData.category,
            priority: formData.priority,
            user_id: user.id,
            completed: editingTask ? editingTask.completed : false
        };

        // Only add due_date to payload if column existed in fetch fallback logic check or just try-catch it
        // To be safe, we'll try to include it and notify user if it fails
        try {
            payload.due_date = formData.due_date ? new Date(formData.due_date).toISOString() : null;

            let result;
            if (editingTask) {
                result = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
            } else {
                result = await supabase.from('tasks').insert([payload]);
            }

            if (result.error) {
                if (result.error.message.includes('due_date')) {
                    // Fail gracefully by removing due_date and trying again
                    delete payload.due_date;
                    if (editingTask) {
                        result = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
                    } else {
                        result = await supabase.from('tasks').insert([payload]);
                    }
                }

                if (result.error) throw result.error;
            }

            fetchTasks();
            closeModal();
        } catch (err) {
            console.error("Save Error:", err);
            alert("Erro ao salvar: " + err.message + "\n\nNota: Verifique se você executou os comandos SQL do arquivo migrations.sql no seu painel Supabase.");
        }
    };

    const toggleTask = async (task) => {
        const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
        if (!error) fetchTasks();
    };

    const deleteTask = async (id) => {
        if (!window.confirm('Excluir esta tarefa?')) return;
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) fetchTasks();
    };

    const openModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                category: task.category,
                priority: task.priority,
                due_date: task.due_date ? format(parseISO(task.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
            });
        } else {
            setEditingTask(null);
            setFormData({ title: '', category: 'Trabalho', priority: 'medium', due_date: format(new Date(), 'yyyy-MM-dd') });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingTask(null); };

    const filteredTasks = tasks.filter(t => (activeTab === 'Todos' || t.category === activeTab));

    return (
        <div className="tasks-page animate-fade-in">
            <header className="tasks-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1>Minhas Tarefas</h1>
                <div style={{ width: 44 }}></div>
            </header>

            <div className="sub-tabs-container">
                {['Todos', 'Trabalho', 'Pessoal', 'Projetos'].map(tab => (
                    <button key={tab} className={`sub-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
                ))}
            </div>

            <div className="task-list">
                {filteredTasks.length === 0 ? (
                    <div className="empty-state">Nenhuma tarefa encontrada.</div>
                ) : (
                    filteredTasks.map(task => {
                        const dateObj = task.due_date ? parseISO(task.due_date) : null;
                        const isOverdue = dateObj && isPast(dateObj) && !isToday(dateObj) && !task.completed;

                        return (
                            <div key={task.id} className={`task-card-modern ${task.completed ? 'completed' : ''}`}>
                                <div className={`task-check ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task)}>
                                    {task.completed && <Check size={14} color="white" strokeWidth={4} />}
                                </div>
                                <div className="task-body" onClick={() => openModal(task)}>
                                    <div className="task-title-line">{task.title}</div>
                                    <div className="task-meta">
                                        {dateObj && (
                                            <span className={`task-date ${isOverdue ? 'overdue' : ''}`}>
                                                <Calendar size={12} /> {format(dateObj, "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                        )}
                                        <span className={`prio-tag ${task.priority}`}>{task.priority}</span>
                                    </div>
                                </div>
                                <div className="task-actions">
                                    <button onClick={() => deleteTask(task.id)} className="action-circle delete"><Trash2 size={14} /></button>
                                </div>
                                <div className="task-category-indicator">{task.category}</div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="fab" onClick={() => openModal()}><Plus size={32} /></button>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><Tag size={20} color="var(--color-primary)" /> {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">Descrição</label>
                            <div className="input-container">
                                <Plus size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Finalizar relatório" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <label className="form-label">Data de Entrega</label>
                            <div className="input-container">
                                <Calendar size={20} color="var(--color-text-muted)" />
                                <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Categoria</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option>Trabalho</option>
                                            <option>Pessoal</option>
                                            <option>Projetos</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Prioridade</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                            <option value="high">Alta</option>
                                            <option value="medium">Média</option>
                                            <option value="low">Baixa</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-submit"><Save size={20} /> Salvar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
