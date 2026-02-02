import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft, Calendar, Trash2, Tag, Menu, CheckSquare, LogOut, User, Moon, Sun, AlertCircle, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Tasks.css';
import AddTaskModal from '../components/AddTaskModal';

const Tasks = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('Todos');
    const [editingTask, setEditingTask] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, [location]); // Reload on location change (e.g. if navigated from Navbar add)

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
                                <div className="task-body" onClick={() => setEditingTask(task)}>
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
                            </div>
                        );
                    })
                )}
            </div>

            {/* Using Shared AddTaskModal for Editing */}
            {editingTask && <AddTaskModal task={editingTask} onClose={() => { setEditingTask(null); fetchTasks(); }} />}

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
