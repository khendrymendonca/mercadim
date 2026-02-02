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
    MapPin,
    Layers,
    Edit2
} from 'lucide-react';
import {
    getAllProducts,
    addProduct,
    deleteProduct,
    getAllStores,
    addStore,
    deleteStore,
    getProductHistory,
    getAllCategories,
    addCategory,
    deleteCategory,
    updateProduct,
    updateStore,
    updateCategory
} from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';



function Catalog() {
    const [view, setView] = useState('products'); // 'products', 'stores', 'categories'
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // New Form state
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newUnit, setNewUnit] = useState('un');
    const [newAddress, setNewAddress] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [prodList, storeList, catList] = await Promise.all([
            getAllProducts(),
            getAllStores(),
            getAllCategories()
        ]);
        setProducts(prodList);
        setStores(storeList);
        setCategories(catList);
        if (catList.length > 0) setNewCategory(catList[0].name);
        setLoading(false);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setNewName(item.name);
        if (view === 'products') {
            setNewCategory(item.category);
            setNewUnit(item.unit);
        } else if (view === 'stores') {
            setNewAddress(item.address || '');
        }
        setShowAddForm(true);
    };

    const handleCancel = () => {
        setEditingItem(null);
        setNewName('');
        setNewAddress('');
        setShowAddForm(false);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            if (editingItem) {
                if (view === 'products') {
                    await updateProduct(editingItem.id, { name: newName, category: newCategory, unit: newUnit });
                } else if (view === 'stores') {
                    await updateStore(editingItem.id, { name: newName, address: newAddress });
                } else if (view === 'categories') {
                    await updateCategory(editingItem.id, newName);
                }
            } else {
                if (view === 'products') {
                    await addProduct({ name: newName, category: newCategory, unit: newUnit });
                } else if (view === 'stores') {
                    await addStore({ name: newName, address: newAddress });
                } else if (view === 'categories') {
                    await addCategory(newName);
                }
            }

            handleCancel();
            loadData();
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const handleDelete = async (id, name) => {
        const typeLabel = view === 'products' ? 'produto' : view === 'stores' ? 'mercado' : 'categoria';
        if (confirm(`Deseja remover este ${typeLabel} "${name}"?`)) {
            if (view === 'products') await deleteProduct(id);
            else if (view === 'stores') await deleteStore(id);
            else if (view === 'categories') await deleteCategory(id);
            loadData();
        }
    };

    const filteredItems = view === 'products'
        ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : view === 'stores'
            ? stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                    className={`btn ${view === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '100px', fontSize: '13px' }}
                    onClick={() => { setView('products'); setShowAddForm(false); }}
                >
                    <Package size={16} /> Catálogo
                </button>
                <button
                    className={`btn ${view === 'stores' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '100px', fontSize: '13px' }}
                    onClick={() => { setView('stores'); setShowAddForm(false); }}
                >
                    <Store size={16} /> Mercados
                </button>
                <button
                    className={`btn ${view === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minWidth: '100px', fontSize: '13px' }}
                    onClick={() => { setView('categories'); setShowAddForm(false); }}
                >
                    <Layers size={16} /> Categorias
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)', border: '2px solid var(--primary-200)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                        {editingItem ? 'Editar ' : 'Novo '}
                        {view === 'products' ? 'Produto' : view === 'stores' ? 'Mercado' : 'Categoria'}
                    </h3>
                    <form onSubmit={handleAddItem}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <input
                                className="input"
                                placeholder={view === 'categories' ? "Nome da Categoria (ex: Bebidas)" : "Nome"}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                                autoFocus
                            />

                            {view === 'products' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <select
                                        className="select"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    >
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                            )}

                            {view === 'stores' && (
                                <input
                                    className="input"
                                    placeholder="Endereço (opcional)"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                />
                            )}

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingItem ? 'Atualizar' : 'Salvar'}</button>
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
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
                    placeholder={`Buscar ${view === 'products' ? 'produtos' : view === 'stores' ? 'mercados' : 'categorias'}...`}
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
                            onDelete={() => handleDelete(item.id, item.name)}
                            onEdit={() => handleEdit(item)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ItemCard({ item, type, onDelete, onEdit }) {
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
                    {type === 'products' && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>
                            {item.category} • Padrao: {item.unit}
                        </p>
                    )}
                    {type === 'stores' && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>
                            <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> {item.address || 'Sem endereço'}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--slate-300)', cursor: 'pointer', padding: '8px' }}
                    >
                        <Edit2 size={16} />
                    </button>
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
                                        <p style={{ fontWeight: 600 }}>R$ {h.price.toFixed(2)} {h.isPromotion && <Tag size={12} style={{ color: 'var(--primary-500)', display: 'inline' }} />}</p>
                                        <p style={{ fontSize: '10px', color: 'var(--slate-500)' }}>{format(new Date(h.date), 'dd/MM/yy')} • {h.brand || 'S/M'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {h.isPromotion && <span style={{ fontSize: '9px', background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '2px 4px', borderRadius: '4px', fontWeight: 800 }}>PROMOÇÃO</span>}
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
