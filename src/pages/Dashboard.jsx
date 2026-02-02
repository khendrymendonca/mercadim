import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Store as StoreIcon, Calendar, Wallet, PieChart as PieIcon, BarChart3, ChevronRight } from 'lucide-react';
import { getMonthlyTotals, getCategoryTotals, getStoreRanking, getAllPurchases, getMealAllowance, setMealAllowance, getAllMealAllowances } from '../db';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';

const MACRO_CATEGORIES = {
    'Alimentação': { color: '#fb923c', items: ['Mercearia', 'Carnes', 'Hortifruti', 'Padaria', 'Bebidas', 'Frios', 'Laticínios', 'Congelados', 'Doces'] },
    'Higiene & Limpeza': { color: '#3b82f6', items: ['Limpeza', 'Higiene', 'Perfumaria', 'Bebê'] },
    'Casa & Lazer': { color: '#8b5cf6', items: ['Utilidades', 'Pet Shop', 'Papelaria', 'Bazar', 'Eletro'] },
    'Outros': { color: '#94a3b8', items: [] }
};

const getMacroCategory = (category) => {
    for (const [macro, data] of Object.entries(MACRO_CATEGORIES)) {
        if (data.items.includes(category)) return macro;
    }
    return 'Outros';
};

function Dashboard() {
    const [monthlyData, setMonthlyData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [storeRanking, setStoreRanking] = useState([]);
    const [inflationRate, setInflationRate] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [period, setPeriod] = useState('current_month');
    const [allPurchases, setAllPurchases] = useState([]);
    const [vaTotalReceived, setVaTotalReceived] = useState(0);
    const [vaTotalSpent, setVaTotalSpent] = useState(0);
    const [personalSpent, setPersonalSpent] = useState(0);

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

        // VA Logic - CUMULATIVE & SPLIT
        const allVAs = await getAllMealAllowances();
        const totalVa = allVAs.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

        // Filter purchases by payment method
        // Assume legacy records (without payment_method) are 'va' by default unless stated otherwise
        const vaPurchases = purchases.filter(p => !p.payment_method || p.payment_method === 'va');
        const personalPurchases = purchases.filter(p => p.payment_method === 'personal');

        const totalVaSpentEver = vaPurchases.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
        // Only filtered period for personal expense display
        const totalPersonalSpentFiltered = filtered
            .filter(p => p.payment_method === 'personal')
            .reduce((sum, p) => sum + p.total, 0);

        setVaTotalReceived(totalVa);
        setVaTotalSpent(totalVaSpentEver);

        // Total Spent Display (Combined or Focused?)
        // Let's keep Total Spent as the sum of everything for the period, but maybe we can break it down in UI
        const totalFiltered = filtered.reduce((sum, p) => sum + p.total, 0);
        setTotalSpent(totalFiltered);

        // Store Personal Spent for display
        // We can use a new state or just derive it in render if we had filtered personal purchases saved
        // Let's add a state for it
        setPersonalSpent(totalPersonalSpentFiltered);

        // Fetch details for filtered purchases to get categories and store stats
        // This is a bit expensive but necessary if we don't have this data in the purchase summary
        // An alternative is to fetch purchase_items joined with purchases filtered by date from DB
        // But let's simple filter locally since we have all purchases (assuming dataset isn't huge yet)

        // We need to fetch ITEMS for the filtered purchases to do Category breakdown correctly
        // Or we can fetch ALL items once and filter. Let's fetch all items for now, optimizing later. (Or use DB aggregation with date range)

        // Better approach: calculate Store Ranking based on filtered purchases directly (since purchase has store_id)
        const currentStoreStats = {};
        filtered.forEach(p => {
            if (!currentStoreStats[p.storeId]) currentStoreStats[p.storeId] = { total: 0, count: 0 };
            currentStoreStats[p.storeId].total += parseFloat(p.total);
            currentStoreStats[p.storeId].count += 1;
        });

        // We need store names. We could fetch all stores or use what we have.
        // Assuming stores are dynamic, let's look them up if we have a list, otherwise fetch all stores once?
        // Let's rely on the store name being present in the purchase object as 'stores.name' (mapped from getAllPurchases)
        // Check getAllPurchases in db.js: it does .select('*, stores(name)')

        const ranking = Object.entries(currentStoreStats).map(([storeId, stats]) => {
            // Find store name from one of the purchases
            const purchase = filtered.find(p => p.storeId === parseInt(storeId));
            const storeName = purchase?.stores?.name || 'Desconhecido';
            return {
                storeName: storeName,
                averageSpent: parseFloat((stats.total / stats.count).toFixed(2)),
                totalSpent: parseFloat(stats.total.toFixed(2)),
                purchaseCount: stats.count
            };
        }).sort((a, b) => a.averageSpent - b.averageSpent);
        setStoreRanking(ranking);


        // For Categories, we strictly need purchase_items. 
        // Let's fetch items for the filtered purchase IDs.
        // If filtered list is empty, categoryData is empty.
        if (filtered.length === 0) {
            setCategoryData([]);
        } else {
            // For a prototype, fetching all items is safer to ensure we have data, then filter by purchase date client side.
            // Or better: getCategoryTotals(startDate, endDate) in DB.
            // Let's try to be consistent and filter client-side if we can get the data. 
            // Since we don't have items valid in 'filtered' state, let's assume we call a new DB function or fetch all items.

            // Quick Fix: Let's fetch All Purchase Items and filter by date (items have 'date' column in DB)
            // or filter by checking if item.purchase_id is in filtered purchases list.
            const { data: allItems, error } = await import('../lib/supabase').then(m => m.supabase.from('purchase_items').select('*'));

            if (!error && allItems) {
                const filteredItems = allItems.filter(item => filtered.some(p => p.id === item.purchase_id));

                const cats = {};
                filteredItems.forEach(item => {
                    // Agrupando por Macro Categoria
                    const cat = item.category || 'Outros';
                    const macro = getMacroCategory(cat);

                    if (!cats[macro]) cats[macro] = 0;
                    cats[macro] += (item.price * (item.weight || 1));
                });

                // Ordenar por valor para ficar mais bonito no gráfico
                const finalCatData = Object.entries(cats)
                    .map(([category, total]) => ({
                        category,
                        total: parseFloat(total.toFixed(2)),
                        color: MACRO_CATEGORIES[category]?.color || MACRO_CATEGORIES['Outros'].color
                    }))
                    .sort((a, b) => b.total - a.total);

                setCategoryData(finalCatData);
            }
        }


        setMonthlyData(monthly);

        // Inflation calculation (Last month vs Month before last)
        if (monthly.length >= 2) {
            const lastMonthTotal = monthly[monthly.length - 1].total;
            const prevMonthTotal = monthly[monthly.length - 2].total;
            const rate = ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
            setInflationRate(rate);
        }
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
                    <Link
                        to="/va"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', minHeight: 'auto', fontSize: '12px', textDecoration: 'none' }}
                    >
                        Configurar
                    </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Total Recebido</p>
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--slate-800)' }}>{formatCurrency(vaTotalReceived)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Gasto Acumulado (Vale)</p>
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--primary-600)' }}>{formatCurrency(vaTotalSpent)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '12px', color: 'var(--slate-500)', marginBottom: '4px' }}>Saldo Atual</p>
                        <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: vaTotalReceived - vaTotalSpent >= 0 ? 'var(--primary-700)' : 'var(--accent-500)' }}>
                            {formatCurrency(Math.max(0, vaTotalReceived - vaTotalSpent))}
                        </p>
                    </div>
                </div>

                {vaTotalSpent > vaTotalReceived && (
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
                        ⚠️ Seu gasto total histórico superou o vale em <strong>{formatCurrency(vaTotalSpent - vaTotalReceived)}</strong>.
                    </div>
                )}
            </div>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card fade-in" style={{ background: 'var(--primary-500)', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        <DollarSign size={20} color="white" />
                        <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, fontWeight: 600 }}>Total Gasto (Período)</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
                        {formatCurrency(totalSpent)}
                    </p>
                    <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                        Vale: {formatCurrency(totalSpent - personalSpent)} • Bolso: {formatCurrency(personalSpent)}
                    </p>
                </div>

                <div className="card fade-in" style={{ background: 'white', borderLeft: '4px solid var(--accent-500)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                        <Wallet size={20} color="var(--accent-500)" />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', fontWeight: 600 }}>Gasto do Bolso</span>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--accent-500)' }}>
                        {formatCurrency(personalSpent)}
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
                <div className="card fade-in" style={{ height: '400px', display: 'flex', flexDirection: 'column', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div style={{ background: 'var(--primary-100)', padding: '8px', borderRadius: '10px' }}>
                                <PieIcon size={20} color="var(--primary-600)" />
                            </div>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Por Categoria</h3>
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="total"
                                    nameKey="category"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Valor']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value, entry) => (
                                        <span style={{ color: 'var(--slate-600)', fontWeight: 500, fontSize: '12px' }}>{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
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
                                    {formatCurrency(store.averageSpent)}
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
