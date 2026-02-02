import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, List, Calendar, Plus, TrendingUp, TrendingDown, CreditCard, ArrowLeftRight, CheckSquare, Clock } from 'lucide-react';
import './BottomNav.css';
import AddTransactionModal from './AddTransactionModal';
import AddTaskModal from './AddTaskModal';
import AddPlanningModal from './AddPlanningModal';

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
                        <div className="fab-option-btn" onClick={() => openModal('planning')}>
                            <div className="fab-option-icon planning"><Clock size={24} /></div>
                            <span>Evento</span>
                        </div>
                        <div className="fab-option-btn" onClick={() => openModal('task')}>
                            <div className="fab-option-icon task"><CheckSquare size={24} /></div>
                            <span>Tarefa</span>
                        </div>
                        <div className="fab-option-btn" onClick={() => openModal('transfer')}>
                            <div className="fab-option-icon transfer"><ArrowLeftRight size={24} /></div>
                            <span>Transferir</span>
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
                            <span>Cartão</span>
                        </div>
                    </div>
                </div>
            )}

            {activeModal === 'task' && <AddTaskModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'planning' && <AddPlanningModal onClose={() => setActiveModal(null)} />}
            {['expense', 'income', 'transfer', 'card'].includes(activeModal) && (
                <AddTransactionModal type={activeModal} onClose={() => setActiveModal(null)} />
            )}

            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Home size={24} strokeWidth={2} />
                    <span className="nav-label">Principal</span>
                </NavLink>

                <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <CheckSquare size={24} strokeWidth={2} />
                    <span className="nav-label">Tarefas</span>
                </NavLink>

                <div className="fab-container">
                    <button className={`fab-main ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <Plus size={28} />
                    </button>
                </div>

                <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <TrendingUp size={24} strokeWidth={2} />
                    <span className="nav-label">Transações</span>
                </NavLink>

                <NavLink to="/planning" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={24} strokeWidth={2} />
                    <span className="nav-label">Plano</span>
                </NavLink>
            </nav>
        </>
    );
};

export default BottomNav;
