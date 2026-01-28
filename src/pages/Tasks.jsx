import React, { useState, useEffect } from 'react';
import { Plus, Check, ChevronLeft, Calendar, X, Trash2, Edit2, Save, Tag, AlertCircle, Menu, CheckSquare, LogOut, User, Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Tasks.css';

const Tasks = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
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
        let { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('due_date', { ascending: true })
            .order('created_at', { ascending: false });

        if (error && error.message.includes('due_date')) {
            const fallback = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
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

        try {
            payload.due_date = formData.due_date ? new Date(`${formData.due_date}T12:00:00`).toISOString() : null;

            let result = editingTask
                ? await supabase.from('tasks').update(payload).eq('id', editingTask.id)
                : await supabase.from('tasks').insert([payload]);

            if (result.error && result.error.message.includes('due_date')) {
                delete payload.due_date;
                result = editingTask
                    ? await supabase.from('tasks').update(payload).eq('id', editingTask.id)
                    : await supabase.from('tasks').insert([payload]);
            }
            if (result.error) throw result.error;
            fetchTasks();
            closeModal();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar tarefa. Verifique as migrações SQL.");
        }
    };

    const toggleTask = async (task) => {
        const { error } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
        if (!error) fetchTasks();
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await supabase.from('tasks').delete().eq('id', deleteId);
        setDeleteId(null);
        fetchTasks();
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
            <header className="top-bar-modern">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="page-title">Tarefa</h1>
                <div className="header-actions">
                    <button className="icon-action-btn no-bg" style={{ boxShadow: 'none' }}><CheckSquare size={24} color="var(--color-primary)" /></button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}><Menu size={24} /></button>
                </div>
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
                                    <button onClick={() => setDeleteId(task.id)} className="action-circle delete"><Trash2 size={14} /></button>
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
                    <div className="modal-content scrollable-modal" onClick={e => e.stopPropagation()}>
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

                            <div className="form-grid" style={{ gap: '1rem' }}>
                                <div>
                                    <label className="form-label">Categoria</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            <option>Trabalho</option><option>Pessoal</option><option>Projetos</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Prioridade</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                            <option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-submit"><Save size={20} /> Salvar</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <div className="modal-overlay" style={{ alignItems: 'center' }}>
                    <div className="modal-content animate-fade-in" style={{ textAlign: 'center', maxWidth: '320px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Tarefa?</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Esta ação é permanente. Deseja continuar?</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, background: 'var(--color-bg)' }} onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={confirmDelete}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR MENU */}
            {showMenu && (
                <div className="modal-overlay" onClick={() => setShowMenu(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: 0 }}>
                    <div className="modal-content animate-slide-right" onClick={e => e.stopPropagation()} style={{ width: '280px', height: '100%', borderRadius: 0, padding: '2rem 1.5rem' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Menu</h3>
                            <button className="modal-close-btn" onClick={() => setShowMenu(false)}><X size={20} /></button>
                        </div>
                        <div className="menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => navigate('/profile')} className="btn menu-btn">
                                <User size={20} /> Meu Perfil
                            </button>
                            <button onClick={() => { toggleTheme(); setShowMenu(false); }} className="btn menu-btn">
                                {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />} Tema {currentTheme === 'light' ? 'Escuro' : 'Claro'}
                            </button>
                            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn menu-btn">
                                <LogOut size={20} /> Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
