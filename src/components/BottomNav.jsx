import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, Calendar, MoreHorizontal, Plus, TrendingUp, TrendingDown, CreditCard, ArrowLeftRight } from 'lucide-react';
import './BottomNav.css';
import AddTransactionModal from './AddTransactionModal';

const BottomNav = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const openModal = (type) => {
        setActiveModal(type);
        setIsMenuOpen(false);
    };

    return (
        <>
            {isMenuOpen && (
                <div className="fab-menu-overlay" onClick={() => setIsMenuOpen(false)}>
                    <div className="fab-options-fan" onClick={e => e.stopPropagation()}>
                        <div className="fab-option-btn" onClick={() => openModal('transfer')}>
                            <div className="fab-option-icon transfer"><ArrowLeftRight size={24} /></div>
                            <span>Transferência</span>
                        </div>
                        <div className="fab-option-btn" onClick={() => openModal('income')}>
                            <div className="fab-option-icon income"><TrendingUp size={24} /></div>
                            <span>Receita</span>
                        </div>
                        <div className="fab-option-btn" onClick={() => openModal('expense')}>
                            <div className="fab-option-icon expense"><TrendingDown size={24} /></div>
                            <span>Despesa</span>
                        </div>
                        <div className="fab-option-btn" onClick={() => openModal('card')}>
                            <div className="fab-option-icon card"><CreditCard size={24} /></div>
                            <span>Despesa Cartão</span>
                        </div>
                    </div>
                </div>
            )}

            {activeModal && <AddTransactionModal type={activeModal} onClose={() => setActiveModal(null)} />}

            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Home size={24} strokeWidth={2} />
                    <span className="nav-label">Principal</span>
                </NavLink>

                <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <List size={24} strokeWidth={2} />
                    <span className="nav-label">Transações</span>
                </NavLink>

                <div className="fab-container">
                    <button className={`fab-main ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <Plus size={28} />
                    </button>
                </div>

                <NavLink to="/planning" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={24} strokeWidth={2} />
                    <span className="nav-label">Planejamento</span>
                </NavLink>

                <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MoreHorizontal size={24} strokeWidth={2} />
                    <span className="nav-label">Mais</span>
                </NavLink>
            </nav>
        </>
    );
};

export default BottomNav;
