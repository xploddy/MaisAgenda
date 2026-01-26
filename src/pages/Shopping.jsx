import React, { useState } from 'react';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import './Shopping.css';
import './Tasks.css'; // Reusing tabs styles

const SHOPPING_DATA = [
    { id: 1, name: 'Leite', category: 'Mercearia', bought: false },
    { id: 2, name: 'Pão Integral', category: 'Mercearia', bought: true },
    { id: 3, name: 'Detergente', category: 'Limpeza', bought: false },
    { id: 4, name: 'Aspirina', category: 'Farmácia', bought: false },
];

const Shopping = () => {
    const [activeTab, setActiveTab] = useState('Mercearia');
    const [items, setItems] = useState(SHOPPING_DATA);

    const toggleItem = (id) => {
        setItems(items.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
    };

    const filteredItems = activeTab === 'Todos'
        ? items
        : items.filter(i => i.category === activeTab);

    const tabs = ['Mercearia', 'Limpeza', 'Farmácia', 'Outros'];

    return (
        <div>
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

            <div className="card">
                <div className="shopping-list">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-muted">Lista vazia.</div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className={`shopping-item ${item.bought ? 'bought' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`checkbox ${item.bought ? 'checked' : ''}`}
                                        onClick={() => toggleItem(item.id)}
                                    ></div>
                                    <span>{item.name}</span>
                                </div>
                                {item.bought && <Trash2 size={16} className="text-muted" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button className="btn btn-primary" style={{ position: 'fixed', bottom: '100px', right: '20px', borderRadius: '50%', width: '56px', height: '56px', padding: 0 }}>
                <Plus size={24} />
            </button>
        </div>
    );
};

export default Shopping;
