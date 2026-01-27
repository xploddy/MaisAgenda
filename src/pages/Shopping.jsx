import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Shopping.css';
import './Tasks.css';

const Shopping = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [activeTab, setActiveTab] = useState('Mercearia');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', category: 'Mercearia' });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) setItems(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingItem) {
            await supabase.from('shopping_items').update({ ...formData }).eq('id', editingItem.id);
        } else {
            await supabase.from('shopping_items').insert([{ ...formData, user_id: user.id, bought: false }]);
        }
        fetchItems();
        closeModal();
    };

    const toggleItem = async (item) => {
        const { error } = await supabase.from('shopping_items').update({ bought: !item.bought }).eq('id', item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, bought: !item.bought } : i));
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, category: item.category });
        } else {
            setEditingItem(null);
            setFormData({ name: '', category: activeTab });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

    const filteredItems = items.filter(i => i.category === activeTab);
    const tabs = ['Mercearia', 'Limpeza', 'Farmácia', 'Outros'];

    return (
        <div className="shopping-page animate-fade-in">
            <header className="shopping-header">
                <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Minhas Listas...</h1>
                <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                    <MoreHorizontal size={24} color="#6b7280" />
                </button>
            </header>

            <div className="category-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="shopping-list">
                {filteredItems.length === 0 ? (
                    <div className="text-center text-muted py-10">Lista vazia.</div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className={`shop-item ${item.bought ? 'bought' : ''}`}>
                            <div className={`checkbox-custom ${item.bought ? 'checked' : ''}`} onClick={() => toggleItem(item)}>
                                {item.bought && <Check size={16} color="white" />}
                            </div>
                            <div className="item-name" onClick={() => openModal(item)}>{item.name}</div>
                            <div className="check-badge">
                                <Check size={16} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="shop-footer">Histórico de Compras</div>

            <button className="fab" onClick={() => openModal()}>
                <Plus size={32} />
            </button>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'Editar Item' : 'Novo Item'}</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={closeModal}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Nome do Item</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {tabs.map(tab => <option key={tab}>{tab}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-full mt-4">Salvar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shopping;
