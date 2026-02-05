import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    User, LogOut, Download, Share2, Key, ChevronLeft, Moon, Sun,
    CreditCard, LayoutGrid, Tag, Upload, Settings, Wallet, Target, TrendingUp, Bookmark, ChevronRight, Calculator, Plus, Trash2, Edit2, X, AlertCircle, Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import './Profile.css';

// Generic List Manager for Local Settings (simulating DB tables)
const ListManager = ({ title, storageKey, defaultItems, itemRender, onBack, onSetDefault, defaultId }) => {
    const [items, setItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ name: '', value: '', current: '0' });

    // For Goal Deposit
    const [depositGoalId, setDepositGoalId] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) setItems(JSON.parse(stored));
        else setItems(defaultItems);
    }, [storageKey]);

    const saveItems = (newItems) => {
        setItems(newItems);
        localStorage.setItem(storageKey, JSON.stringify(newItems));
    };

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({ name: '', value: '', current: '0' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            value: item.value || '',
            current: item.current || '0'
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name) return;

        let updated;
        if (editingItem) {
            updated = items.map(i => i.id === editingItem.id ? { ...i, ...formData } : i);
        } else {
            updated = [...items, { id: Date.now(), ...formData }];
        }

        saveItems(updated);
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        if (confirm('Tem certeza que deseja excluir?')) {
            const updated = items.filter(i => i.id !== id);
            saveItems(updated);
            if (defaultId === id && onSetDefault) {
                onSetDefault(updated.length > 0 ? updated[0].id : null);
            }
        }
    };

    const handleDeposit = () => {
        if (!depositAmount || isNaN(parseFloat(depositAmount))) return;
        const amount = parseFloat(depositAmount);

        const updated = items.map(i => {
            if (i.id === depositGoalId) {
                const current = parseFloat(i.current || 0);
                return { ...i, current: (current + amount).toString() };
            }
            return i;
        });

        saveItems(updated);
        setDepositGoalId(null);
        setDepositAmount('');
    };

    const isGoal = storageKey.includes('goals');
    const isAccount = storageKey.includes('accounts');

    return (
        <div className="profile-page animate-fade-in">
            <header className="options-header">
                <button className="icon-btn-ghost" onClick={onBack}><ChevronLeft size={24} /></button>
                <h1 className="options-title">{title}</h1>
                <button className="icon-btn-ghost" onClick={handleOpenAdd}><Plus size={24} /></button>
            </header>
            <div className="menu-section">
                {items.length === 0 ? <div style={{ padding: '1rem', opacity: 0.5, textAlign: 'center' }}>Nenhum item.</div> :
                    items.map(item => {
                        // Custom Render for Goals with Progress
                        if (isGoal) {
                            const target = parseFloat(item.value || 0);
                            const current = parseFloat(item.current || 0);
                            const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

                            return (
                                <div key={item.id} className="menu-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', padding: '1rem', height: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => setDepositGoalId(item.id)} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Adicionar Valor"><Plus size={16} /></button>
                                            <button onClick={() => handleOpenEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', padding: '0.2rem' }}><Edit2 size={18} /></button>
                                            <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0.2rem' }}><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', opacity: 0.8 }}>
                                        <span>{current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        <span>{target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${percent}%`, background: 'var(--color-primary)', height: '100%' }}></div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.6 }}>{percent.toFixed(1)}%</div>
                                </div>
                            );
                        }

                        // Default Render
                        return (
                            <div key={item.id} className="menu-item" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    {isAccount && (
                                        <div
                                            title={defaultId === item.id ? "Conta Padrão" : "Definir como Padrão"}
                                            onClick={() => onSetDefault && onSetDefault(item.id)}
                                            style={{ cursor: 'pointer', color: defaultId === item.id ? 'var(--color-primary)' : 'var(--color-text-muted)', opacity: defaultId === item.id ? 1 : 0.3 }}
                                        >
                                            <Check size={20} />
                                        </div>
                                    )}
                                    {itemRender ? itemRender(item) : <span className="menu-text">{item.name}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleOpenEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', padding: '0.5rem' }}><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem' }}><Trash2 size={18} /></button>
                                </div>
                            </div>
                        );
                    })
                }
            </div>

            {/* Modal Add/Edit */}
            {isModalOpen && (
                <div className="modal-overlay" style={{ alignItems: 'flex-end' }}>
                    <div className="modal-content" style={{ borderRadius: '1.5rem 1.5rem 0 0', padding: '1.5rem' }}>
                        <h3 className="modal-title" style={{ marginBottom: '1rem' }}>{editingItem ? 'Editar' : 'Novo'} Item</h3>
                        <input className="input-field" placeholder="Nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus style={{ marginBottom: '1rem' }} />

                        {(storageKey.includes('accounts') || storageKey.includes('invest') || storageKey.includes('goals') || storageKey.includes('cards')) && (
                            <input
                                className="input-field"
                                type="number"
                                placeholder={storageKey.includes('goals') ? "Meta (R$)" : storageKey.includes('cards') ? "Limite (R$)" : "Saldo (R$)"}
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                style={{ marginBottom: '1rem' }}
                            />
                        )}

                        {storageKey.includes('goals') && (
                            <input
                                className="input-field"
                                type="number"
                                placeholder="Valor Atual (R$)"
                                value={formData.current}
                                onChange={e => setFormData({ ...formData, current: e.target.value })}
                                style={{ marginBottom: '1rem' }}
                            />
                        )}

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave}>Salvar</button>
                        <button className="btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {/* Deposit Modal for Goals */}
            {depositGoalId && (
                <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" style={{ borderRadius: '1rem', padding: '1.5rem', width: '90%', maxWidth: 320 }}>
                        <h3 className="modal-title" style={{ marginBottom: '1rem' }}>Adicionar ao Objetivo</h3>
                        <input
                            className="input-field"
                            type="number"
                            placeholder="Valor (R$)"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            autoFocus
                            style={{ marginBottom: '1rem' }}
                        />
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleDeposit}>Confirmar</button>
                        <button className="btn" style={{ width: '100%', marginTop: '0.5rem', background: 'transparent' }} onClick={() => setDepositGoalId(null)}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Profile Component
const Profile = ({ toggleTheme, currentTheme }) => {
    const navigate = useNavigate();
    const [subScreen, setSubScreen] = useState(null);
    const [startDay, setStartDay] = useState(localStorage.getItem('startMonthDay') || '1');
    const [nickname, setNickname] = useState('');
    const [defaultAccountId, setDefaultAccountId] = useState(localStorage.getItem('defaultAccountId') || null);
    const [activeTab, setActiveTab] = useState('manager'); // manager, track, about
    const [stats, setStats] = useState({ savings: 0, rate: 0, topCats: [], totalInc: 0, totalExp: 0, balance: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            if (activeTab !== 'track') return;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', user.id);

            if (trans && trans.length > 0) {
                const defaultId = localStorage.getItem('defaultAccountId');
                const userAccs = JSON.parse(localStorage.getItem('user_accounts') || '[]');
                const defAccName = userAccs.find(a => String(a.id) === String(defaultId))?.name;

                const now = new Date();
                const thisMonth = trans.filter(t => {
                    const d = parseISO(t.date);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });

                const inc = thisMonth.reduce((acc, t) => {
                    if (t.status === 'pending' || t.status === 'planned') return acc;
                    if (t.type === 'income') {
                        const accMatch = t.title.match(/\s?\[(.*?)\]$/);
                        if (!accMatch || (defAccName && accMatch[1] === defAccName)) return acc + Number(t.amount);
                    }
                    if (t.type === 'transfer' && defAccName && t.title.includes(`-> [${defAccName}]`)) return acc + Number(t.amount);
                    return acc;
                }, 0);

                const exp = thisMonth.reduce((acc, t) => {
                    if (t.status === 'pending' || t.status === 'planned') return acc;
                    if (t.type === 'expense') {
                        const accMatch = t.title.match(/\s?\[(.*?)\]$/);
                        if (!accMatch || (defAccName && accMatch[1] === defAccName)) return acc + Number(t.amount);
                    }
                    if (t.type === 'transfer' && defAccName && t.title.includes(`[${defAccName}] ->`)) return acc + Number(t.amount);
                    return acc;
                }, 0);

                const savings = inc - exp;
                const rate = inc > 0 ? (savings / inc) * 100 : 0;

                const catMap = {};
                thisMonth.filter(t => {
                    if (t.type !== 'expense') return false;
                    const accMatch = t.title.match(/\s?\[(.*?)\]$/);
                    return !accMatch || (defAccName && accMatch[1] === defAccName);
                }).forEach(t => {
                    const cat = t.category || 'Outros';
                    catMap[cat] = (catMap[cat] || 0) + Number(t.amount);
                });
                const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

                setStats({ savings, rate, topCats, totalInc: inc, totalExp: exp, balance: inc - exp });
            }
        };
        fetchStats();
    }, [activeTab]);

    useEffect(() => {
        const fetchProfileData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('start_month_day, nickname, default_account_id')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    if (data.start_month_day) {
                        setStartDay(data.start_month_day);
                        localStorage.setItem('startMonthDay', data.start_month_day);
                    }
                    if (data.nickname) setNickname(data.nickname);
                    if (data.default_account_id) {
                        setDefaultAccountId(data.default_account_id);
                        localStorage.setItem('defaultAccountId', data.default_account_id);
                    }
                }
            }
        };
        fetchProfileData();
    }, []);

    // Data for About
    const [userCount, setUserCount] = useState(0); // Dummy stat

    const handleExport = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: trans, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
            if (error) throw error;
            if (!trans || trans.length === 0) return alert('Sem dados para exportar.');

            const wb = XLSX.utils.book_new();

            // Group by Month
            const groups = trans.reduce((acc, t) => {
                const monthYear = format(parseISO(t.date), 'MMMM yyyy', { locale: ptBR });
                if (!acc[monthYear]) acc[monthYear] = [];
                acc[monthYear].push(t);
                return acc;
            }, {});

            // Create a sheet for each month
            Object.keys(groups).forEach(month => {
                const monthTrans = groups[month];

                // Prepare rows with better header and formatting
                const rows = monthTrans.map(t => ({
                    'Data': format(parseISO(t.date), 'dd/MM/yyyy'),
                    'Descrição': t.title,
                    'Categoria': t.category || '-',
                    'Tipo': t.type === 'income' ? 'Entrada (+)' : 'Saída (-)',
                    'Valor (R$)': Number(t.amount),
                    'Status': t.status === 'paid' ? 'Liquidado' : 'Pendente'
                }));

                const income = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
                const expense = monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

                // Add Summary Rows
                rows.push({}); // Empty row
                rows.push({ 'Descrição': 'RESUMO MENSAL', 'Valor (R$)': '' });
                rows.push({ 'Descrição': 'Total de Entradas', 'Valor (R$)': income });
                rows.push({ 'Descrição': 'Total de Saídas', 'Valor (R$)': expense });
                rows.push({ 'Descrição': 'SALDO FINAL', 'Valor (R$)': income - expense });

                const ws = XLSX.utils.json_to_sheet(rows);

                // Final layout adjustments
                ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];

                XLSX.utils.book_append_sheet(wb, ws, month.substring(0, 31)); // Max 31 chars for sheet name
            });

            XLSX.writeFile(wb, `SmartOrganizer_Financeiro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            alert('Relatório Excel gerado com sucesso!');
        } catch (e) {
            console.error(e);
            alert('Erro ao exportar: ' + e.message);
        }
    };

    const handleSaveStartDay = async (val) => {
        setStartDay(val);
        localStorage.setItem('startMonthDay', val);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, start_month_day: val });
        }
    };

    const handleSaveNickname = async (val) => {
        setNickname(val);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, nickname: val });
        }
    };

    const handleSetDefaultAccount = async (id) => {
        setDefaultAccountId(id);
        localStorage.setItem('defaultAccountId', id);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, default_account_id: id });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleExportFullBackup = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Capture LocalStorage
            const localKeys = [
                'user_accounts', 'user_cards', 'user_goals', 'user_investments',
                'user_categories', 'user_tags', 'startMonthDay', 'theme', 'defaultAccountId'
            ];
            const localData = {};
            localKeys.forEach(k => {
                localData[k] = localStorage.getItem(k);
            });

            // 2. Fetch Supabase Data
            const tables = ['transactions', 'tasks', 'calendar_events', 'profiles', 'shopping_items'];
            const dbData = {};

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', user.id);
                if (!error) dbData[table] = data;
            }

            const backupData = {
                version: '1.2',
                timestamp: new Date().toISOString(),
                user_id: user.id,
                localStorage: localData,
                database: dbData
            };

            // 3. Create ZIP
            const zip = new JSZip();
            zip.file("backup_data.json", JSON.stringify(backupData, null, 2));
            zip.file("readme.txt", "SmartOrganizer Advanced Backup\nGenerated on: " + new Date().toLocaleString());

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SmartOrganizer_Backup_${format(new Date(), 'yyyy-MM-dd')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Backup ZIP exportado com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao exportar backup: ' + err.message);
        }
    };

    const handleImportFullBackup = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Esta ação restaurará dados locais e do banco de dados. Deseja continuar?')) return;

        try {
            let backup;
            if (file.name.endsWith('.zip')) {
                const zip = await JSZip.loadAsync(file);
                const backupFile = zip.file("backup_data.json");
                if (!backupFile) throw new Error("Arquivo backup_data.json não encontrado no ZIP.");
                const content = await backupFile.async("string");
                backup = JSON.parse(content);
            } else if (file.name.endsWith('.json')) {
                const reader = new FileReader();
                const content = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
                backup = JSON.parse(content);
            } else {
                throw new Error("Formato de arquivo não suportado. Use .zip ou .json");
            }

            if (!backup.localStorage || !backup.database) throw new Error('Formato de backup inválido');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Restore LocalStorage
            Object.keys(backup.localStorage).forEach(k => {
                const val = backup.localStorage[k];
                if (val !== null && val !== undefined) {
                    localStorage.setItem(k, val);
                }
            });

            // 2. Restore Supabase (Upsert)
            for (const table in backup.database) {
                const rows = backup.database[table];
                if (rows && rows.length > 0) {
                    const preparedRows = rows.map(r => ({
                        ...r,
                        user_id: table === 'profiles' ? undefined : user.id,
                        id: (table === 'profiles') ? user.id : r.id
                    }));

                    const { error } = await supabase.from(table).upsert(preparedRows);
                    if (error) console.error(`Erro ao restaurar tabela ${table}:`, error);
                }
            }

            alert('Dados restaurados com sucesso! O aplicativo será recarregado.');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Erro ao importar backup: ' + err.message);
        }
    };

    // Sub-screens
    if (subScreen === 'categories') return <ListManager title="Categorias" storageKey="user_categories" defaultItems={[{ id: 1, name: 'Alimentação' }, { id: 2, name: 'Moradia' }, { id: 3, name: 'Lazer' }]} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'tags') return <ListManager title="Tags" storageKey="user_tags" defaultItems={[{ id: 1, name: 'Essencial' }, { id: 2, name: 'Supérfluo' }]} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'accounts') return <ListManager title="Contas" storageKey="user_accounts" defaultItems={[{ id: 1, name: 'Carteira', value: '0' }, { id: 2, name: 'Banco Principal', value: '1000' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{Number(i.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>} onBack={() => setSubScreen(null)} onSetDefault={handleSetDefaultAccount} defaultId={defaultAccountId} />;
    if (subScreen === 'cards') return <ListManager title="Cartões de Crédito" storageKey="user_cards" defaultItems={[{ id: 1, name: 'Nubank', value: '5000' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Limite: {Number(i.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'goals') return <ListManager title="Objetivos" storageKey="user_goals" defaultItems={[{ id: 1, name: 'Viagem', value: '10000', current: '0' }]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Meta: {Number(i.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>} onBack={() => setSubScreen(null)} />;
    if (subScreen === 'investments') return <ListManager title="Investimentos" storageKey="user_investments" defaultItems={[]} itemRender={(i) => <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 600 }}>{i.name}</span><span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{Number(i.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>} onBack={() => setSubScreen(null)} />;

    if (subScreen === 'settings') {
        return (
            <div className="profile-page animate-fade-in">
                <header className="options-header">
                    <button className="icon-btn-ghost" onClick={() => setSubScreen(null)}><ChevronLeft size={24} /></button>
                    <h1 className="options-title">Preferências</h1>
                    <div style={{ width: 24 }}></div>
                </header>

                <div className="menu-section">
                    <div className="menu-item" onClick={toggleTheme}>
                        <div className="menu-icon">{currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</div>
                        <div className="menu-text">Tema {currentTheme === 'light' ? 'Escuro' : 'Claro'}</div>
                        {currentTheme === 'light' ? <div className="toggle-switch off"></div> : <div className="toggle-switch on" style={{ width: 40, height: 20, background: 'var(--color-primary)', borderRadius: 20 }}></div>}
                    </div>
                </div>

                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Perfil</h3>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Apelido (Como quer ser chamado)</label>
                        <div className="input-container">
                            <User size={18} color="var(--color-text-muted)" />
                            <input
                                className="input-field"
                                placeholder="Seu apelido"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                onBlur={(e) => handleSaveNickname(e.target.value)}
                            />
                        </div>
                    </div>

                    <h3 className="section-title" style={{ marginBottom: '1rem' }}>Configuração Financeira</h3>
                    <div className="card">
                        <label className="form-label">Dia de Início do Mês</label>
                        <div className="input-container">
                            <Calculator size={18} color="var(--color-text-muted)" />
                            <select className="input-field" value={startDay} onChange={(e) => handleSaveStartDay(e.target.value)}>
                                {[1, 5, 10, 15, 20, 25].map(d => (
                                    <option key={d} value={d}>Dia {d}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (subScreen === 'backup') {
        return (
            <div className="profile-page animate-fade-in">
                <header className="options-header">
                    <button className="icon-btn-ghost" onClick={() => setSubScreen(null)}><ChevronLeft size={24} /></button>
                    <h1 className="options-title">Backup Completo</h1>
                    <div style={{ width: 24 }}></div>
                </header>

                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <Upload size={48} color="var(--color-primary)" style={{ margin: '0 auto 1.5rem', display: 'block' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Exportar e Importar</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '2rem' }}>
                            Mantenha seus dados seguros. O backup completo inclui configurações locais do navegador e todos os lançamentos do banco de dados.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleExportFullBackup}>
                                <Download size={18} /> Exportar Backup Atual
                            </button>

                            <label className="btn" style={{ width: '100%', background: 'var(--color-surface)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Upload size={18} /> Restaurar de um Arquivo
                                <input type="file" accept=".json" onChange={handleImportFullBackup} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: '#d97706' }}>
                            <AlertCircle size={20} />
                            <div style={{ fontSize: '0.85rem' }}>
                                <strong>Aviso:</strong> A restauração de um backup substituirá suas configurações atuais. Recomendamos baixar um backup de segurança antes.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page animate-fade-in">
            <header className="options-header">
                <button className="icon-btn-ghost" onClick={() => navigate('/')}><ChevronLeft size={24} /></button>
                <h1 className="options-title">Configurações</h1>
                <div style={{ width: 24 }}>
                    <Settings size={22} className="clickable" onClick={() => setSubScreen('settings')} />
                </div>
            </header>

            <div className="tabs-container">
                <div className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`} onClick={() => setActiveTab('manager')}>Gerenciar</div>
                <div className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>Acompanhar</div>
                <div className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>Sobre</div>
            </div>

            {activeTab === 'manager' && (
                <>
                    <div className="menu-section">
                        <button className="menu-item" onClick={() => setSubScreen('accounts')}>
                            <Wallet size={20} className="menu-icon" />
                            <span className="menu-text">Contas</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('cards')}>
                            <CreditCard size={20} className="menu-icon" />
                            <span className="menu-text">Cartões de crédito</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('goals')}>
                            <Target size={20} className="menu-icon" />
                            <span className="menu-text">Objetivos</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('investments')}>
                            <TrendingUp size={20} className="menu-icon" />
                            <span className="menu-text">Investimentos</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                    </div>

                    <div className="menu-section">
                        <button className="menu-item" onClick={() => setSubScreen('categories')}>
                            <Bookmark size={20} className="menu-icon" />
                            <span className="menu-text">Categorias</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={() => setSubScreen('tags')}>
                            <Tag size={20} className="menu-icon" />
                            <span className="menu-text">Tags</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                    </div>

                    <div className="menu-section">
                        <button className="menu-item" onClick={() => setSubScreen('backup')}>
                            <Upload size={20} className="menu-icon" />
                            <span className="menu-text">Backup e Restauração</span>
                            <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </button>
                        <button className="menu-item" onClick={handleExport}>
                            <Download size={20} className="menu-icon" />
                            <span className="menu-text">Exportar financeiro (Excel)</span>
                        </button>
                    </div>
                </>
            )}

            {activeTab === 'track' && (
                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <div className="card" style={{ marginBottom: '1rem', background: 'var(--color-primary)', color: 'white' }}>
                        <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>Balanço do Mês</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={14} /> Taxa de Poupança: {stats.rate.toFixed(1)}%
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Entradas</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{stats.totalInc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        </div>
                        <div className="card" style={{ padding: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Saídas</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{stats.totalExp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                        </div>
                    </div>

                    <h3 className="section-title">Maiores Gastos do Mês</h3>
                    <div className="card">
                        {stats.topCats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5 }}>Sem gastos registrados este mês.</div>
                        ) : (
                            stats.topCats.map(([cat, val], idx) => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: idx < stats.topCats.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="atm-icon-circle" style={{ width: 32, height: 32 }}><Tag size={16} /></div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{cat}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{((val / stats.totalExp) * 100).toFixed(0)}% do total</div>
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 700 }}>{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'center', opacity: 0.6, paddingBottom: '2rem' }}>
                        <TrendingUp size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                        <p style={{ fontSize: '0.9rem' }}>Mais relatórios detalhados nas próximas versões!</p>
                    </div>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="dashboard-section" style={{ padding: '0 1rem' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>+Agenda</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Versão 1.2.1</p>
                        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>O organizador inteligente para sua vida financeira e pessoal.</p>
                    </div>
                </div>
            )}

            <button className="menu-item logout" onClick={handleLogout} style={{ margin: '0 1rem', background: 'transparent', border: 'none' }}>
                <LogOut size={20} />
                <span className="menu-text">Sair do app</span>
            </button>
        </div>
    );
};

export default Profile;
