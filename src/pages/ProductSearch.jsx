import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Calendar, Store as StoreIcon, Edit2, Tag, Layers, Package, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getProductHistory, getAllPurchaseItems, getAllStores, getAllPurchases, getAllProducts, updateProduct, getAllCategories } from '../db';
import { format } from 'date-fns';

function ProductSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [productHistory, setProductHistory] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [categories, setCategories] = useState([]);

    // Edit state
    const [editingProduct, setEditingProduct] = useState(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editUnit, setEditUnit] = useState('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        const [items, storeList, purchaseList, catList, catalogProds] = await Promise.all([
            getAllPurchaseItems(),
            getAllStores(),
            getAllPurchases(),
            getAllCategories(),
            getAllProducts()
        ]);

        setAllProducts(catalogProds);
        setStores(storeList);
        setPurchases(purchaseList);
        setCategories(catList);
    };

    const handleSelectProduct = (name) => {
        setSearchTerm(name);
        handleSearch(name);
    };

    const handleSearch = async (nameOverride) => {
        const query = nameOverride || searchTerm;
        if (!query) return;

        const history = await getProductHistory(query);

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
        } else {
            setSelectedProduct(query);
        }
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setEditName(product.name);
        setEditCategory(product.category);
        setEditUnit(product.unit);
    };

    const saveEdit = async () => {
        try {
            await updateProduct(editingProduct.id, {
                name: editName,
                category: editCategory,
                unit: editUnit
            });
            setEditingProduct(null);
            loadProducts();
            if (selectedProduct) handleSearch(editName);
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
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
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                                    setSearchTerm(product.name);
                                    handleSearch(product.name);
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
                                onMouseEnter={(e) => e.target.style.background = 'var(--primary-50)'}
                                onMouseLeave={(e) => e.target.style.background = 'white'}
                            >
                                {product.name}
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
                        <div className="card fade-in" style={{ background: 'var(--primary-50)', borderLeft: '4px solid var(--primary-500)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)', fontWeight: 600 }}>
                                Menor Preço
                            </p>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--primary-600)' }}>
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
                            background: getPriceVariation() >= 0 ? '#fff1f2' : 'var(--primary-50)',
                            borderLeft: `4px solid ${getPriceVariation() >= 0 ? 'var(--danger)' : 'var(--primary-500)'}`
                        }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)', marginBottom: 'var(--spacing-xs)', fontWeight: 600 }}>
                                Variação
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 800,
                                color: getPriceVariation() >= 0 ? 'var(--danger)' : 'var(--primary-600)',
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
                                        border: '1px solid var(--primary-100)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-md)'
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
                                    stroke="var(--primary-500)"
                                    strokeWidth={4}
                                    dot={{ fill: 'var(--primary-500)', r: 6, strokeWidth: 2, stroke: 'white' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
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
                                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--primary-600)' }}>
                                        R$ {item.price.toFixed(2)}
                                    </p>
                                    {item.price === getLowestPrice() && (
                                        <span className="badge badge-success" style={{ marginTop: 'var(--spacing-xs)', background: 'var(--primary-500)', color: 'white' }}>
                                            Menor Preço
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {productHistory.length === 0 && (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        {searchTerm ? 'Resultados do Catálogo' : 'Explorar Catálogo'}
                    </p>
                    {filteredProducts.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                            <Search size={64} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)' }} />
                            <p style={{ color: 'var(--slate-500)' }}>Nenhum produto encontrado.</p>
                        </div>
                    ) : (
                        filteredProducts.map(prod => (
                            <div key={prod.id} className="card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)' }}>
                                <div onClick={() => handleSelectProduct(prod.name)} style={{ cursor: 'pointer', flex: 1 }}>
                                    <h3 style={{ fontWeight: 600 }}>{prod.name}</h3>
                                    <p style={{ fontSize: '12px', color: 'var(--primary-600)', fontWeight: 600 }}>
                                        {prod.category} • Unidade Padrão: {prod.unit}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button
                                        onClick={() => handleEditProduct(prod)}
                                        className="btn btn-secondary"
                                        style={{ padding: '8px', background: 'var(--slate-100)' }}
                                    >
                                        <Edit2 size={16} color="var(--slate-600)" />
                                    </button>
                                    <button
                                        onClick={() => handleSelectProduct(prod.name)}
                                        className="btn btn-primary"
                                        style={{ padding: '8px' }}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal de Edição */}
            {editingProduct && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Editar Produto</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600 }}>Nome</label>
                            <input
                                className="input"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Categoria</label>
                                    <select
                                        className="select"
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                    >
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Unidade</label>
                                    <select
                                        className="select"
                                        value={editUnit}
                                        onChange={(e) => setEditUnit(e.target.value)}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="un">un</option>
                                        <option value="L">L</option>
                                        <option value="ml">ml</option>
                                        <option value="g">g</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProduct(null)}>Cancelar</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveEdit}>Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductSearch;
