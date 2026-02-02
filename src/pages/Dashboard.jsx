import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Store as StoreIcon } from 'lucide-react';
import { getMonthlyTotals, getCategoryTotals, getStoreRanking, getAllPurchases } from '../db';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function Dashboard() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [storeRanking, setStoreRanking] = useState([]);
    const [inflationRate, setInflationRate] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        const monthly = await getMonthlyTotals();
        const categories = await getCategoryTotals();
        const stores = await getStoreRanking();
        const purchases = await getAllPurchases();

        setMonthlyData(monthly);
        setCategoryData(categories);
        setStoreRanking(stores);

        // Calculate total spent
        const total = purchases.reduce((sum, p) => sum + p.total, 0);
        setTotalSpent(total);

        // Calculate inflation rate (comparing last 2 months)
        if (monthly.length >= 2) {
            const lastMonth = monthly[monthly.length - 1].total;
            const previousMonth = monthly[monthly.length - 2].total;
            const rate = ((lastMonth - previousMonth) / previousMonth) * 100;
            setInflationRate(rate);
        }
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Dashboard
            </h2>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card fade-in" style={{ background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        <DollarSign size={24} />
                        <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Total Gasto</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                        R$ {totalSpent.toFixed(2)}
                    </p>
                </div>

                <div className="card fade-in" style={{
                    background: inflationRate >= 0
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        {inflationRate >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Inflação Pessoal</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>
                        {inflationRate >= 0 ? '+' : ''}{inflationRate.toFixed(1)}%
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, marginTop: 'var(--spacing-xs)' }}>
                        {inflationRate >= 0 ? 'Seus gastos aumentaram' : 'Seus gastos diminuíram'}
                    </p>
                </div>
            </div>

            {/* Gráfico de Gastos Mensais */}
            {monthlyData.length > 0 && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                        Gastos Mensais
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-200)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--slate-600)"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            <YAxis
                                stroke="var(--slate-600)"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'white',
                                    border: '2px solid var(--emerald-500)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="var(--emerald-600)"
                                strokeWidth={3}
                                name="Total (R$)"
                                dot={{ fill: 'var(--emerald-600)', r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Gastos por Categoria */}
            {categoryData.length > 0 && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                        Gastos por Categoria
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="total"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>

                        <div>
                            {categoryData.sort((a, b) => b.total - a.total).map((cat, index) => (
                                <div
                                    key={cat.category}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 'var(--spacing-sm)',
                                        marginBottom: 'var(--spacing-xs)',
                                        background: 'var(--slate-50)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: `4px solid ${COLORS[index % COLORS.length]}`
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>{cat.category}</span>
                                    <span style={{ color: 'var(--emerald-600)', fontWeight: 700 }}>
                                        R$ {cat.total.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ranking de Mercados */}
            {storeRanking.length > 0 && (
                <div className="card fade-in">
                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                        <StoreIcon size={24} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                        Ranking de Mercados (Mais Baratos)
                    </h3>
                    {storeRanking.map((store, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-sm)',
                                background: index === 0 ? 'var(--emerald-50)' : 'var(--slate-50)',
                                borderRadius: 'var(--radius-md)',
                                border: index === 0 ? '2px solid var(--emerald-500)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: index === 0 ? 'var(--emerald-500)' : 'var(--slate-300)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: 'var(--font-size-lg)'
                                    }}
                                >
                                    {index + 1}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{store.storeName}</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                        {store.purchaseCount} compras
                                    </p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>Média por compra</p>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                    R$ {store.averageSpent.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Dashboard;
