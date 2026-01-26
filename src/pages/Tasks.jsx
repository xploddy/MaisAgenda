import React, { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Tasks.css';

// Fallback data for when Supabase is not connected
const MOCK_TASKS = [
    { id: 1, title: 'Preparar Apresentação', category: 'Trabalho', completed: false, priority: 'high' },
    { id: 2, title: 'Enviar Relatório', category: 'Trabalho', completed: true, priority: 'medium' },
    { id: 3, title: 'Comprar Passagens', category: 'Pessoal', completed: false, priority: 'low' },
    { id: 4, title: 'Atualizar Site', category: 'Projetos', completed: false, priority: 'high' },
];

const Tasks = () => {
    const [activeTab, setActiveTab] = useState('Todos');
    const [tasks, setTasks] = useState(MOCK_TASKS);

    // Attempt to fetch from Supabase on mount
    useEffect(() => {
        const fetchTasks = async () => {
            // Check if credentials exist
            if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) {
                console.log('Supabase credentials not found, using mock data.');
                return;
            }

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tasks:', error);
            } else if (data && data.length > 0) {
                setTasks(data);
            }
        };

        fetchTasks();
    }, []);

    const toggleTask = async (id) => {
        // Optimistic update
        const taskToUpdate = tasks.find(t => t.id === id);
        const updatedStatus = !taskToUpdate.completed;

        setTasks(tasks.map(t => t.id === id ? { ...t, completed: updatedStatus } : t));

        // Update in Supabase if configured
        if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) {
            await supabase.from('tasks').update({ completed: updatedStatus }).eq('id', id);
        }
    };

    const filteredTasks = activeTab === 'Todos'
        ? tasks
        : tasks.filter(t => t.category === activeTab);

    return (
        <div>
            <header className="tasks-header">
                <h1>Minhas Tarefas</h1>
                <button className="icon-btn">
                    <Plus size={24} className="text-primary" />
                </button>
            </header>

            {/* Tabs */}
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

            {/* List */}
            <div className="task-list">
                {filteredTasks.length === 0 ? (
                    <p className="text-muted text-center mt-10">Nenhuma tarefa encontrada.</p>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <div
                                className={`checkbox ${task.completed ? 'checked' : ''}`}
                                onClick={() => toggleTask(task.id)}
                            >
                                {task.completed && <Check size={16} color="white" />}
                            </div>
                            <div className="task-content">
                                <div className="task-title">{task.title}</div>
                            </div>
                            {task.priority === 'high' && <span className="badge badge-high">Alta</span>}
                            {task.priority === 'medium' && <span className="badge badge-medium">Media</span>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Tasks;
