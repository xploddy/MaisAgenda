import React from 'react';
import BottomNav from './BottomNav';

const Layout = ({ children, toggleTheme, currentTheme }) => {
    return (
        <div className="app-layout">
            <main className="container animate-fade-in">
                <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'flex-end' }}>
                    {/* We'll pass this as a prop later or use context, but for now specific toggle in header if needed */}
                </div>
                {/* Clone children to pass common props if needed, but usually routes handle their own */}
                {React.Children.map(children, child => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, { toggleTheme, currentTheme });
                    }
                    return child;
                })}
            </main>
            <BottomNav />
        </div>
    );
};

export default Layout;
