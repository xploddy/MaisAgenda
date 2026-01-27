import React, { useState, useEffect } from 'react';
import { Plus, Check, ChevronLeft, Calendar, Trash2, Edit3, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Tasks.css';

const Tasks = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('Todos');
    const [timeFilter, setTimeFilter] = useState('Hoje');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({ title: '', category: 'Trabalho', priority: 'medium' });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) setTasks(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingTask) {
            await supabase.from('tasks').update({ ...formData }).eq('id', editingTask.id);
        } else {
            await supabase.from('tasks').insert([{ ...formData, user_id: user.id, completed: false }]);
        }
        fetchTasks();
        closeModal();
    };

    const toggleTask = async (task) => {
        await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    };

    const openModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            setFormData({ title: task.title, category: task.category, priority: task.priority });
        } else {
            setEditingTask(null);
            setFormData({ title: '', category: 'Trabalho', priority: 'medium' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingTask(null); };

    const filteredTasks = tasks.filter(t => (activeTab === 'Todos' || t.category === activeTab));

    return (
        <div className="tasks-page animate-fade-in">
            <header className="tasks-header">
                <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1>Minhas Tarefas</h1>
                <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={() => openModal()}>
                    <Plus size={24} color="#1d4ed8" />
                </button>
            </header>

            {/* Category Filter Tabs */}
            <div className="category-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['Trabalho', 'Pessoal', 'Projetos', 'Todos'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Time Filter Tabs (Hoje, Semana, Todas) */}
            <div className="sub-tabs">
                {['Hoje', 'Semana', 'Todas'].map(filter => (
                    <button
                        key={filter}
                        className={`sub-tab-btn ${timeFilter === filter ? 'active' : ''}`}
                        onClick={() => setTimeFilter(filter)}
                    >
                        <div className="flex items-center justify-center gap-1">
                            {filter === 'Hoje' && <Calendar size={14} />}
                            {filter}
                        </div>
                    </button>
                ))}
            </div>

            <div className="task-list">
                {filteredTasks.length === 0 ? (
                    <div className="text-center text-muted py-10">Sem tarefas nesta categoria.</div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <div className={`task-checkbox ${task.completed ? 'checked' : ''}`} onClick={() => toggleTask(task)}>
                                {task.completed && <Check size={16} color="white" />}
                            </div>
                            <div className="task-main" onClick={() => openModal(task)}>
                                <div className="task-title">{task.title}</div>
                                {task.priority === 'high' && <span className="priority-badge high">Alta Prioridade</span>}
                                {task.priority === 'medium' && <span className="priority-badge medium">Média Prioridade</span>}
                            </div>
                            <div className="task-status-icon">
                                <Check size={16} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal remains standardized from index.css logic, updating its inner labels/inputs */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={closeModal}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">O que precisa ser feito?</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Trabalho</option>
                                    <option>Pessoal</option>
                                    <option>Projetos</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prioridade</label>
                                <div className="flex gap-2">
                                    {['low', 'medium', 'high'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`flex-1 btn ${formData.priority === p ? 'btn-primary' : ''}`}
                                            style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                                            onClick={() => setFormData({ ...formData, priority: p })}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
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

export default Tasks;
