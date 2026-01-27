import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Shopping.css';
import './Tasks.css';

const Shopping = () => {
    const [activeTab, setActiveTab] = useState('Mercearia');
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const { data, error } = await supabase
            .from('shopping_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching shopping items:', error);
        else setItems(data || []);
    };

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        // Optimistic update
        const tempId = Date.now();
        const newItem = { id: tempId, name: newItemName, category: activeTab, bought: false };
        setItems([newItem, ...items]);
        setNewItemName('');
        setIsAdding(false);

        const { data, error } = await supabase
            .from('shopping_items')
            .insert([{ name: newItem.name, category: newItem.category, user_id: (await supabase.auth.getUser()).data.user.id }])
            .select();

        if (error) {
            console.error('Error adding item:', error);
            // Revert if error (simplified: just refetch)
            fetchItems();
        } else {
            // Replace temp item with real one
            setItems(prev => prev.map(i => i.id === tempId ? data[0] : i));
        }
    };

    const toggleItem = async (id, currentStatus) => {
        // Optimistic
        setItems(items.map(i => i.id === id ? { ...i, bought: !currentStatus } : i));

        const { error } = await supabase
            .from('shopping_items')
            .update({ bought: !currentStatus })
            .eq('id', id);

        if (error) console.error('Error updating item:', error);
    };

    const deleteItem = async (id) => {
        // Optimistic
        setItems(items.filter(i => i.id !== id));

        const { error } = await supabase
            .from('shopping_items')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting item:', error);
    };

    const filteredItems = items.filter(i => i.category === activeTab);
    const tabs = ['Mercearia', 'Limpeza', 'Farmácia', 'Outros'];

    return (
        <div className="pb-20">
            <header className="shopping-header">
                <h1>Minhas Compras</h1>
                <button className="icon-btn">
                    <MoreHorizontal size={24} />
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
                                <div className="flex items-center gap-3 flex-1">
                                    <div
                                        className={`checkbox ${item.bought ? 'checked' : ''}`}
                                        onClick={() => toggleItem(item.id, item.bought)}
                                    ></div>
                                    <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <button onClick={() => deleteItem(item.id)} className="p-2 text-muted hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Item Form/Button */}
            {isAdding ? (
                <form onSubmit={addItem} className="fixed bottom-[90px] left-4 right-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-blue-100 dark:border-slate-700 animate-fade-in z-50">
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Adicionar em ${activeTab}...`}
                            className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 focus:outline-none"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl font-bold">OK</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-600 p-3 rounded-xl">X</button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn btn-primary shadow-lg hover:scale-105 transition-transform"
                    style={{ position: 'fixed', bottom: '100px', right: '20px', borderRadius: '50%', width: '56px', height: '56px', padding: 0, zIndex: 40 }}
                >
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
};

export default Shopping;
