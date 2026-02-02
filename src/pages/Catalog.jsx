import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Store,
    Package,
    Calendar,
    Tag,
    Search,
    ChevronRight,
    TrendingDown,
    MapPin
} from 'lucide-react';
import {
    getAllProducts,
    addProduct,
    deleteProduct,
    getAllStores,
    addStore,
    deleteStore,
    getProductHistory
} from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES = [
    'Higiene', 'Bebidas', 'Mercearia', 'Padaria', 'Limpeza', 'Hortifruti', 'Açougue', 'Outros'
];

function Catalog() {
    const [view, setView] = useState('products'); // 'products' or 'stores'
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // New Product/Store state
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('Mercearia');
    const [newUnit, setNewUnit] = useState('un');
    const [newAddress, setNewAddress] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [prodList, storeList] = await Promise.all([
            getAllProducts(),
            getAllStores()
        ]);
        setProducts(prodList);
        setStores(storeList);
        setLoading(false);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            await addProduct({
                name: newName,
                category: newCategory,
                unit: newUnit
            });
            setNewName('');
            setShowAddForm(false);
            loadData();
        } catch (error) {
            alert('Erro ao cadastrar produto: ' + error.message);
        }
    };

    const handleAddStore = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            await addStore({ name: newName, address: newAddress });
            setNewName('');
            setNewAddress('');
            setShowAddForm(false);
            loadData();
        } catch (error) {
            alert('Erro ao cadastrar mercado: ' + error.message);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (confirm('Deseja remover este produto do catálogo?')) {
            await deleteProduct(id);
            loadData();
        }
    };

    const handleDeleteStore = async (id) => {
        if (confirm('Deseja remover este mercado?')) {
            await deleteStore(id);
            loadData();
        }
    };

    const filteredItems = view === 'products'
        ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>Gerenciamento</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* View Switcher */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                <button
                    className={`btn ${view === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => { setView('products'); setShowAddForm(false); }}
                >
                    <Package size={18} style={{ marginRight: '8px' }} /> Catálogo
                </button>
                <button
                    className={`btn ${view === 'stores' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => { setView('stores'); setShowAddForm(false); }}
                >
                    <Store size={18} style={{ marginRight: '8px' }} /> Mercados
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)', border: '2px solid var(--emerald-500)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                        {view === 'products' ? 'Pré-cadastrar Produto' : 'Cadastrar Mercado'}
                    </h3>
                    <form onSubmit={view === 'products' ? handleAddProduct : handleAddStore}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <input
                                className="input"
                                placeholder="Nome"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                            />
                            {view === 'products' ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <select
                                            className="select"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select
                                            className="select"
                                            value={newUnit}
                                            onChange={(e) => setNewUnit(e.target.value)}
                                        >
                                            <option value="kg">kg</option>
                                            <option value="un">un</option>
                                            <option value="L">L</option>
                                            <option value="ml">ml</option>
                                            <option value="g">g</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <input
                                    className="input"
                                    placeholder="Endereço (opcional)"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                />
                            )}
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancelar</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-lg)' }}>
                <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                    className="input"
                    style={{ paddingLeft: '40px' }}
                    placeholder={`Buscar ${view === 'products' ? 'produtos' : 'mercados'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--slate-500)', padding: 'var(--spacing-xl)' }}>Carregando...</p>
                ) : filteredItems.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                        <p style={{ color: 'var(--slate-400)' }}>Nenhum item encontrado.</p>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            type={view}
                            onDelete={() => view === 'products' ? handleDeleteProduct(item.id) : handleDeleteStore(item.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ItemCard({ item, type, onDelete }) {
    const [history, setHistory] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (expanded && type === 'products' && !history) {
            loadHistory();
        }
    }, [expanded]);

    const loadHistory = async () => {
        const h = await getProductHistory(item.name);
        if (h && h.length > 0) {
            setHistory(h);
        }
    };

    return (
        <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div
                style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: type === 'products' ? 'pointer' : 'default' }}
                onClick={() => type === 'products' && setExpanded(!expanded)}
            >
                <div>
                    <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{item.name}</h3>
                    {type === 'products' ? (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>
                            {item.category} • Padrao: {item.unit}
                        </p>
                    ) : (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>
                            <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {item.address || 'Sem endereço'}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--slate-300)', cursor: 'pointer', padding: '8px' }}
                    >
                        <Trash2 size={18} />
                    </button>
                    {type === 'products' && (
                        <ChevronRight
                            size={20}
                            style={{
                                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                color: 'var(--slate-400)'
                            }}
                        />
                    )}
                </div>
            </div>

            {expanded && type === 'products' && (
                <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--slate-600)', marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> Histórico de Preços
                    </h4>

                    {!history ? (
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--slate-400)' }}>Nenhuma compra registrada para este produto.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            {history.slice(0, 3).map((h, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid var(--slate-100)' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 500 }}>R$ {h.price.toFixed(2)} {h.isPromotion && <Tag size={12} style={{ color: 'var(--emerald-500)', display: 'inline' }} />}</p>
                                        <p style={{ fontSize: '10px', color: 'var(--slate-500)' }}>{format(new Date(h.date), 'dd/MM/yy')} • {h.brand || 'S/M'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {h.isPromotion && <span style={{ fontSize: '9px', background: 'var(--emerald-50)', color: 'var(--emerald-600)', padding: '2px 4px', borderRadius: '4px', fontWeight: 700 }}>PROMOÇÃO</span>}
                                    </div>
                                </div>
                            ))}
                            {history.length > 3 && <p style={{ fontSize: '10px', color: 'var(--slate-400)', textAlign: 'center', marginTop: '4px' }}>Ver mais no histórico completo</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Catalog;
