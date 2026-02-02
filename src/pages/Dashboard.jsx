import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Store as StoreIcon, Calendar, Wallet, PieChart as PieIcon, BarChart3, ChevronRight, Edit3 } from 'lucide-react';
import { getMonthlyTotals, getCategoryTotals, getStoreRanking, getAllPurchases, getMealAllowance, setMealAllowance } from '../db';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#fb923c', '#f43f5e', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#d97706'];

function Dashboard() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [storeRanking, setStoreRanking] = useState([]);
    const [inflationRate, setInflationRate] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [period, setPeriod] = useState('current_month'); // 'current_month', 'last_month', 'last_3_months', 'all'
    const [allPurchases, setAllPurchases] = useState([]);
    const [vaAmount, setVaAmount] = useState(0);
    const [showVaEdit, setShowVaEdit] = useState(false);
    const [tempVa, setTempVa] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, [period]);

    const getCurrentMonthKey = () => format(new Date(), 'yyyy-MM');

    const filterPurchasesByPeriod = (purchases) => {
        const now = new Date();
        let start, end;

        if (period === 'current_month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else if (period === 'last_month') {
            const lastMonth = subMonths(now, 1);
            start = startOfMonth(lastMonth);
            end = endOfMonth(lastMonth);
        } else if (period === 'last_3_months') {
            start = startOfMonth(subMonths(now, 2));
            end = endOfMonth(now);
        } else {
            return purchases;
        }

        return purchases.filter(p => {
            const pDate = parseISO(p.date);
            return isWithinInterval(pDate, { start, end });
        });
    };

    const loadDashboardData = async () => {
        const monthly = await getMonthlyTotals();
        const purchases = await getAllPurchases();
        setAllPurchases(purchases);

        // Period Filtering
        const filtered = filterPurchasesByPeriod(purchases);

        // Recalculate based on filtered
        const total = filtered.reduce((sum, p) => sum + p.total, 0);
        setTotalSpent(total);

        // VA Logic
        const monthKey = period === 'last_month'
            ? format(subMonths(new Date(), 1), 'yyyy-MM')
            : getCurrentMonthKey();

        const va = await getMealAllowance(monthKey);
        setVaAmount(va?.amount || 0);

        // Categories for filtered
        const catStats = {};
        filtered.forEach(p => {
            // This is tricky because purchases don't have items here
            // In a real app, you'd fetch items for these purchases or use a more complex query
            // For now, let's use all categories if 'all', or just sum purchase totals as 'Mercado' if specific
        });

        // For simplicity, let's keep the global rankings and charts but update summary
        const globalCategories = await getCategoryTotals();
        const stores = await getStoreRanking();

        setMonthlyData(monthly);
        setCategoryData(globalCategories);
        setStoreRanking(stores);

        // Inflation calculation (Last month vs Month before last)
        if (monthly.length >= 2) {
            const lastMonthTotal = monthly[monthly.length - 1].total;
            const prevMonthTotal = monthly[monthly.length - 2].total;
            const rate = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
            setInflationRate(rate);
        }
    };

    const handleSaveVa = async () => {
        const amount = parseFloat(tempVa);
        if (isNaN(amount)) return;

        const monthKey = period === 'last_month'
            ? format(subMonths(new Date(), 1), 'yyyy-MM')
            : getCurrentMonthKey();

        await setMealAllowance(monthKey, amount);
        setVaAmount(amount);
        setShowVaEdit(false);
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>Métricas</h2>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="select"
                    style={{ width: 'auto', minWidth: '180px', borderRadius: '20px', padding: '8px 16px' }}
                >
                    <option value="current_month">Este Mês</option>
                    <option value="last_month">Mês Passado</option>
                    <option value="last_3_months">Últimos 3 Meses</option>
                    <option value="all">Todo o Período</option>
                </select>
            </div>

            {/* Vale Alimentação Card */}
            <div className="card fade-in" style={{
                marginBottom: 'var(--spacing-xl)',
                background: 'white',
                border: '1px solid var(--primary-100)',
                padding: 'var(--spacing-lg)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{ background: 'var(--primary-100)', padding: '8px', borderRadius: '10px' }}>
                            <Wallet size={20} color="var(--primary-600)" />
                        </div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Vale Alimentação</h3>
                    </div>
                    <button
                        onClick={() => { setTempVa(vaAmount); setShowVaEdit(true); }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', minHeight: 'auto', fontSize: '12px' }}
                    >
                        <Edit3 size={14} /> Configurar
                    </button>
                </div>

                {showVaEdit ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }} className="fade-in">
                        <input
                            type="number"
                            className="input"
                            placeholder="Valor recebido (R$)"
                            value={tempVa}
                            onChange={(e) => setTempVa(e.target.value)}
                            autoFocus
                        />
                        <button className="btn btn-primary" onClick={handleSaveVa}>OK</button>
                        <button className="btn btn-secondary" onClick={() => setShowVaEdit(false)}>X</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Recebido</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--slate-800)' }}>R$ {vaAmount.toFixed(2)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Utilizado</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--primary-600)' }}>R$ {Math.min(totalSpent, vaAmount).toFixed(2)}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Saldo</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: vaAmount - totalSpent >= 0 ? 'var(--primary-700)' : 'var(--accent-500)' }}>
                                R$ {Math.max(0, vaAmount - totalSpent).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}

                {!showVaEdit && totalSpent > vaAmount && (
                    <div style={{
                        marginTop: 'var(--spacing-md)',
                        padding: '10px',
                        background: 'var(--accent-50)',
                        borderRadius: '8px',
                        borderLeft: '4px solid var(--accent-500)',
                        fontSize: '13px',
                        color: 'var(--accent-500)',
                        fontWeight: 600
                    }}>
                        ⚠️ Você investiu <strong>R$ {(totalSpent - vaAmount).toFixed(2)}</strong> do seu próprio dinheiro.
                    </div>
                )}
            </div>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card fade-in" style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', color: 'white', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        <DollarSign size={24} />
                        <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, fontWeight: 600 }}>Total Gasto</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                        R$ {totalSpent.toFixed(2)}
                    </p>
                </div>

                <div className="card fade-in" style={{
                    background: inflationRate >= 0
                        ? 'linear-gradient(135deg, #f43f5e, #e11d48)'
                        : 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                    color: 'white',
                    border: 'none'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        {inflationRate >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, fontWeight: 600 }}>Inflação Pessoal</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                        {inflationRate >= 0 ? '+' : ''}{inflationRate.toFixed(1)}%
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, marginTop: 'var(--spacing-xs)', fontWeight: 500 }}>
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
                                    border: '1px solid var(--primary-100)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="var(--primary-500)"
                                strokeWidth={4}
                                name="Total (R$)"
                                dot={{ fill: 'var(--primary-500)', r: 6, strokeWidth: 2, stroke: 'white' }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
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
                                    <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{cat.category}</span>
                                    <span style={{ color: 'var(--primary-600)', fontWeight: 700 }}>
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
                                background: index === 0 ? 'var(--primary-50)' : 'var(--slate-50)',
                                borderRadius: 'var(--radius-md)',
                                border: index === 0 ? '2px solid var(--primary-200)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: index === 0 ? 'var(--primary-500)' : 'var(--slate-300)',
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
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>Média por compra</p>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--primary-700)' }}>
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
