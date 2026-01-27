import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Edit3, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Tasks.css';

const Tasks = () => {
    const [activeTab, setActiveTab] = useState('Todos');
    const [tasks, setTasks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({ title: '', category: 'Trabalho', priority: 'medium' });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        if (!import.meta.env.VITE_SUPABASE_URL) return;
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
            const { error } = await supabase
                .from('tasks')
                .update({ ...formData })
                .eq('id', editingTask.id);
            if (!error) fetchTasks();
        } else {
            const { error } = await supabase
                .from('tasks')
                .insert([{ ...formData, user_id: user.id, completed: false }]);
            if (!error) fetchTasks();
        }
        closeModal();
    };

    const deleteTask = async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) setTasks(tasks.filter(t => t.id !== id));
    };

    const toggleTask = async (task) => {
        const { error } = await supabase
            .from('tasks')
            .update({ completed: !task.completed })
            .eq('id', task.id);
        if (!error) fetchTasks();
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

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const filteredTasks = activeTab === 'Todos'
        ? tasks
        : tasks.filter(t => t.category === activeTab);

    return (
        <div className="pb-20">
            <header className="tasks-header">
                <h1>Minhas Tarefas</h1>
                <button className="icon-btn text-primary" onClick={() => openModal()}>
                    <Plus size={24} />
                </button>
            </header>

            <div className="category-tabs">
                {['Todos', 'Trabalho', 'Pessoal', 'Projetos'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="task-list">
                {filteredTasks.length === 0 ? (
                    <p className="text-muted text-center mt-10">Nenhuma tarefa encontrada.</p>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <div
                                className={`checkbox ${task.completed ? 'checked' : ''}`}
                                onClick={() => toggleTask(task)}
                            >
                                {task.completed && <Check size={16} color="white" />}
                            </div>
                            <div className="task-content" onClick={() => openModal(task)}>
                                <div className="task-title">{task.title}</div>
                                <div className="text-xs text-muted">{task.category}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`badge badge-${task.priority}`}>
                                    {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baixa'}
                                </span>
                                <button className="text-muted hover:text-red-500" onClick={() => deleteTask(task.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-label">Título</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Trabalho">Trabalho</option>
                                    <option value="Pessoal">Pessoal</option>
                                    <option value="Projetos">Projetos</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prioridade</label>
                                <div className="flex gap-2">
                                    {['low', 'medium', 'high'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${formData.priority === p ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted border-border'}`}
                                            onClick={() => setFormData({ ...formData, priority: p })}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-2">
                                {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
