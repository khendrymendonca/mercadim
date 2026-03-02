import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Trash2, ArrowLeft, ChefHat, X, Loader, Check } from 'lucide-react';
import {
    createShoppingList, getAllShoppingLists, getShoppingListItems,
    addShoppingListItem, deleteShoppingListItem, deleteShoppingList,
    getAllProducts
} from '../db';
import { getAllCardapios } from '../db';

// ============================================================
// Componente Principal
// ============================================================
export default function ShoppingList() {
    const [lists, setLists] = useState([]);
    const [activeList, setActiveList] = useState(null);
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
        return (
            <PlanMode
                list={activeList}
                onBack={() => { setActiveList(null); loadLists(); }}
                onDelete={() => { setActiveList(null); loadLists(); }}
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
                    <p style={{ color: 'var(--slate-400)', fontSize: 'var(--font-size-sm)' }}>
                        Planeje aqui, depois importe em "Nova Compra" ao ir ao mercado
                    </p>
                </div>
            )}

            {lists.map(list => (
                <div key={list.id} className="card fade-in" onClick={() => setActiveList(list)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    <div>
                        <h3 style={{ fontWeight: 700 }}>{list.name}</h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>{list.itemCount || 0} itens planejados</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <button onClick={(e) => handleDeleteList(e, list.id)} style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={18} />
                        </button>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// MODO PLANEJAR
// ============================================================
function PlanMode({ list, onBack, onDelete }) {
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

            {/* Dica */}
            <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', fontSize: '13px', color: 'var(--primary-700)' }}>
                💡 Planeje sua lista aqui. Na hora das compras, abra <strong>Nova Compra</strong> e use o botão <em>"Iniciar a partir de uma Lista"</em>.
            </div>

            {/* Importar do Cardápio */}
            <button onClick={() => setShowCardapioModal(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)', background: 'var(--primary-50)', border: '2px dashed var(--primary-300)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', cursor: 'pointer', color: 'var(--primary-700)', fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)' }}>
                <ChefHat size={18} /> Importar ingredientes do Cardápio
            </button>

            {/* Campo adicionar item */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-lg)' }}>
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input className="input" placeholder="Adicionar item à lista..." value={newItemName}
                        onChange={(e) => handleNameChange(e.target.value)} autoComplete="off" />
                    <button type="submit" className="btn btn-primary"><Plus /></button>
                </form>
                {suggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, marginTop: '4px', border: '1px solid var(--slate-100)', overflow: 'hidden' }}>
                        {suggestions.map(prod => (
                            <div key={prod.id} onClick={() => selectSuggestion(prod)}
                                style={{ padding: 'var(--spacing-md)', cursor: 'pointer', borderBottom: '1px solid var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontWeight: 500 }}>{prod.name}</span>
                                    <p style={{ fontSize: '10px', color: 'var(--slate-400)' }}>{prod.category}</p>
                                </div>
                                <Plus size={14} color="var(--primary-500)" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de itens */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                {items.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--slate-400)', padding: 'var(--spacing-xl)', fontSize: 'var(--font-size-sm)' }}>
                        Lista vazia. Adicione itens ou importe do cardápio.
                    </p>
                )}
                {items.map((item, i) => (
                    <div key={item.id} className="card"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)', animationDelay: `${i * 0.04}s` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-400)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 500 }}>{item.productName}</span>
                        </div>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--slate-300)', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal cardápio */}
            {showCardapioModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowCardapioModal(false); }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxHeight: '70vh', overflow: 'auto', padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h3 style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)' }}>Importar do Cardápio</h3>
                            <button onClick={() => setShowCardapioModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={22} /></button>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--slate-500)', marginBottom: 'var(--spacing-md)' }}>
                            Itens já na lista não serão duplicados.
                        </p>
                        {adding && (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                                <Loader size={28} color="var(--primary-500)" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto var(--spacing-sm)' }} />
                                <p style={{ color: 'var(--slate-500)', fontSize: '13px' }}>Importando...</p>
                            </div>
                        )}
                        {!adding && cardapios.length === 0 && (
                            <p style={{ color: 'var(--slate-400)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>Nenhum cardápio cadastrado.</p>
                        )}
                        {!adding && cardapios.map(c => {
                            const total = c.cardapio_pratos?.flatMap(p => p.cardapio_ingredientes || []).length || 0;
                            return (
                                <button key={c.id} onClick={() => handleImportCardapio(c)}
                                    style={{ width: '100%', textAlign: 'left', background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <p style={{ fontWeight: 700, color: 'var(--primary-800)', marginBottom: '2px' }}>{c.name}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                                        {total} ingrediente{total !== 1 ? 's' : ''} · {c.cardapio_pratos?.length || 0} prato{c.cardapio_pratos?.length !== 1 ? 's' : ''}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
