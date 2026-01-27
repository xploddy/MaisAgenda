import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, X, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Finance.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros', 'Salário', 'Investimento'];

const Finance = () => {
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
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (!error && data) setTransactions(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            ...formData,
            amount: parseFloat(formData.amount),
            date: editingTrans ? editingTrans.date : new Date().toISOString()
        };

        if (editingTrans) {
            const { error } = await supabase.from('transactions').update(payload).eq('id', editingTrans.id);
            if (!error) fetchTransactions();
        } else {
            const { error } = await supabase.from('transactions').insert([{ ...payload, user_id: user.id }]);
            if (!error) fetchTransactions();
        }
        closeModal();
    };

    const deleteTransaction = async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (!error) setTransactions(transactions.filter(t => t.id !== id));
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

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTrans(null);
    };

    // Calculations
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = income - expense;

    const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {});

    const pieData = Object.keys(expensesByCategory).map(key => ({ name: key, value: expensesByCategory[key] }));

    return (
        <div className="pb-20">
            <header className="mb-6 pt-4">
                <h1 className="mb-4">Financeiro</h1>
                <div className="card-balance relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-sm opacity-80">Saldo Total</div>
                        <div className="text-3xl font-bold mt-1">
                            {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                                <TrendingDown size={16} className="text-red-300" />
                                {expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <div className="flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                                <TrendingUp size={16} className="text-green-300" />
                                {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="mb-6">
                <h2 className="section-title">Despesas por Categoria</h2>
                <div className="card h-64 flex items-center justify-center relative">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-muted text-sm">Sem dados de despesas</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-xs text-muted block">Total</span>
                            <span className="font-bold text-lg">{expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="section-title mb-0">Transações</h2>
                    <button onClick={() => openModal()} className="text-primary text-sm font-semibold hover:bg-blue-50 px-3 py-1 rounded-lg">+ Nova</button>
                </div>
                <div className="flex flex-col gap-2">
                    {transactions.map(t => (
                        <div key={t.id} className="card flex justify-between items-center py-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <DollarSign size={16} />
                                </div>
                                <div onClick={() => openModal(t)}>
                                    <div className="font-semibold text-sm">{t.title}</div>
                                    <div className="text-xs text-muted">{new Date(t.date || t.created_at).toLocaleDateString('pt-BR')} • {t.category}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                    {t.type === 'expense' ? '- ' : '+ '}{parseFloat(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </div>
                                <button className="text-muted hover:text-red-500" onClick={() => deleteTransaction(t.id)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 animate-fade-in mb-safe">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingTrans ? 'Editar Transação' : 'Nova Transação'}</h3>
                            <button onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm text-muted">Tipo</label>
                                <div className="flex gap-2 mt-1">
                                    <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} className={`flex-1 py-2 rounded-lg font-medium text-sm border ${formData.type === 'expense' ? 'bg-red-100 border-red-200 text-red-600' : 'border-gray-200'}`}>Despesa</button>
                                    <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} className={`flex-1 py-2 rounded-lg font-medium text-sm border ${formData.type === 'income' ? 'bg-green-100 border-green-200 text-green-600' : 'border-gray-200'}`}>Receita</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-muted">Valor</label>
                                <input type="number" step="0.01" required className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600 font-bold" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Descrição</label>
                                <input type="text" required className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Categoria</label>
                                <select className="w-full p-3 rounded-xl border dark:bg-slate-700 dark:border-slate-600" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary w-full py-3 mt-2">{editingTrans ? 'Salvar Alterações' : 'Salvar'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
