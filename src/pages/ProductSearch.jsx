import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Calendar, Store as StoreIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getProductHistory, getAllPurchaseItems, getAllStores, getAllPurchases } from '../db';
import { format } from 'date-fns';

function ProductSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [productHistory, setProductHistory] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [purchases, setPurchases] = useState([]);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        const items = await getAllPurchaseItems();
        const storeList = await getAllStores();
        const purchaseList = await getAllPurchases();

        // Get unique products
        const uniqueProducts = [...new Set(items.map(item => item.productName))];
        setAllProducts(uniqueProducts);
        setStores(storeList);
        setPurchases(purchaseList);
    };

    const handleSearch = async () => {
        if (!searchTerm) return;

        const history = await getProductHistory(searchTerm);

        // Enrich with store and purchase data
        const enrichedHistory = history.map(item => {
            const purchase = purchases.find(p => p.id === item.purchaseId);
            const store = stores.find(s => s.id === purchase?.storeId);
            return {
                ...item,
                storeName: store?.name || 'Desconhecido',
                purchaseDate: purchase?.date
            };
        });

        setProductHistory(enrichedHistory);
        if (enrichedHistory.length > 0) {
            setSelectedProduct(enrichedHistory[0].productName);
        }
    };

    const getChartData = () => {
        return productHistory.map(item => ({
            date: format(new Date(item.purchaseDate), 'dd/MM'),
            price: item.price,
            fullDate: format(new Date(item.purchaseDate), 'dd/MM/yyyy'),
            store: item.storeName
        })).reverse();
    };

    const getLowestPrice = () => {
        if (productHistory.length === 0) return null;
        return Math.min(...productHistory.map(item => item.price));
    };

    const getHighestPrice = () => {
        if (productHistory.length === 0) return null;
        return Math.max(...productHistory.map(item => item.price));
    };

    const getPriceVariation = () => {
        if (productHistory.length < 2) return 0;
        const latest = productHistory[0].price;
        const oldest = productHistory[productHistory.length - 1].price;
        return ((latest - oldest) / oldest) * 100;
    };

    const filteredProducts = allProducts.filter(product =>
        product.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Consulta de Produto
            </h2>

            {/* Busca */}
            <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Digite o nome do produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        style={{ paddingRight: '50px' }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        style={{
                            position: 'absolute',
                            right: '4px',
                            top: '4px',
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            minHeight: 'auto'
                        }}
                    >
                        <Search size={20} />
                    </button>
                </div>

                {/* Sugestões */}
                {searchTerm && filteredProducts.length > 0 && productHistory.length === 0 && (
                    <div style={{
                        marginTop: 'var(--spacing-md)',
                        background: 'var(--slate-50)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-sm)'
                    }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)' }}>
                            Sugestões:
                        </p>
                        {filteredProducts.slice(0, 5).map((product, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setSearchTerm(product);
                                    handleSearch();
                                }}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    background: 'white',
                                    border: '1px solid var(--slate-200)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: 'var(--spacing-xs)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'var(--emerald-50)'}
                                onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                                {product}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Resultados */}
            {productHistory.length > 0 && (
                <>
                    {/* Cards de Resumo */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                        <div className="card fade-in" style={{ background: 'var(--emerald-50)', borderLeft: '4px solid var(--emerald-500)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)' }}>
                                Menor Preço
                            </p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                R$ {getLowestPrice()?.toFixed(2)}
                            </p>
                        </div>

                        <div className="card fade-in" style={{ background: '#fee2e2', borderLeft: '4px solid #ef4444' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)' }}>
                                Maior Preço
                            </p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#dc2626' }}>
                                R$ {getHighestPrice()?.toFixed(2)}
                            </p>
                        </div>

                        <div className="card fade-in" style={{
                            background: getPriceVariation() >= 0 ? '#fee2e2' : 'var(--emerald-50)',
                            borderLeft: `4px solid ${getPriceVariation() >= 0 ? '#ef4444' : 'var(--emerald-500)'}`
                        }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)' }}>
                                Variação
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                color: getPriceVariation() >= 0 ? '#dc2626' : 'var(--emerald-600)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)'
                            }}>
                                {getPriceVariation() >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                {getPriceVariation() >= 0 ? '+' : ''}{getPriceVariation().toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Gráfico de Variação de Preço */}
                    <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Variação de Preço - {selectedProduct}
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-200)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--slate-600)"
                                    style={{ fontSize: 'var(--font-size-sm)' }}
                                />
                                <YAxis
                                    stroke="var(--slate-600)"
                                    style={{ fontSize: 'var(--font-size-sm)' }}
                                    domain={['dataMin - 1', 'dataMax + 1']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: '2px solid var(--emerald-500)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                    formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Preço']}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload[0]) {
                                            return `${payload[0].payload.fullDate} - ${payload[0].payload.store}`;
                                        }
                                        return label;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="price"
                                    stroke="var(--emerald-600)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--emerald-600)', r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Histórico Detalhado */}
                    <div className="card fade-in">
                        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
                            Histórico de Compras ({productHistory.length})
                        </h3>

                        {productHistory.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--slate-50)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-sm)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <StoreIcon size={16} color="var(--slate-600)" />
                                        <span style={{ fontWeight: 600 }}>{item.storeName}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                        <span>
                                            <Calendar size={14} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                                            {format(new Date(item.purchaseDate), 'dd/MM/yyyy')}
                                        </span>
                                        {item.brand && <span>Marca: {item.brand}</span>}
                                        <span>{item.weight}{item.unit}</span>
                                        {item.pricePerUnit && <span>R$ {item.pricePerUnit.toFixed(2)}/{item.unit}</span>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                        R$ {item.price.toFixed(2)}
                                    </p>
                                    {item.price === getLowestPrice() && (
                                        <span className="badge badge-success" style={{ marginTop: 'var(--spacing-xs)' }}>
                                            Menor Preço
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {productHistory.length === 0 && searchTerm && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <Search size={64} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)' }} />
                    <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--slate-500)' }}>
                        Nenhum resultado encontrado para "{searchTerm}"
                    </p>
                </div>
            )}
        </div>
    );
}

export default ProductSearch;
