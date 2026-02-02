import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Calendar, FileText, Tag, Wallet, Paperclip, ChevronRight, Delete, Check, CreditCard, Repeat, Bookmark } from 'lucide-react';
import './AddTransactionModal.css';
import { format, subDays, parseISO, addMonths } from 'date-fns';
import { supabase } from '../supabaseClient';

const AddTransactionModal = ({ type, onClose, trans = null }) => {
    // type: 'expense' | 'income' | 'transfer' | 'card'
    const [displayValue, setDisplayValue] = useState('0');
    const [showKeypad, setShowKeypad] = useState(!trans);
    const [isPaid, setIsPaid] = useState(true);
    const [dateTab, setDateTab] = useState('today');
    const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    // Type specific fields
    const [account, setAccount] = useState('');
    const [sourceAccount, setSourceAccount] = useState('');
    const [destAccount, setDestAccount] = useState('');
    const [card, setCard] = useState('');

    // New Features
    const [isRecurring, setIsRecurring] = useState(false);
    const [repeatCount, setRepeatCount] = useState(12); // Count
    const [isPlanning, setIsPlanning] = useState(false); // Registrar Planejamento
    const [attachment, setAttachment] = useState(null);

    // Lists
    const [categoryList, setCategoryList] = useState([]);
    const [accountList, setAccountList] = useState([]);
    const [cardList, setCardList] = useState([]);

    const [loading, setLoading] = useState(false);
    const dateInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const config = {
        expense: { label: 'Despesa', colorClass: 'expense', prefix: '-' },
        income: { label: 'Receita', colorClass: 'income', prefix: '+' },
        transfer: { label: 'Transferência', colorClass: 'transfer', prefix: '' },
        card: { label: 'Despesa Cartão', colorClass: 'card', prefix: '-' },
    }[type] || { label: 'Transação', colorClass: 'expense', prefix: '' };

    const DEFAULT_CATEGORIES = [
        'Alimentação', 'Assinaturas', 'Educação', 'Investimento', 'Lazer',
        'Moradia', 'Outros', 'Pessoal', 'Presentes', 'Saúde',
        'Salário', 'Trabalho', 'Transporte', 'Vendas'
    ];

    useEffect(() => {
        // Load Lists
        const loadLists = () => {
            const userCats = JSON.parse(localStorage.getItem('user_categories') || '[]');
            const cats = [...new Set([...DEFAULT_CATEGORIES, ...userCats.map(c => c.name)])];
            setCategoryList(cats.sort());

            const userAccs = JSON.parse(localStorage.getItem('user_accounts') || '[]');
            setAccountList(userAccs.map(a => a.name));

            const userCards = JSON.parse(localStorage.getItem('user_cards') || '[]');
            setCardList(userCards.map(c => c.name));
        };
        loadLists();

        // Edit Mode
        if (trans) {
            setDisplayValue(String(trans.amount));
            setDescription(trans.title);
            setCategory(trans.category);
            setIsPaid(trans.status === 'paid');
            setCustomDate(format(parseISO(trans.date), 'yyyy-MM-dd'));
            setDateTab('other');
        }
    }, [trans]);

    const handleKey = (key) => {
        if (key === 'delete') {
            setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
        } else if (key === 'clear') {
            setDisplayValue('0');
        } else if (['+', '-', '*', '/'].includes(key)) {
            setDisplayValue(prev => prev + key);
        } else if (key === '=') {
            try {
                // eslint-disable-next-line no-eval
                const result = eval(displayValue.replace(/,/g, '.'));
                setDisplayValue(String(result));
            } catch (e) { /* ignore */ }
        } else {
            // Number or dot
            setDisplayValue(prev => prev === '0' ? String(key) : prev + key);
        }
    };

    const handleDone = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(displayValue.replace(/,/g, '.'));
            setDisplayValue(String(result));
            setShowKeypad(false);
        } catch (e) {
            setShowKeypad(false);
        }
    };

    const handleFile = (e) => {
        if (e.target.files[0]) setAttachment(e.target.files[0]);
    };

    const handleSave = async () => {
        setLoading(true);
        const amount = parseFloat(displayValue);
        let baseDate = new Date();
        if (dateTab === 'yesterday') baseDate = subDays(new Date(), 1);
        else if (dateTab === 'other') baseDate = parseISO(customDate);

        // Logic
        let finalTitle = description || config.label;
        let finalType = type;
        let finalCategory = category || 'Outros';
        let finalStatus = isPlanning ? 'planned' : (isPaid ? 'paid' : 'pending');

        if (type === 'transfer') {
            finalTitle = `${description || 'Transferência'}: ${sourceAccount || 'Origem'} -> ${destAccount || 'Destino'}`;
        } else if (type === 'card') {
            finalType = 'expense';
            finalTitle = `${description || 'Cartão'} (${card})`;
            finalCategory = 'Cartão de Crédito';
        } else {
            if (account) finalTitle += ` [${account}]`;
        }

        const userId = (await supabase.auth.getUser()).data.user?.id;
        const payloads = [];
        const calendarPayloads = [];
        const finalRepeatCount = isRecurring ? repeatCount : 1;
        const groupId = isRecurring ? crypto.randomUUID() : null;

        for (let i = 0; i < finalRepeatCount; i++) {
            const d = addMonths(baseDate, i);
            const titleWithCount = isRecurring ? `${finalTitle} (${i + 1}/${finalRepeatCount})` : finalTitle;

            payloads.push({
                title: titleWithCount,
                amount: amount,
                type: finalType,
                date: d.toISOString(),
                status: finalStatus,
                category: finalCategory,
                user_id: userId,
                recurring_group_id: groupId
            });

            if (isPlanning) {
                const dateStr = format(d, 'yyyy-MM-dd');
                calendarPayloads.push({
                    title: `${config.label}: ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                    description: `${titleWithCount} - ${finalCategory}`,
                    start_time: `${dateStr}T09:00:00`,
                    end_time: `${dateStr}T10:00:00`,
                    all_day: false,
                    type: type === 'income' ? 'personal' : 'work',
                    user_id: userId,
                    location: 'Financeiro'
                });
            }
        }

        const { error } = await supabase.from('transactions').insert(payloads);

        if (!error && calendarPayloads.length > 0) {
            await supabase.from('calendar_events').insert(calendarPayloads);
        }

        setLoading(false);
        if (error) {
            alert('Erro: ' + error.message);
        } else {
            if (attachment) {
                console.log("File to upload:", attachment);
            }
            onClose();
            window.location.reload();
        }
    };

    return (
        <div className="atm-overlay">
            <div className={`atm-header ${config.colorClass}`}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}><span style={{ fontSize: '1rem' }}>Cancelar</span></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    {trans ? 'Editar ' : 'Nova '}{config.label} <ChevronDown size={16} />
                </div>
                <div style={{ width: 60 }}></div>
            </div>

            <div className={`atm-value-section ${config.colorClass}`} onClick={() => !trans && setShowKeypad(true)}>
                <div className="atm-value-label">Valor da {config.label.toLowerCase()}</div>
                <div className="atm-value-input">
                    <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>R$</span>
                    {displayValue}
                </div>
            </div>

            <div className="atm-body">
                <div className="atm-row">
                    <div className="atm-label"><Check size={18} /> {isPaid ? 'Pago' : 'Pendente'}</div>
                    <div className={`atm-toggle ${isPaid ? 'checked' : ''} ${config.colorClass}`} onClick={() => setIsPaid(!isPaid)}>
                        <div className="atm-toggle-handle"></div>
                    </div>
                </div>

                <div className="atm-row">
                    <div className="atm-label"><Calendar size={18} /> Data</div>
                    <div className="atm-date-tabs">
                        <button className={`atm-date-tab ${dateTab === 'today' ? 'active' : ''}`} onClick={() => setDateTab('today')}>Hoje</button>
                        <button className={`atm-date-tab ${dateTab === 'yesterday' ? 'active' : ''}`} onClick={() => setDateTab('yesterday')}>Ontem</button>
                        <button className={`atm-date-tab ${dateTab === 'other' ? 'active' : ''}`} onClick={() => {
                            setDateTab('other');
                            setTimeout(() => dateInputRef.current?.showPicker(), 100);
                        }}>Outros</button>
                        <input
                            type="date"
                            ref={dateInputRef}
                            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, bottom: 0 }}
                            value={customDate}
                            onChange={e => setCustomDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><FileText size={18} /></div>
                        <input className="atm-input" placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                <div className="atm-field-card">
                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><Tag size={18} /></div>
                        <select className="atm-input" value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="">Selecione Categoria</option>
                            {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>

                    {type === 'transfer' ? (
                        <>
                            <div className="atm-field-item">
                                <div className="atm-icon-circle"><Wallet size={18} /></div>
                                <select className="atm-input" value={sourceAccount} onChange={e => setSourceAccount(e.target.value)}>
                                    <option value="">Conta Origem</option>
                                    {accountList.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <ChevronRight size={18} color="var(--color-text-muted)" />
                            </div>
                            <div className="atm-field-item">
                                <div className="atm-icon-circle"><Wallet size={18} /></div>
                                <select className="atm-input" value={destAccount} onChange={e => setDestAccount(e.target.value)}>
                                    <option value="">Conta Destino</option>
                                    {accountList.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <ChevronRight size={18} color="var(--color-text-muted)" />
                            </div>
                        </>
                    ) : type === 'card' ? (
                        <div className="atm-field-item">
                            <div className="atm-icon-circle"><CreditCard size={18} /></div>
                            <select className="atm-input" value={card} onChange={e => setCard(e.target.value)}>
                                <option value="">Cartão</option>
                                {cardList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronRight size={18} color="var(--color-text-muted)" />
                        </div>
                    ) : (
                        <div className="atm-field-item">
                            <div className="atm-icon-circle"><Wallet size={18} /></div>
                            <select className="atm-input" value={account} onChange={e => setAccount(e.target.value)}>
                                <option value="">Conta / Carteira</option>
                                {accountList.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <ChevronRight size={18} color="var(--color-text-muted)" />
                        </div>
                    )}
                </div>

                {/* NEW OPTIONS */}
                <div className="atm-field-card">
                    <div className="atm-field-item" onClick={() => setIsRecurring(!isRecurring)}>
                        <div className="atm-icon-circle"><Repeat size={18} /></div>
                        <span className="atm-input" style={{ flex: 1 }}>Repetir Mensalmente</span>
                        {isRecurring && (
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="2"
                                    max="60"
                                    value={repeatCount}
                                    onChange={e => setRepeatCount(Math.max(2, parseInt(e.target.value) || 2))}
                                    style={{ width: '60px', border: 'none', background: 'var(--color-bg)', padding: '0.25rem', borderRadius: '0.5rem', textAlign: 'center', fontWeight: 'bold', marginRight: '0.5rem' }}
                                />
                                <span style={{ fontSize: '0.8rem', opacity: 0.6, marginRight: '0.5rem' }}>vezes</span>
                            </div>
                        )}
                        <div className={`atm-toggle small ${isRecurring ? 'checked' : ''} ${config.colorClass}`}>
                            <div className="atm-toggle-handle"></div>
                        </div>
                    </div>
                    <div className="atm-field-item" onClick={() => setIsPlanning(!isPlanning)}>
                        <div className="atm-icon-circle"><Bookmark size={18} /></div>
                        <span className="atm-input">Registrar Planejamento</span>
                        <div className={`atm-toggle small ${isPlanning ? 'checked' : ''} ${config.colorClass}`}>
                            <div className="atm-toggle-handle"></div>
                        </div>
                    </div>
                    <div className="atm-field-item" onClick={() => fileInputRef.current?.click()}>
                        <div className="atm-icon-circle"><Paperclip size={18} /></div>
                        <span className="atm-input" style={{ opacity: attachment ? 1 : 0.5 }}>
                            {attachment ? attachment.name : 'Adicionar Anexo'}
                        </span>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFile} />
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                </div>


                {!showKeypad && (
                    <button className={`btn btn-primary`} style={{ width: '100%', height: '50px', fontSize: '1rem', borderRadius: '99px', background: config.colorClass === 'expense' ? '#ef4444' : config.colorClass === 'income' ? '#10b981' : config.colorClass === 'transfer' ? '#3b82f6' : '#06b6d4', marginTop: '1rem' }} onClick={handleSave}>
                        {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                )}
            </div>

            {showKeypad && (
                <div className="atm-keypad-overlay">
                    <div className="atm-keypad-grid">
                        {[7, 8, 9, '+'].map(k => <button key={k} className="atm-key" onClick={() => handleKey(k)}>{k}</button>)}
                        {[4, 5, 6, '-'].map(k => <button key={k} className="atm-key" onClick={() => handleKey(k)}>{k}</button>)}
                        {[1, 2, 3, '*'].map(k => <button key={k} className="atm-key" onClick={() => handleKey(k)}>{k}</button>)}
                        {['.', 0, '=', 'unclear'].map((k, i) => k === 'unclear' ? <button key={i} className="atm-key" onClick={() => handleKey('delete')}><Delete size={24} /></button> : <button key={k} className="atm-key" onClick={() => handleKey(k)}>{k}</button>)}

                        <button className="atm-key atm-key-cancel" onClick={() => setShowKeypad(false)}>Cancelar</button>
                        <button className={`atm-key atm-key-action ${config.colorClass}`} onClick={handleDone}>Pronto</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddTransactionModal;
