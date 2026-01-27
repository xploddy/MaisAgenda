import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, ChevronLeft, Calendar, Save, ShoppingBag, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Shopping.css';
import './Tasks.css';

const Shopping = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState('Mercado');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: 'Mercado', due_date: format(new Date(), 'yyyy-MM-dd') });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .order('due_date', { ascending: true })
            .order('created_at', { ascending: false });
        if (data) setItems(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            ...formData,
            user_id: user.id,
            bought: editingItem ? editingItem.bought : false
        };

        if (editingItem) {
            await supabase.from('shopping_items').update(payload).eq('id', editingItem.id);
        } else {
            await supabase.from('shopping_items').insert([payload]);
        }
        fetchItems();
        closeModal();
    };

    const toggleItem = async (item) => {
        await supabase.from('shopping_items').update({ bought: !item.bought }).eq('id', item.id);
        fetchItems();
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Excluir item?')) return;
        await supabase.from('shopping_items').delete().eq('id', id);
        fetchItems();
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                category: item.category,
                due_date: item.due_date ? format(parseISO(item.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
            });
        } else {
            setEditingItem(null);
            setFormData({ name: '', category: activeTab, due_date: format(new Date(), 'yyyy-MM-dd') });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

    const filteredItems = items.filter(i => i.category === activeTab);
    const tabs = ['Mercado', 'Casa', 'Pessoal', 'Outros'];

    return (
        <div className="shopping-page animate-fade-in">
            <header className="shopping-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1>Minhas Compras</h1>
                <button className="icon-btn-ghost" onClick={() => openModal()}><Plus size={24} color="var(--color-primary)" /></button>
            </header>

            <div className="sub-tabs-container">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`sub-tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="shopping-list">
                {filteredItems.length === 0 ? (
                    <div className="empty-state">Lista vazia.</div>
                ) : (
                    filteredItems.map(item => {
                        const dateObj = item.due_date ? parseISO(item.due_date) : null;
                        const isOverdue = dateObj && isPast(dateObj) && !isToday(dateObj) && !item.bought;

                        return (
                            <div key={item.id} className={`task-card-modern ${item.bought ? 'completed' : ''}`}>
                                <div className={`task-check ${item.bought ? 'checked' : ''}`} onClick={() => toggleItem(item)}>
                                    {item.bought && <Check size={14} color="white" strokeWidth={4} />}
                                </div>
                                <div className="task-body" onClick={() => openModal(item)}>
                                    <div className="task-title-line">{item.name}</div>
                                    <div className="task-meta">
                                        {dateObj && (
                                            <span className={`task-date ${isOverdue ? 'overdue' : ''}`}>
                                                <Calendar size={12} /> {format(dateObj, "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="task-actions">
                                    <button onClick={() => deleteItem(item.id)} className="action-circle delete"><Trash2 size={14} /></button>
                                </div>
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
                            <h3 className="modal-title"><ShoppingBag size={20} color="var(--color-primary)" /> {editingItem ? 'Editar Item' : 'Novo Item'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">O que você precisa comprar?</label>
                            <div className="input-container">
                                <Plus size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Arroz" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <label className="form-label">Dia planejado para compra</label>
                            <div className="input-container">
                                <Calendar size={20} color="var(--color-text-muted)" />
                                <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>

                            <label className="form-label">Categoria</label>
                            <div className="input-container">
                                <Tag size={20} color="var(--color-text-muted)" />
                                <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {tabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary btn-submit">
                                <Save size={20} /> {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shopping;
