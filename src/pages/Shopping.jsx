import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Shopping.css';
import './Tasks.css';

const Shopping = () => {
    const [activeTab, setActiveTab] = useState('Mercearia');
    const [items, setItems] = useState([]);
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
            const { error } = await supabase
                .from('shopping_items')
                .update({ ...formData })
                .eq('id', editingItem.id);
            if (!error) fetchItems();
        } else {
            const { error } = await supabase
                .from('shopping_items')
                .insert([{ ...formData, user_id: user.id, bought: false }]);
            if (!error) fetchItems();
        }
        closeModal();
    };

    const toggleItem = async (item) => {
        const { error } = await supabase
            .from('shopping_items')
            .update({ bought: !item.bought })
            .eq('id', item.id);
        if (!error) fetchItems();
    };

    const deleteItem = async (id) => {
        const { error } = await supabase.from('shopping_items').delete().eq('id', id);
        if (!error) setItems(items.filter(i => i.id !== id));
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

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const filteredItems = items.filter(i => i.category === activeTab);
    const tabs = ['Mercearia', 'Limpeza', 'Farmácia', 'Outros'];

    return (
        <div className="pb-20">
            <header className="shopping-header">
                <h1>Minhas Compras</h1>
                <button className="icon-btn text-primary" onClick={() => openModal()}>
                    <Plus size={24} />
                </button>
            </header>

            <div className="category-tabs">
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

            <div className="card mb-4 min-h-[300px]">
                <div className="shopping-list">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-muted">Nenhum item nesta lista.</div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className={`shopping-item ${item.bought ? 'bought' : ''}`}>
                                <div className="flex items-center gap-3 flex-1" onClick={() => toggleItem(item)}>
                                    <div className={`checkbox ${item.bought ? 'checked' : ''}`}>
                                        {item.bought && <Check size={16} color="white" />}
                                    </div>
                                    <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(item)} className="p-1 text-muted hover:text-blue-500">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => deleteItem(item.id)} className="p-1 text-muted hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingItem ? 'Editar Item' : 'Novo Item'}</h3>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-label">Nome do Item</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="form-input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {tabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-2">
                                {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shopping;
