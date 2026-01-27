import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, X, ChevronLeft, Bell, Trash2, Edit2, Save, CreditCard } from 'lucide-react';
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
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setTransactions(data || []);
    };

    const handleSave = async (e) => {
        e.preventDefault();
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

    return (
        <div className="finance-page animate-fade-in">
            <header className="finance-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1>Financeiro</h1>
                <button className="icon-btn-ghost"><Bell size={24} /></button>
            </header>

            <div className="finance-header-card-modern">
                <div className="balance-info">
                    <span className="label">Saldo Disponível</span>
                    <span className="value">R$ {balanceTotal.toLocaleString('pt-BR')}</span>
                    <div className="summary-pills">
                        <div className="pill income"><TrendingUp size={12} /> {incomeTotal.toLocaleString('pt-BR')}</div>
                        <div className="pill expense"><TrendingDown size={12} /> {expenseTotal.toLocaleString('pt-BR')}</div>
                    </div>
                </div>
                <div className="mini-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[{ value: Math.max(0.1, incomeTotal) }, { value: Math.max(0.1, expenseTotal) }]}
                                innerRadius={25} outerRadius={35} dataKey="value"
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-container-modern">
                <h2>Fluxo por Categoria</h2>
                <div className="main-chart-box">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData} innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={4}
                            >
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={transactions.some(t => t.type === 'expense') ? COLORS[i % COLORS.length] : '#f1f5f9'} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="legend-strip-modern">
                    {pieData.map((entry, idx) => (
                        <div key={idx} className="legend-chip">
                            <span className="dot" style={{ background: COLORS[idx % COLORS.length] }}></span>
                            {entry.name}
                        </div>
                    ))}
                </div>
            </div>

            <section className="transactions-section">
                <div className="section-header">
                    <h2>Movimentações</h2>
                    <button className="add-trans-btn" onClick={() => openModal()}><Plus size={20} /></button>
                </div>
                {transactions.map(t => (
                    <div key={t.id} className="trans-list-item">
                        <div className={`trans-icon-bg ${t.type}`}>
                            <DollarSign size={18} />
                        </div>
                        <div className="trans-core" onClick={() => openModal(t)}>
                            <div className="trans-name">{t.title}</div>
                            <div className="trans-sub">{t.category}</div>
                        </div>
                        <div className="trans-right">
                            <div className={`trans-amt ${t.type}`}>{t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR')}</div>
                            <button className="trans-del" onClick={() => deleteTrans(t.id)}><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </section>

            <button className="fab" onClick={() => openModal()}><Plus size={32} /></button>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><CreditCard size={20} color="var(--color-primary)" /> Transação</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">Descrição</label>
                            <div className="input-container">
                                <Plus size={20} color="var(--color-text-muted)" />
                                <input autoFocus type="text" className="input-field" placeholder="Ex: Mercado mensal" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                            </div>

                            <label className="form-label">Valor (R$)</label>
                            <div className="input-container">
                                <DollarSign size={20} color="var(--color-primary)" />
                                <input type="number" step="0.01" className="input-field" style={{ fontSize: '1.5rem', fontWeight: 'bold' }} placeholder="0,00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Categoria</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Tipo</label>
                                    <div className="input-container">
                                        <select className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="expense">Despesa</option>
                                            <option value="income">Receita</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-submit" style={{ background: formData.type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                <Save size={20} /> Salvar Movimentação
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
