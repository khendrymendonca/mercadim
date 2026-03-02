import React, { useState, useEffect, useRef } from 'react';
import { Plus, ShoppingBag, Trash2, ArrowLeft, CheckCircle2, ShoppingCart, ChefHat, Check, X, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import {
    createShoppingList, getAllShoppingLists, getShoppingListItems,
    addShoppingListItem, deleteShoppingListItem, updateShoppingListItem,
    deleteShoppingList, getAllProducts, getAllStores, addPurchase
} from '../db';
import { getAllCardapios } from '../db';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/format';

// ============================================================
// Componente Principal
// ============================================================
export default function ShoppingList() {
    const [lists, setLists] = useState([]);
    const [activeList, setActiveList] = useState(null);
    const [shopMode, setShopMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadLists(); }, []);

    const loadLists = async () => {
        const all = await getAllShoppingLists();
        setLists(all.filter(l => l.status === 'active'));
        setLoading(false);
    };

    const handleCreateList = async () => {
        const name = prompt('Nome da lista (ex: Compras da semana):');
        if (!name) return;
        const id = await createShoppingList({ name });
        await loadLists();
        const all = await getAllShoppingLists();
        setActiveList(all.find(l => l.id === id));
    };

    const handleDeleteList = async (e, id) => {
        e.stopPropagation();
        if (confirm('Excluir esta lista?')) { await deleteShoppingList(id); loadLists(); }
    };

    if (activeList) {
        if (shopMode) {
            return (
                <ShopMode
                    list={activeList}
                    onBack={() => { setShopMode(false); }}
                    onFinish={() => { setShopMode(false); setActiveList(null); loadLists(); }}
                />
            );
        }
        return (
            <PlanMode
                list={activeList}
                onBack={() => { setActiveList(null); loadLists(); }}
                onDelete={() => { setActiveList(null); loadLists(); }}
                onGoShopping={() => setShopMode(true)}
            />
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: '6rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--spacing-lg)' }}>
                Listas de Compras
            </h2>
            <button className="btn btn-primary" onClick={handleCreateList} style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}>
                <Plus size={20} /> Nova Lista
            </button>

            {!loading && lists.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <ShoppingBag size={56} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)', display: 'block' }} />
                    <p style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Nenhuma lista ainda</p>
                    <p style={{ color: 'var(--slate-400)', fontSize: 'var(--font-size-sm)' }}>Crie uma para planejar suas compras</p>
                </div>
            )}

            {lists.map(list => (
                <div key={list.id} className="card fade-in" onClick={() => setActiveList(list)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    <div>
                        <h3 style={{ fontWeight: 700 }}>{list.name}</h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>{list.itemCount || 0} itens</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <button onClick={(e) => handleDeleteList(e, list.id)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={18} />
                        </button>
                        <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} color="var(--slate-400)" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// MODO PLANEJAR
// ============================================================
function PlanMode({ list, onBack, onDelete, onGoShopping }) {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [catalog, setCatalog] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [cardapios, setCardapios] = useState([]);
    const [showCardapioModal, setShowCardapioModal] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadItems();
        getAllProducts().then(setCatalog);
        getAllCardapios().then(setCardapios);
    }, [list.id]);

    const loadItems = async () => setItems(await getShoppingListItems(list.id));

    const handleAddItem = async (e) => {
        if (e) e.preventDefault();
        if (!newItemName.trim()) return;
        const prod = catalog.find(p => p.name.toLowerCase() === newItemName.toLowerCase());
        await addShoppingListItem({ listId: list.id, productName: newItemName.trim(), unit: prod?.unit || 'un' });
        setNewItemName(''); setSuggestions([]);
        loadItems();
    };

    const handleNameChange = (val) => {
        setNewItemName(val);
        setSuggestions(val.length >= 2 ? catalog.filter(p => p.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5) : []);
    };

    const selectSuggestion = async (prod) => {
        await addShoppingListItem({ listId: list.id, productName: prod.name, unit: prod.unit || 'un' });
        setNewItemName(''); setSuggestions([]);
        loadItems();
    };

    const handleImportCardapio = async (cardapio) => {
        setAdding(true);
        const ingredientes = cardapio.cardapio_pratos?.flatMap(p => p.cardapio_ingredientes || []) || [];
        const existentes = items.map(i => i.productName.toLowerCase());
        for (const ing of ingredientes) {
            if (!existentes.includes(ing.product_name.toLowerCase())) {
                await addShoppingListItem({ listId: list.id, productName: ing.product_name, unit: 'un' });
            }
        }
        await loadItems();
        setAdding(false);
        setShowCardapioModal(false);
    };

    const handleDelete = async (id) => { await deleteShoppingListItem(id); loadItems(); };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                <button onClick={onBack} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)' }}>
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, flex: 1 }}>{list.name}</h2>
                <button onClick={async () => { if (confirm('Excluir lista?')) { await deleteShoppingList(list.id); onDelete(); } }}
                    className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)', color: 'var(--danger)' }}>
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Importar do Cardápio */}
            <button onClick={() => setShowCardapioModal(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)', background: 'var(--primary-50)', border: '2px dashed var(--primary-300)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', cursor: 'pointer', color: 'var(--primary-700)', fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>
                <ChefHat size={18} /> Importar ingredientes do Cardápio
            </button>

            {/* Campo adicionar item */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-lg)' }}>
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input className="input" placeholder="O que você precisa comprar?" value={newItemName}
                        onChange={(e) => handleNameChange(e.target.value)} autoComplete="off" />
                    <button type="submit" className="btn btn-primary"><Plus /></button>
                </form>
                {suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, marginTop: '4px', border: '1px solid var(--slate-100)', overflow: 'hidden' }}>
                        {suggestions.map(prod => (
                            <div key={prod.id} onClick={() => selectSuggestion(prod)} style={{ padding: 'var(--spacing-md)', cursor: 'pointer', borderBottom: '1px solid var(--slate-50)', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 500 }}>{prod.name}</span>
                                <Plus size={14} color="var(--primary-500)" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de itens */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                {items.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--slate-400)', padding: 'var(--spacing-xl)' }}>
                        Lista vazia. Adicione itens acima ou importe do cardápio.
                    </p>
                )}
                {items.map(item => (
                    <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
                        <span style={{ fontWeight: 500 }}>{item.productName}</span>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Botão Ir às Compras */}
            {items.length > 0 && (
                <button className="btn btn-primary" onClick={onGoShopping} style={{ width: '100%', padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-lg)' }}>
                    <ShoppingCart size={22} /> Ir às Compras ({items.length} itens)
                </button>
            )}

            {/* Modal cardápio */}
            {showCardapioModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxHeight: '70vh', overflow: 'auto', padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h3 style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>Importar do Cardápio</h3>
                            <button onClick={() => setShowCardapioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={22} /></button>
                        </div>
                        {adding && <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}><Loader size={28} color="var(--primary-500)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto' }} /></div>}
                        {!adding && cardapios.length === 0 && (
                            <p style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>Nenhum cardápio cadastrado ainda.</p>
                        )}
                        {!adding && cardapios.map(c => {
                            const total = c.cardapio_pratos?.flatMap(p => p.cardapio_ingredientes || []).length || 0;
                            return (
                                <button key={c.id} onClick={() => handleImportCardapio(c)} style={{ width: '100%', textAlign: 'left', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <p style={{ fontWeight: 700, color: 'var(--primary-800)' }}>{c.name}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--slate-500)' }}>{total} ingredientes · {c.cardapio_pratos?.length || 0} pratos</p>
                                </button>
                            );
                        })}
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// MODO COMPRAR (no mercado)
// ============================================================
function ShopMode({ list, onBack, onFinish }) {
    const [items, setItems] = useState([]);
    const [checked, setChecked] = useState({}); // { id: { qty, price, unit } }
    const [expanded, setExpanded] = useState(null);
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('va');
    const [showFinish, setShowFinish] = useState(false);
    const [saving, setSaving] = useState(false);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        getShoppingListItems(list.id).then(setItems);
        getAllStores().then(setStores);
    }, [list.id]);

    const checkedCount = Object.keys(checked).length;
    const total = Object.values(checked).reduce((s, c) => s + (parseFloat(c.price) || 0) * (parseFloat(c.qty) || 1), 0);

    const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

    const handleCheck = (item) => {
        const val = checked[item.id];
        if (val) {
            const next = { ...checked };
            delete next[item.id];
            setChecked(next);
        } else {
            setChecked(prev => ({ ...prev, [item.id]: { qty: 1, price: '', unit: item.unit || 'un' } }));
        }
        setExpanded(null);
    };

    const updateField = (id, field, val) => {
        setChecked(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
    };

    const handleSalvar = async () => {
        if (!selectedStore) return;
        setSaving(true);
        try {
            const purchaseItems = items
                .filter(i => checked[i.id])
                .map(i => ({
                    productName: i.productName,
                    brand: '',
                    category: 'Mercearia',
                    weight: parseFloat(checked[i.id]?.qty) || 1,
                    unit: checked[i.id]?.unit || 'un',
                    price: parseFloat(checked[i.id]?.price) || 0,
                    isPromotion: false,
                }));
            await addPurchase(parseInt(selectedStore), date, parseFloat(total.toFixed(2)), purchaseItems, paymentMethod);
            await deleteShoppingList(list.id);
            onFinish();
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
            setSaving(false);
        }
    };

    const pending = items.filter(i => !checked[i.id]);
    const done = items.filter(i => checked[i.id]);

    return (
        <div style={{ paddingBottom: '140px' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-500))', color: 'white', padding: 'var(--spacing-lg)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                    <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', opacity: 0.8 }}>Comprando</p>
                        <h2 style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>{list.name}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', opacity: 0.8 }}>Checados</p>
                        <p style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>{checkedCount}/{items.length}</p>
                    </div>
                </div>
                {/* Barra de progresso */}
                <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ background: 'white', height: '100%', width: `${items.length ? (checkedCount / items.length) * 100 : 0}%`, borderRadius: '10px', transition: 'width 0.4s ease' }} />
                </div>
                {total > 0 && (
                    <p style={{ textAlign: 'right', marginTop: '6px', fontSize: '13px', opacity: 0.9 }}>
                        Total: <strong>{formatCurrency(total)}</strong>
                    </p>
                )}
            </div>

            <div className="container" style={{ paddingTop: 'var(--spacing-md)' }}>
                {/* Itens pendentes */}
                {pending.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--spacing-sm)' }}>
                            A comprar ({pending.length})
                        </p>
                        {pending.map(item => (
                            <div key={item.id} className="card" style={{ marginBottom: 'var(--spacing-xs)', padding: 0, overflow: 'hidden', border: expanded === item.id ? '2px solid var(--primary-400)' : '1px solid var(--slate-200)' }}>
                                <div onClick={() => toggleExpand(item.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', cursor: 'pointer' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--slate-300)', flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontWeight: 600 }}>{item.productName}</span>
                                    {expanded === item.id ? <ChevronUp size={16} color="var(--slate-400)" /> : <ChevronDown size={16} color="var(--slate-400)" />}
                                </div>
                                {expanded === item.id && (
                                    <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)', borderTop: '1px solid var(--slate-100)', paddingTop: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>PREÇO R$</label>
                                                <input type="number" step="0.01" className="input" style={{ minHeight: 'unset', padding: '8px', fontSize: '16px', fontWeight: 700 }}
                                                    placeholder="0,00" value={checked[item.id]?.price || ''}
                                                    onChange={e => updateField(item.id, 'price', e.target.value)}
                                                    autoFocus />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>QUANTIDADE</label>
                                                <input type="number" step="0.001" className="input" style={{ minHeight: 'unset', padding: '8px', fontSize: '16px' }}
                                                    placeholder="1" value={checked[item.id]?.qty || ''}
                                                    onChange={e => updateField(item.id, 'qty', e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>UNIDADE</label>
                                                <select className="select" style={{ minHeight: 'unset', padding: '8px', fontSize: '13px' }}
                                                    value={checked[item.id]?.unit || item.unit || 'un'}
                                                    onChange={e => updateField(item.id, 'unit', e.target.value)}>
                                                    {['un', 'kg', 'g', 'L', 'ml', 'cx', 'pc', 'dz'].map(u => <option key={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={() => handleCheck(item)}
                                            className="btn btn-primary" style={{ width: '100%' }}>
                                            <Check size={18} /> Comprei!
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Itens comprados */}
                {done.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--spacing-sm)' }}>
                            Comprados ({done.length})
                        </p>
                        {done.map(item => (
                            <div key={item.id} onClick={() => handleCheck(item)}
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: '#f0fdf4', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xs)', cursor: 'pointer', border: '1px solid #bbf7d0' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Check size={14} color="white" />
                                </div>
                                <span style={{ flex: 1, fontWeight: 500, color: 'var(--slate-500)', textDecoration: 'line-through', fontSize: 'var(--font-size-sm)' }}>{item.productName}</span>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 'var(--font-size-sm)' }}>
                                        {formatCurrency((parseFloat(checked[item.id]?.price) || 0) * (parseFloat(checked[item.id]?.qty) || 1))}
                                    </span>
                                    <p style={{ fontSize: '10px', color: 'var(--slate-400)' }}>{checked[item.id]?.qty || 1} {checked[item.id]?.unit || 'un'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Botão fixo Finalizar */}
            {checkedCount > 0 && (
                <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, padding: '0 var(--spacing-md)' }}>
                    <button className="btn btn-primary" onClick={() => setShowFinish(true)}
                        style={{ width: '100%', padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-lg)', boxShadow: '0 8px 24px rgba(249,115,22,0.4)' }}>
                        <CheckCircle2 size={22} /> Finalizar Compra · {formatCurrency(total)}
                    </button>
                </div>
            )}

            {/* Modal finalizar */}
            {showFinish && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', padding: 'var(--spacing-lg)', maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-lg)' }}>Finalizar Compra</h3>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Data</label>
                            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Mercado *</label>
                            <select className="select" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
                                <option value="">-- Selecione --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                            {[{ id: 'va', label: '💳 Vale Alimentação' }, { id: 'personal', label: '💰 Dinheiro/Bolso' }].map(m => (
                                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                                    style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${paymentMethod === m.id ? 'var(--primary-500)' : 'var(--slate-200)'}`, background: paymentMethod === m.id ? 'var(--primary-50)' : 'white', fontWeight: paymentMethod === m.id ? 700 : 500, color: paymentMethod === m.id ? 'var(--primary-700)' : 'var(--slate-600)', fontSize: 'var(--font-size-sm)', transition: 'all 0.2s' }}>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--slate-600)', fontWeight: 600 }}>{checkedCount} itens</span>
                            <span style={{ fontWeight: 900, fontSize: 'var(--font-size-2xl)', color: 'var(--primary-700)' }}>{formatCurrency(total)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button onClick={() => setShowFinish(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                            <button onClick={handleSalvar} className="btn btn-primary" style={{ flex: 2 }} disabled={!selectedStore || saving}>
                                {saving ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={18} /> Salvar Compra</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
