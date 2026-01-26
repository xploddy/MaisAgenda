import React from 'react';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <main className="container animate-fade-in">
                {children}
            </main>
            <BottomNav />
        </div>
    );
};

export default Layout;
