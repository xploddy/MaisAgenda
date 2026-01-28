import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, Minus, X, ChevronLeft, CreditCard, Trash2, Edit2, Save, Search, Menu, Filter, Calendar, AlertCircle, CheckCircle2, RotateCcw, LogOut, User, Moon, Sun, ChevronRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isSameMonth, setMonth, subYears, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import './Finance.css';

const COLORS = [
    '#3b82f6', // azul
    '#10b981', // verde
    '#f59e0b', // amarelo
    '#ef4444', // vermelho
    '#8b5cf6', // roxo
    '#06b6d4', // ciano
    '#22c55e', // verde claro
    '#eab308', // amarelo escuro
    '#f97316', // laranja
    '#ec4899', // rosa
    '#64748b', // cinza
    '#14b8a6'  // teal
];

const CATEGORIES = [
    'Alimentação',
    'Assinaturas',
    'Educação',
    'Investimento',
    'Lazer',
    'Moradia',
    'Outros',
    'Presentes',
    'Saúde',
    'Salário',
    'Trabalho',
    'Transporte',
    'Vendas'
];

const Finance = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrans, setEditingTrans] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [addToPlanning, setAddToPlanning] = useState(true);
    const [formData, setFormData] = useState({
        title: '', amount: '', type: 'expense', category: 'Outros',
        status: 'paid', date: format(new Date(), 'yyyy-MM-dd'),
        repeatCount: 1
    });

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [transactions, searchTerm, filterType, selectedMonth]);

    const fetchTransactions = async () => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
        if (!error) setTransactions(data || []);
    };

    const applyFilters = () => {
        let docs = [...transactions];
        docs = docs.filter(t => isSameMonth(parseISO(t.date), selectedMonth));
        if (filterType !== 'all') docs = docs.filter(t => t.type.toLowerCase() === filterType);
        if (searchTerm) {
            docs = docs.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredTransactions(docs);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const count = formData.repeatCount;
        const baseDate = new Date(`${formData.date}T12:00:00`);
        const groupId = count > 1 ? crypto.randomUUID() : null;

        const transactionPayloads = [];
        const eventPayloads = [];

        for (let i = 0; i < count; i++) {
            const date = new Date(baseDate);
            date.setMonth(date.getMonth() + i);
            const dateStr = date.toISOString().split('T')[0];
            const displayTitle = formData.title + (count > 1 ? ` (${i + 1}/${count})` : '');

            transactionPayloads.push({
                title: displayTitle,
                amount: parseFloat(formData.amount),
                type: formData.type.toLowerCase(),
                category: formData.category,
                status: formData.status,
                date: dateStr,
                recurring_group_id: groupId,
                user_id: user.id
            });

            if (addToPlanning) {
                eventPayloads.push({
                    title: `💰 ${displayTitle} (R$ ${formData.amount})`,
                    start_time: date.toISOString(),
                    type: formData.type === 'income' ? 'health' : 'work',
                    description: `Lançamento financeiro: ${formData.category}. Status: ${formData.status === 'paid' ? 'Liquidada' : 'Pendente'}`,
                    user_id: user.id
                });
            }
        }

        try {
            if (editingTrans) {
                await supabase.from('transactions').update(transactionPayloads[0]).eq('id', editingTrans.id);
            } else {
                await supabase.from('transactions').insert(transactionPayloads);
                if (addToPlanning && eventPayloads.length > 0) {
                    await supabase.from('calendar_events').insert(eventPayloads);
                }
            }
            fetchTransactions();
            closeModal();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar.");
        }
    };

    const deleteTransaction = async (scope) => {
        if (!deleteItem) return;
        try {
            if (scope === 'one') {
                await supabase.from('transactions').delete().eq('id', deleteItem.id);
            } else if (scope === 'future' && deleteItem.recurring_group_id) {
                await supabase.from('transactions')
                    .delete()
                    .eq('recurring_group_id', deleteItem.recurring_group_id)
                    .gte('date', deleteItem.date);
            }
            setDeleteItem(null);
            fetchTransactions();
        } catch (err) {
            console.error(err);
            alert("Erro ao excluir registro.");
        }
    };

    const openModal = (trans = null) => {
        if (trans) {
            setEditingTrans(trans);
            setFormData({
                title: trans.title, amount: trans.amount, type: trans.type.toLowerCase(),
                category: trans.category, status: trans.status || 'paid',
                date: trans.date, repeatCount: 1
            });
        } else {
            setEditingTrans(null);
            setFormData({
                title: '', amount: '', type: 'expense', category: 'Outros',
                status: 'paid', date: format(new Date(), 'yyyy-MM-dd'), repeatCount: 1
            });
        }
        setAddToPlanning(true);
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingTrans(null); };

    const handleMonthSelect = (m) => {
        setSelectedMonth(setMonth(selectedMonth, m));
        setIsMonthPickerOpen(false);
    };

    const adjustRepeat = (val) => {
        setFormData(prev => ({ ...prev, repeatCount: Math.max(1, Math.min(60, prev.repeatCount + val)) }));
    };

    // Calculate Data for Charts
    const incomeTotal = filteredTransactions.filter(t => t.type.toLowerCase() === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expenseTotal = filteredTransactions.filter(t => t.type.toLowerCase() === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const balanceTotal = incomeTotal - expenseTotal;

    const expensesByCategory = filteredTransactions
        .filter(t => t.type.toLowerCase() === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {});

    const pieData = Object.keys(expensesByCategory).length > 0
        ? Object.keys(expensesByCategory).map(key => ({
            name: key,
            value: expensesByCategory[key],
            percent: ((expensesByCategory[key] / expenseTotal) * 100).toFixed(0)
        }))
        : [];

    return (
        <div className="finance-page animate-fade-in">
            <header className="top-bar-modern">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="page-title">Finanças</h1>
                <div className="header-actions">
                    <button className="icon-action-btn no-bg"><CreditCard size={24} color="var(--color-primary)" /></button>
                    <button className="icon-action-btn" onClick={() => setShowMenu(true)}><Menu size={24} /></button>
                </div>
            </header>

            {/* INTEGRATED CARD: MONTH NAV + CHARTS */}
            <div className="chart-container-modern card" style={{ padding: '0 0 1.5rem 0', overflow: 'hidden' }}>
                {/* Integrated Month Navigation at the Top of the Card */}
                <div className="calendar-nav" style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', background: 'var(--color-input-bg)', borderRadius: '1.25rem 1.25rem 0 0' }}>
                    <button className="nav-arrow-btn" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}><ChevronLeft size={20} /></button>
                    <span className="month-label clickable" onClick={() => setIsMonthPickerOpen(true)} style={{ fontSize: '1rem', fontWeight: 800 }}>
                        {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button className="nav-arrow-btn" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}><ChevronRight size={20} /></button>
                </div>

                <div style={{ padding: '0 1.5rem' }}>
                    <h2 style={{ fontSize: '1rem', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 800, color: 'var(--color-text-main)' }}>Despesas do Mês</h2>

                    {pieData.length === 0 ? (
                        <div className="empty-state" style={{ minHeight: '200px' }}>Sem despesas este mês.</div>
                    ) : (
                        <>
                            <div className="donut-and-legend" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ width: '160px', height: '160px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                innerRadius={45}
                                                outerRadius={65}
                                                dataKey="value"
                                                paddingAngle={2}
                                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="finance-legend" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {pieData.map((item, idx) => (
                                        <div key={idx} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }}></span>
                                            <span style={{ color: 'var(--color-text-main)' }}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ width: '100%', height: '120px', marginTop: '1rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pieData}>
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                        </Bar>
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MONTH PICKER OVERLAY (Needs to be global-ish or relative to page) */}
            {isMonthPickerOpen && (
                <div className="month-picker-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="calendar-card" style={{ width: '100%', maxWidth: '340px' }}>
                        <div className="calendar-nav">
                            <button className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setSelectedMonth(subYears(selectedMonth, 1)); }}><ChevronLeft size={20} /></button>
                            <span className="month-label">{format(selectedMonth, 'yyyy')}</span>
                            <button className="nav-arrow-btn" onClick={(e) => { e.stopPropagation(); setSelectedMonth(addYears(selectedMonth, 1)); }}><ChevronRight size={20} /></button>
                        </div>
                        <div className="month-grid">
                            {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                <button key={m} className={`month-btn ${selectedMonth.getMonth() === m ? 'active' : ''}`} onClick={() => handleMonthSelect(m)}>
                                    {format(setMonth(new Date(), m), 'MMM', { locale: ptBR })}
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setIsMonthPickerOpen(false)}>Fechar</button>
                    </div>
                </div>
            )}

            <div className="finance-header-card-modern">
                <div className="balance-info">
                    <span className="label">Saldo do Mês</span>
                    <span className="value">R$ {balanceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <div className="summary-pills">
                        <div className="pill income"><TrendingUp size={12} /> {incomeTotal.toLocaleString('pt-BR')}</div>
                        <div className="pill expense"><TrendingDown size={12} /> {expenseTotal.toLocaleString('pt-BR')}</div>
                    </div>
                </div>
                <div className="mini-chart" style={{ width: 80, height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={[{ value: Math.max(0.1, incomeTotal) }, { value: Math.max(0.1, expenseTotal) }]} innerRadius={25} outerRadius={35} dataKey="value">
                                <Cell fill="#10b981" /><Cell fill="#f43f5e" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="search-filter-container">
                <div className="search-box-modern">
                    <Search size={18} /><input type="text" placeholder="Buscar lançamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="filter-chips">
                    <button className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>Tudo</button>
                    <button className={filterType === 'income' ? 'active' : ''} onClick={() => setFilterType('income')}>Entradas</button>
                    <button className={filterType === 'expense' ? 'active' : ''} onClick={() => setFilterType('expense')}>Saídas</button>
                </div>
            </div>

            <section className="transactions-section">
                {filteredTransactions.length === 0 ? <div className="empty-state">Livre neste mês.</div> :
                    filteredTransactions.map(t => (
                        <div key={t.id} className={`trans-list-item ${t.status === 'pending' ? 'pending' : ''}`}>
                            <div className={`trans-icon-bg ${t.type.toLowerCase()}`}>
                                {t.type.toLowerCase() === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div className="trans-core" onClick={() => openModal(t)}>
                                <div className="trans-name">{t.title}</div>
                                <div className="trans-meta-row">
                                    <span className="trans-sub">{t.category}</span>
                                    <span className="trans-date-text">{format(parseISO(t.date), 'dd/MM')}</span>
                                    {t.status === 'pending' && <span className="status-badge">Pendente</span>}
                                </div>
                            </div>
                            <div className="trans-right">
                                <div className={`trans-amt ${t.type.toLowerCase()}`}>
                                    {t.type.toLowerCase() === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <button className="trans-del" onClick={() => setDeleteItem(t)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                }
            </section>

            <button className="fab" onClick={() => openModal()}><Plus size={32} /></button>

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal} style={{ alignItems: 'center' }}>
                    <div className="modal-content scrollable-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title"><CreditCard size={20} color="var(--color-primary)" /> {editingTrans ? 'Editar' : 'Novo Lancamento'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <label className="form-label">Descrição</label>
                            <div className="input-container"><Plus size={20} color="var(--color-text-muted)" /><input autoFocus type="text" className="input-field" placeholder="Ex: Aluguel" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required /></div>

                            <label className="form-label">Valor (R$)</label>
                            <div className="input-container"><DollarSign size={24} color="var(--color-primary)" /><input type="number" step="0.01" className="input-field" style={{ fontSize: '1.75rem', fontWeight: '800' }} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required /></div>

                            <div className="form-grid">
                                <div><label className="form-label">Data</label><div className="input-container"><input type="date" className="input-field minimal" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required /></div></div>
                                <div><label className="form-label">Tipo</label><div className="input-container"><select className="input-field minimal" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option value="expense">Despesa</option><option value="income">Receita</option></select></div></div>
                            </div>

                            <div className="form-grid">
                                <div><label className="form-label">Categoria</label><div className="input-container"><select className="input-field minimal" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div></div>
                                <div><label className="form-label">Situação</label><div className="input-container"><select className="input-field minimal" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}><option value="paid">Liquidada</option><option value="pending">Pendente</option></select></div></div>
                            </div>

                            {!editingTrans && (
                                <>
                                    <label className="form-label">Repetir Mensalmente</label>
                                    <div className="counter-container">
                                        <button type="button" className="counter-btn" onClick={() => adjustRepeat(-1)}><Minus size={18} /></button>
                                        <span className="counter-value">{formData.repeatCount} x</span>
                                        <button type="button" className="counter-btn" onClick={() => adjustRepeat(1)}><Plus size={18} /></button>
                                    </div>

                                    <div className="checkbox-row" style={{ marginTop: '1.5rem' }} onClick={() => setAddToPlanning(!addToPlanning)}>
                                        <div className={`custom-checkbox ${addToPlanning ? 'checked' : ''}`}>{addToPlanning && <Check size={12} color="white" strokeWidth={4} />}</div>
                                        <span>Registrar no Planejamento</span>
                                    </div>
                                </>
                            )}

                            <button type="submit" className="btn btn-primary btn-submit" style={{ marginTop: '1.5rem', background: formData.type === 'expense' ? '#ef4444' : '#10b981' }}><Save size={20} /> Salvar Movimentação</button>
                        </form>
                    </div>
                </div>
            )}

            {deleteItem && (
                <div className="modal-overlay" style={{ alignItems: 'center' }}>
                    <div className="modal-content animate-fade-in" style={{ textAlign: 'center', maxWidth: '360px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><AlertCircle size={32} /></div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Excluir Registro?</h3>

                        {deleteItem.recurring_group_id ? (
                            <>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                    Este item é recorrente. Você pode excluir apenas este mês ou cancelar todas as parcelas futuras:
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={() => deleteTransaction('future')}>Excluir Este e Futuros</button>
                                    <button className="btn" style={{ background: 'var(--color-bg)', color: 'var(--color-text-main)' }} onClick={() => deleteTransaction('one')}>Excluir Apenas Este</button>
                                    <button className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)' }} onClick={() => setDeleteItem(null)}>Cancelar</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Esta movimentação será apagada permanentemente.</p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn" style={{ flex: 1, background: 'var(--color-bg)' }} onClick={() => setDeleteItem(null)}>Voltar</button>
                                    <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={() => deleteTransaction('one')}>Excluir</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showMenu && (
                <div className="modal-overlay" onClick={() => setShowMenu(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: 0 }}>
                    <div className="modal-content animate-slide-right" onClick={e => e.stopPropagation()} style={{ width: '280px', height: '100%', borderRadius: 0, padding: '2rem 1.5rem' }}>
                        <div className="modal-header"><h3 className="modal-title">Menu</h3><button className="modal-close-btn" onClick={() => setShowMenu(false)}><X size={20} /></button></div>
                        <div className="menu-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => navigate('/profile')} className="btn menu-btn"><User size={20} /> Perfil</button>
                            <button onClick={() => { toggleTheme(); setShowMenu(false); }} className="btn menu-btn">{currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />} Tema</button>
                            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="btn menu-btn"><LogOut size={20} /> Sair</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
