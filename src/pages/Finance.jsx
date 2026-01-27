import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
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

            if (error) {
                console.error("Supabase error:", error);
            } else {
                setTransactions(data || []);
            }
        } catch (err) {
            console.error("Fetch error:", err);
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
            console.error("Save error:", err);
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

    // Derived State
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
        : [{ name: 'Nenhuma', value: 1 }];

    const barData = [
        { name: 'Jan', val: 1200 }, { name: 'Fev', val: 2100 },
        { name: 'Mar', val: 800 }, { name: 'Abr', val: Math.max(0, balanceTotal) }
    ];

    return (
        <div className="finance-page animate-fade-in">
            <header className="flex justify-between items-center mb-6">
                <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={() => navigate('/')}>
                    <ChevronLeft size={24} color="#6b7280" />
                </button>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>SmartOrganizer</h1>
                <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                    <Bell size={24} color="#6b7280" />
                </button>
            </header>

            <div className="finance-header-card">
                <div className="finance-summary-info">
                    <div className="summary-line">Saldo: <span className="summary-value">R$ {balanceTotal.toLocaleString('pt-BR')}</span></div>
                    <div className="summary-line" style={{ opacity: 0.8 }}>Despesas: <span className="summary-value">R$ {expenseTotal.toLocaleString('pt-BR')}</span></div>
                    <div className="summary-line" style={{ opacity: 0.8 }}>Receitas: <span className="summary-value">R$ {incomeTotal.toLocaleString('pt-BR')}</span></div>
                </div>
                <div style={{ width: 80, height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[{ value: Math.max(0.1, incomeTotal) }, { value: Math.max(0.1, expenseTotal) }]}
                                innerRadius={25}
                                outerRadius={35}
                                dataKey="value"
                                startAngle={90}
                                endAngle={450}
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-card">
                <h2 style={{ color: 'var(--color-text-main)' }}>Despesas do Mês</h2>
                <div className="chart-layout">
                    <div style={{ width: 140, height: 140 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={45}
                                    outerRadius={65}
                                    dataKey="value"
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={expensesByCategory[pieData[i].name] ? COLORS[i % COLORS.length] : '#e2e8f0'} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="legend-grid">
                        {transactions.filter(t => t.type === 'expense').length > 0 ? (
                            pieData.slice(0, 4).map((entry, idx) => (
                                <div key={idx} className="legend-item" style={{ color: 'var(--color-text-muted)' }}>
                                    <div className="legend-dot" style={{ background: COLORS[idx % COLORS.length] }}></div>
                                    {entry.name}
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-muted">Sem despesas</div>
                        )}
                    </div>
                </div>

                <div style={{ width: '100%', height: 80, marginTop: '2rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={i === 3 ? '#3b82f6' : '#e2e8f0'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title mb-0" style={{ color: 'var(--color-text-main)' }}>Recentes</h2>
                    <button className="icon-btn" style={{ padding: '0.4rem', border: 'none', background: 'transparent', boxShadow: 'none' }} onClick={() => openModal()}>
                        <Plus size={20} color="#1d4ed8" />
                    </button>
                </div>
                {transactions.length === 0 ? (
                    <p className="text-center text-muted py-4">Nenhuma transação.</p>
                ) : (
                    transactions.map(t => (
                        <div key={t.id} className="trans-item">
                            <div className="trans-main">
                                <div className="checkbox-custom checked" style={{ borderRadius: '50%', width: 18, height: 18, background: t.type === 'income' ? '#10b981' : '#f43f5e', border: 'none' }}>
                                    <Check size={12} color="white" />
                                </div>
                                <div className="trans-desc" style={{ color: 'var(--color-text-main)' }}>{t.title}</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`trans-value ${t.type}`} style={{ color: t.type === 'income' ? '#10b981' : '#f43f5e' }}>{t.type === 'expense' ? '- ' : '+ '}R$ {Number(t.amount).toLocaleString('pt-BR')}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(t)} className="icon-btn" style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '0.3rem' }}><Edit2 size={14} /></button>
                                    <button onClick={() => deleteTrans(t.id)} className="icon-btn" style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem' }}><Trash2 size={14} /></button>
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
                            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-main)' }}>{editingTrans ? 'Editar Transação' : 'Nova Transação'}</h3>
                            <button className="icon-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={closeModal}><X size={24} color="var(--color-text-main)" /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Valor (R$)</label>
                                <input autoFocus type="number" step="0.01" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input type="text" className="form-input" placeholder="O que você comprou?" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select className="form-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <div className="flex gap-2">
                                    <button type="button" className={`flex-1 btn ${formData.type === 'expense' ? 'btn-primary' : ''}`} style={{ background: formData.type === 'expense' ? '#f43f5e' : '' }} onClick={() => setFormData({ ...formData, type: 'expense' })}>Despesa</button>
                                    <button type="button" className={`flex-1 btn ${formData.type === 'income' ? 'btn-primary' : ''}`} style={{ background: formData.type === 'income' ? '#10b981' : '' }} onClick={() => setFormData({ ...formData, type: 'income' })}>Receita</button>
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
