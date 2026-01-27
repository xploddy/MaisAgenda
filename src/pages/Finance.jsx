import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, X, ChevronLeft, Bell, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Finance.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros', 'Salário', 'Investimento'];

const Finance = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrans, setEditingTrans] = useState(null);
    const [formData, setFormData] = useState({ title: '', amount: '', type: 'expense', category: 'Outros' });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error) setTransactions(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const payload = {
                title: formData.title,
                amount: parseFloat(formData.amount),
                type: formData.type,
                category: formData.category,
                user_id: user.id,
                date: editingTrans ? editingTrans.date : new Date().toISOString()
            };

            if (editingTrans) {
                await supabase.from('transactions').update(payload).eq('id', editingTrans.id);
            } else {
                await supabase.from('transactions').insert([payload]);
            }
            fetchTransactions();
            closeModal();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteTrans = async (id) => {
        if (!window.confirm('Excluir transação?')) return;
        await supabase.from('transactions').delete().eq('id', id);
        fetchTransactions();
    };

    const openModal = (trans = null) => {
        if (trans) {
            setEditingTrans(trans);
            setFormData({ title: trans.title, amount: trans.amount, type: trans.type, category: trans.category });
        } else {
            setEditingTrans(null);
            setFormData({ title: '', amount: '', type: 'expense', category: 'Outros' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingTrans(null); };

    const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balanceTotal = incomeTotal - expenseTotal;

    const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {});

    const pieData = Object.keys(expensesByCategory).length > 0
        ? Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] }))
        : [{ name: 'Vazio', value: 1 }];

    const barData = [
        { name: 'Jan', val: 1200 }, { name: 'Fev', val: 2100 },
        { name: 'Mar', val: 800 }, { name: 'Abr', val: Math.max(0, balanceTotal) }
    ];

    return (
        <div className="finance-page animate-fade-in" style={{ minHeight: '100vh' }}>
            <header className="flex justify-between items-center mb-6">
                <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>SmartOrganizer</h1>
                <button className="icon-btn" style={{ background: 'transparent', border: 'none' }}><Bell size={24} color="#6b7280" /></button>
            </header>

            <div className="finance-header-card">
                <div className="finance-summary-info">
                    <div className="summary-line">Saldo: <span className="summary-value">R$ {balanceTotal.toLocaleString('pt-BR')}</span></div>
                    <div className="summary-line" style={{ opacity: 0.8 }}>Desp: R$ {expenseTotal.toLocaleString('pt-BR')}</div>
                    <div className="summary-line" style={{ opacity: 0.8 }}>Rec: R$ {incomeTotal.toLocaleString('pt-BR')}</div>
                </div>
                {/* Fixed height container for PieChart to prevent flash/blanking */}
                <div style={{ width: 80, height: 80, minHeight: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[{ value: Math.max(0.1, incomeTotal) }, { value: Math.max(0.1, expenseTotal) }]}
                                innerRadius={22}
                                outerRadius={32}
                                dataKey="value"
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-card">
                <h2 style={{ color: 'var(--color-text-main)' }}>Despesas por Categoria</h2>
                <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={60}
                                outerRadius={85}
                                dataKey="value"
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={transactions.some(t => t.type === 'expense') ? COLORS[i % COLORS.length] : '#f1f5f9'} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="legend-grid" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                    {transactions.filter(t => t.type === 'expense').length > 0 ?
                        pieData.map((entry, idx) => (
                            <div key={idx} className="legend-item" style={{ fontSize: '0.7rem' }}>
                                <div className="legend-dot" style={{ background: COLORS[idx % COLORS.length] }}></div>
                                {entry.name}
                            </div>
                        )) : <p className="text-xs text-muted">Sem despesas registradas</p>
                    }
                </div>
            </div>

            <section style={{ marginBottom: '2rem' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title mb-0" style={{ color: 'var(--color-text-main)' }}>Transações</h2>
                </div>
                {transactions.length === 0 ? (
                    <p className="text-center text-muted py-4">Nenhuma movimentação.</p>
                ) : (
                    transactions.map(t => (
                        <div key={t.id} className="trans-item">
                            <div className="trans-main">
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.type === 'income' ? '#10b981' : '#f43f5e' }}></div>
                                <div className="trans-desc" style={{ color: 'var(--color-text-main)' }}>{t.title}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`trans-value ${t.type}`} style={{ color: t.type === 'income' ? '#10b981' : '#f43f5e' }}>
                                    {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR')}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openModal(t)} className="p-1 text-blue-400"><Edit2 size={14} /></button>
                                    <button onClick={() => deleteTrans(t.id)} className="p-1 text-red-400"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>

            <button className="fab" onClick={() => openModal()}>
                <Plus size={32} />
            </button>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-main)' }}>Movimentação</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none' }} onClick={closeModal}><X size={24} color="var(--color-text-main)" /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input autoFocus type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Valor (R$)</label>
                                <input type="number" step="0.01" className="form-input" style={{ fontSize: '1.25rem', fontWeight: 'bold' }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <div className="flex gap-2">
                                    <button type="button" className={`flex-1 btn ${formData.type === 'expense' ? 'btn-primary' : ''}`} style={{ background: formData.type === 'expense' ? '#f43f5e' : '#f1f5f9' }} onClick={() => setFormData({ ...formData, type: 'expense' })}>Despesa</button>
                                    <button type="button" className={`flex-1 btn ${formData.type === 'income' ? 'btn-primary' : ''}`} style={{ background: formData.type === 'income' ? '#10b981' : '#f1f5f9' }} onClick={() => setFormData({ ...formData, type: 'income' })}>Receita</button>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary w-full mt-4">Salvar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
