import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Check, ChevronLeft, Calendar, Save, ShoppingBag, Tag, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Shopping.css';
import './Tasks.css';

const Shopping = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState('Mercado');
    const [isByDate, setIsByDate] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: 'Mercado', due_date: format(new Date(), 'yyyy-MM-dd') });

    useEffect(() => {
        fetchItems();
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            openModal();
            navigate('/shopping', { replace: true });
        }
    }, [location]);

    const fetchItems = async () => {
        let { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .order('due_date', { ascending: true })
            .order('created_at', { ascending: false });

        if (error && error.message.includes('due_date')) {
            const fallback = await supabase.from('shopping_items').select('*').order('created_at', { ascending: false });
            data = fallback.data;
        }
        if (data) setItems(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            name: formData.name,
            category: formData.category,
            user_id: user.id,
            bought: editingItem ? editingItem.bought : false
        };

        try {
            // FIX: Using T12:00:00 to prevent timezone shifting (the day jumping bug)
            payload.due_date = formData.due_date ? new Date(`${formData.due_date}T12:00:00`).toISOString() : null;

            let result = editingItem
                ? await supabase.from('shopping_items').update(payload).eq('id', editingItem.id)
                : await supabase.from('shopping_items').insert([payload]);

            if (result.error && result.error.message.includes('due_date')) {
                delete payload.due_date;
                result = editingItem
                    ? await supabase.from('shopping_items').update(payload).eq('id', editingItem.id)
                    : await supabase.from('shopping_items').insert([payload]);
            }
            if (result.error) throw result.error;
            fetchItems();
            closeModal();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar item. Se o erro de coluna persistir, atualize a página (F5) para o cache do bando de dados atualizar.");
        }
    };

    const toggleItem = async (item) => {
        const { error } = await supabase.from('shopping_items').update({ bought: !item.bought }).eq('id', item.id);
        if (!error) fetchItems();
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await supabase.from('shopping_items').delete().eq('id', deleteId);
        setDeleteId(null);
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
                <div style={{ width: 44 }}></div>
            </header>

            <div className="sub-tabs-container">
                {tabs.map(tab => (
                    <button key={tab} className={`sub-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
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
                                    <button onClick={() => setDeleteId(item.id)} className="action-circle delete"><Trash2 size={14} /></button>
                                </div>
                                <div className="task-category-indicator">{item.category}</div>
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
                            <h3 className="modal-title"><ShoppingBag size={20} color="var(--color-primary)" /> {editingItem ? 'Editar Item' : 'Novo Item'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">Descrição do Item</label>
                            <div className="input-container">
                                <Plus size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Arroz" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <label className="form-label">Data Prevista</label>
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Item?</h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Deseja mesmo remover este item da sua lista?</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, background: 'var(--color-bg)' }} onClick={() => setDeleteId(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={confirmDelete}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shopping;
