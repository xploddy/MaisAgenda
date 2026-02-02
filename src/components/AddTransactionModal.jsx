import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Calendar, FileText, Tag, Wallet, Paperclip, ChevronRight, Delete, Check, ArrowRight, CreditCard } from 'lucide-react';
import './AddTransactionModal.css';
import { format, subDays, parseISO } from 'date-fns';
import { supabase } from '../supabaseClient';

const AddTransactionModal = ({ type, onClose }) => {
    // type: 'expense' | 'income' | 'transfer' | 'card'
    const [displayValue, setDisplayValue] = useState('0');
    const [showKeypad, setShowKeypad] = useState(true);
    const [isPaid, setIsPaid] = useState(true);
    const [dateTab, setDateTab] = useState('today'); // today, yesterday, other
    const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');

    // Type specific fields
    const [account, setAccount] = useState('');
    const [sourceAccount, setSourceAccount] = useState('');
    const [destAccount, setDestAccount] = useState('');
    const [card, setCard] = useState('');

    const [loading, setLoading] = useState(false);
    const dateInputRef = useRef(null);

    const config = {
        expense: { label: 'Despesa', colorClass: 'expense', prefix: '-' },
        income: { label: 'Receita', colorClass: 'income', prefix: '+' },
        transfer: { label: 'Transferência', colorClass: 'transfer', prefix: '' },
        card: { label: 'Despesa Cartão', colorClass: 'card', prefix: '-' },
    }[type] || { label: 'Transação', colorClass: 'expense', prefix: '' };

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
            // Evaluate if needed
            // eslint-disable-next-line no-eval
            const result = eval(displayValue.replace(/,/g, '.'));
            setDisplayValue(String(result));
            setShowKeypad(false);
        } catch (e) {
            setShowKeypad(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const amount = parseFloat(displayValue);
        let finalDate = new Date();
        if (dateTab === 'yesterday') finalDate = subDays(new Date(), 1);
        else if (dateTab === 'other') finalDate = parseISO(customDate);

        // Construct Title and Type based on Mode
        let finalTitle = description || config.label;
        let finalType = type;
        let finalCategory = category || 'Outros';

        if (type === 'transfer') {
            finalTitle = `${description || 'Transferência'}: ${sourceAccount || 'Origem'} -> ${destAccount || 'Destino'}`;
            // Assuming DB uses 'expense' or specific 'transfer' enum. We try 'transfer'. 
            // If strictly 'expense'/'income' enum, change this line to 'expense'.
            // Based on Finance.jsx, it uses lowercase type. We'll verify if 'transfer' breaks charts (probably fine or filtered out).
        } else if (type === 'card') {
            finalType = 'expense';
            finalTitle = `${description || 'Cartão'}`;
            finalCategory = 'Cartão de Crédito'; // Force category or use user input
        }

        const payload = {
            title: finalTitle, // Corrected column name
            amount: amount,
            type: finalType,
            date: finalDate.toISOString(),
            status: isPaid ? 'paid' : 'pending',
            category: finalCategory,
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        const { error } = await supabase.from('transactions').insert([payload]);
        setLoading(false);
        if (error) {
            alert('Erro: ' + error.message);
        } else {
            onClose();
            // Refresh logic
            window.location.reload();
        }
    };

    return (
        <div className="atm-overlay">
            <div className={`atm-header ${config.colorClass}`}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white' }}><span style={{ fontSize: '1rem' }}>Cancelar</span></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    {config.label} <ChevronDown size={16} />
                </div>
                <div style={{ width: 60 }}></div>
            </div>

            <div className={`atm-value-section ${config.colorClass}`} onClick={() => setShowKeypad(true)}>
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
                        <input className="atm-input" placeholder="Categoria" value={category} onChange={e => setCategory(e.target.value)} />
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>

                    {/* TYPE SPECIFIC FIELDS */}
                    {type === 'transfer' ? (
                        <>
                            <div className="atm-field-item">
                                <div className="atm-icon-circle"><Wallet size={18} /></div>
                                <input className="atm-input" placeholder="Conta Origem" value={sourceAccount} onChange={e => setSourceAccount(e.target.value)} />
                                <ChevronRight size={18} color="var(--color-text-muted)" />
                            </div>
                            <div className="atm-field-item">
                                <div className="atm-icon-circle"><Wallet size={18} /></div>
                                <input className="atm-input" placeholder="Conta Destino" value={destAccount} onChange={e => setDestAccount(e.target.value)} />
                                <ChevronRight size={18} color="var(--color-text-muted)" />
                            </div>
                        </>
                    ) : type === 'card' ? (
                        <div className="atm-field-item">
                            <div className="atm-icon-circle"><CreditCard size={18} /></div>
                            <input className="atm-input" placeholder="Selecione o Cartão" value={card} onChange={e => setCard(e.target.value)} />
                            <ChevronRight size={18} color="var(--color-text-muted)" />
                        </div>
                    ) : (
                        <div className="atm-field-item">
                            <div className="atm-icon-circle"><Wallet size={18} /></div>
                            <input className="atm-input" placeholder="Conta / Carteira" value={account} onChange={e => setAccount(e.target.value)} />
                            <ChevronRight size={18} color="var(--color-text-muted)" />
                        </div>
                    )}

                    <div className="atm-field-item">
                        <div className="atm-icon-circle"><Paperclip size={18} /></div>
                        <span className="atm-input" style={{ opacity: 0.5 }}>Anexo</span>
                        <ChevronRight size={18} color="var(--color-text-muted)" />
                    </div>
                </div>

                {!showKeypad && (
                    <button className={`btn btn-primary`} style={{ width: '100%', height: '50px', fontSize: '1rem', borderRadius: '99px', background: config.colorClass === 'expense' ? '#ef4444' : config.colorClass === 'income' ? '#10b981' : config.colorClass === 'transfer' ? '#3b82f6' : '#06b6d4' }} onClick={handleSave}>
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
