import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import './Finance.css';

const DATA_PIE = [
    { name: 'Moradia', value: 1200, color: '#3b82f6' }, // Blue
    { name: 'Alim.', value: 800, color: '#10b981' }, // Green
    { name: 'Lazer', value: 400, color: '#f59e0b' }, // Yellow
    { name: 'Transp.', value: 300, color: '#ef4444' }, // Red
];

const DATA_BAR = [
    { name: 'Jan', val: 2000 },
    { name: 'Fev', val: 3000 },
    { name: 'Mar', val: 2150 },
    { name: 'Abr', val: 2800 },
];

const Finance = () => {
    return (
        <div className="pb-20">
            <header className="mb-6 pt-4">
                <h1>Financeiro</h1>
                <div className="card-balance">
                    <div className="text-sm opacity-80">Saldo Total</div>
                    <div className="text-3xl font-bold mt-1">R$ 5.320,00</div>
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
                            <TrendingDown size={16} /> R$ 2.150
                        </div>
                        <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
                            <TrendingUp size={16} /> R$ 3.800
                        </div>
                    </div>
                </div>
            </header>

            <section className="mb-6">
                <h2 className="section-title">Despesas do Mês</h2>
                <div className="card h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={DATA_PIE}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {DATA_PIE.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Legend Overlay could go here */}
                </div>
            </section>

            <section>
                <h2 className="section-title">Transações Recentes</h2>
                <div className="flex flex-col gap-2">
                    <TransactionItem title="Conta de Luz" amount="- R$ 120,00" date="Ontem" type="expense" />
                    <TransactionItem title="Salário" amount="+ R$ 3.000,00" date="05/04" type="income" />
                    <TransactionItem title="Supermercado" amount="- R$ 450,00" date="02/04" type="expense" />
                </div>
            </section>
        </div>
    );
};

const TransactionItem = ({ title, amount, date, type }) => (
    <div className="card flex justify-between items-center py-3 px-4">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <DollarSign size={16} />
            </div>
            <div>
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-xs text-muted">{date}</div>
            </div>
        </div>
        <div className={`font-bold text-sm ${type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
            {amount}
        </div>
    </div>
);

export default Finance;
