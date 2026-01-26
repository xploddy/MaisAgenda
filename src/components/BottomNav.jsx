import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, ShoppingCart, Calendar, PieChart } from 'lucide-react';
import './BottomNav.css';

const BottomNav = () => {
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Inicio' },
        { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
        { to: '/shopping', icon: ShoppingCart, label: 'Compras' },
        { to: '/planning', icon: Calendar, label: 'Plano' }, // "Plano" to keep it short
        { to: '/finance', icon: PieChart, label: 'Finanças' },
    ];

    return (
        <nav className="bottom-nav">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Icon size={24} strokeWidth={2} />
                    <span className="nav-label">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default BottomNav;
