import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Check, Trash2, ArrowRight, Store, Save } from 'lucide-react';
import {
    createShoppingList,
    getAllShoppingLists,
    getShoppingListItems,
    addShoppingListItem,
    updateShoppingListItem,
    deleteShoppingListItem,
    deleteShoppingList,
    getAllStores,
    addStore,
    addPurchase,
    addPurchaseItem
} from '../db';
import { format } from 'date-fns';

function ShoppingList() {
    const [lists, setLists] = useState([]);
    const [activeList, setActiveList] = useState(null); // If null, show list of lists. If set, show detail.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLists();
    }, []);

    const loadLists = async () => {
        const allLists = await getAllShoppingLists();
        setLists(allLists.filter(l => l.status === 'active'));
        setLoading(false);
    };

    const handleCreateList = async () => {
        const name = prompt('Nome da lista (ex: Compras da Semana):');
        if (!name) return;

        const id = await createShoppingList({ name });
        await loadLists();
        // Auto open the new list
        const lists = await getAllShoppingLists();
        const newList = lists.find(l => l.id === id);
        setActiveList(newList);
    };

    if (activeList) {
        return (
            <ActiveListView
                list={activeList}
                onBack={() => {
                    setActiveList(null);
                    loadLists();
                }}
            />
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Listas de Compras
            </h2>

            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateList}
                    style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={20} />
                    Nova Lista
                </button>

                {lists.length === 0 && !loading && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <ShoppingBag size={64} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)' }} />
                        <p style={{ color: 'var(--slate-500)' }}>Nenhuma lista ativa</p>
                    </div>
                )}

                {lists.map(list => (
                    <div
                        key={list.id}
                        className="card fade-in"
                        onClick={() => setActiveList(list)}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <h3 style={{ fontWeight: 600 }}>{list.name}</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                Criada em {format(new Date(list.createdAt), 'dd/MM/yyyy')}
                            </p>
                        </div>
                        <ArrowRight size={24} color="var(--slate-400)" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActiveListView({ list, onBack }) {
    const [items, setItems] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [showPriceModal, setShowPriceModal] = useState(null); // Item ID being edited
    const [priceInput, setPriceInput] = useState('');
    const [brandInput, setBrandInput] = useState(''); // Optional brand input
    const [quantityInput, setQuantityInput] = useState('1'); // Generic quantity

    // Load items and stores
    useEffect(() => {
        loadItems();
        loadStores();
    }, [list.id]);

    const loadItems = async () => {
        const listItems = await getShoppingListItems(list.id);
        setItems(listItems);
    };

    const loadStores = async () => {
        const allStores = await getAllStores();
        setStores(allStores);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        await addShoppingListItem({
            listId: list.id,
            productName: newItemName,
            unit: 'un' // Default unit
        });
        setNewItemName('');
        loadItems();
    };

    const handleItemClick = (item) => {
        if (item.checked) {
            // Uncheck? Or edit price?
            if (confirm(`Remover ${item.productName} do carrinho?`)) {
                updateShoppingListItem(item.id, { checked: false, price: null });
                loadItems();
            }
        } else {
            // Open modal to enter price
            setPriceInput('');
            setBrandInput('');
            setShowPriceModal(item);
        }
    };

    const handleConfirmPrice = async () => {
        if (!priceInput || !showPriceModal) return;

        const price = parseFloat(priceInput);
        if (isNaN(price)) return;

        await updateShoppingListItem(showPriceModal.id, {
            checked: true,
            price: price,
            brand: brandInput || null,
            quantity: quantityInput || 1 // Store quantity if needed, but schema didn't have it, we can execute updateShoppingListItem with arbitrary fields potentially or just ignore
        });

        setShowPriceModal(null);
        loadItems();
    };

    const handleDeleteItem = async (e, id) => {
        e.stopPropagation();
        if (confirm('Excluir item?')) {
            await deleteShoppingListItem(id);
            loadItems();
        }
    };

    const handleDeleteList = async () => {
        if (confirm('Tem certeza que deseja excluir esta lista?')) {
            await deleteShoppingList(list.id);
            onBack();
        }
    };

    const handleFinishShopping = async () => {
        if (!selectedStore) {
            alert('Por favor, selecione o mercado onde você está comprando.');
            return;
        }

        const checkedItems = items.filter(i => i.checked);
        if (checkedItems.length === 0) {
            alert('Nenhum item marcado como comprado.');
            return;
        }

        if (!confirm('Finalizar compra e salvar no histórico?')) return;

        // Create Purchase Record
        const total = checkedItems.reduce((sum, item) => sum + (item.price || 0), 0);

        // Add purchase
        const purchaseId = await addPurchase({
            date: format(new Date(), 'yyyy-MM-dd'),
            storeId: parseInt(selectedStore),
            total: total
        });

        // Add items
        for (const item of checkedItems) {
            await addPurchaseItem({
                productName: item.productName,
                brand: item.brand || '',
                weight: 1, // Default, as we didn't capture specific weight in this simplified flow
                unit: 'un', // Default
                category: 'Outros', // Default
                price: item.price,
                purchaseId,
                date: format(new Date(), 'yyyy-MM-dd')
            });
        }

        // Delete the list (or archive it? User said "Launch... then access"). 
        // Usually lists are reusable or one-off. Let's delete for now as "Completed" or just delete.
        // The user said "Launch shopping list... access... add items bought".
        // I'll delete the list to keep it clean, or mark as status 'completed' if I had UI for it.
        // Let's delete it for simplicity in this MVP version.
        await deleteShoppingList(list.id);

        alert('Compra salva com sucesso!');
        onBack();
    };

    const total = items.reduce((sum, item) => sum + (item.checked ? (item.price || 0) : 0), 0);

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <button onClick={onBack} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)' }}>
                    ←
                </button>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, flex: 1 }}>
                    {list.name}
                </h2>
                <button onClick={handleDeleteList} className="btn btn-danger" style={{ padding: 'var(--spacing-sm)' }}>
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Market Selector */}
            <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    <Store size={16} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                    Mercado Atual
                </label>
                <select
                    className="select"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                >
                    <option value="">Selecione o Mercado...</option>
                    {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {/* Simplified "New Store" logic could go here similar to NewPurchase page, but omitted for brevity */}
            </div>

            {/* Total Banner */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, var(--emerald-600), var(--emerald-500))',
                color: 'white',
                marginBottom: 'var(--spacing-lg)',
                position: 'sticky',
                top: '80px', // Below header
                zIndex: 90
            }}>
                <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Total do Carrinho</p>
                <p style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 700 }}>R$ {total.toFixed(2)}</p>
            </div>

            {/* Add Item */}
            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                <input
                    className="input"
                    placeholder="Adicionar item à lista..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 var(--spacing-lg)' }}>
                    <Plus />
                </button>
            </form>

            {/* Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {items.map(item => (
                    <div
                        key={item.id}
                        className={`card ${item.checked ? 'checked-item' : ''}`}
                        onClick={() => handleItemClick(item)}
                        style={{
                            padding: 'var(--spacing-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: item.checked ? 'var(--emerald-50)' : 'white',
                            border: item.checked ? '1px solid var(--emerald-200)' : 'none',
                            opacity: item.checked ? 0.8 : 1,
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: item.checked ? 'none' : '2px solid var(--slate-300)',
                                background: item.checked ? 'var(--emerald-500)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                {item.checked && <Check size={16} />}
                            </div>
                            <div>
                                <p style={{
                                    fontWeight: 600,
                                    textDecoration: item.checked ? 'line-through' : 'none',
                                    color: item.checked ? 'var(--slate-500)' : 'var(--slate-900)'
                                }}>
                                    {item.productName}
                                </p>
                                {(item.brand || item.checked) && (
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--slate-500)' }}>
                                        {item.brand} {item.checked && `• R$ ${item.price?.toFixed(2)}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--slate-400)',
                                cursor: 'pointer',
                                padding: 'var(--spacing-sm)'
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                className="btn btn-primary"
                onClick={handleFinishShopping}
                style={{
                    width: '100%',
                    marginTop: 'var(--spacing-xl)',
                    padding: 'var(--spacing-lg)',
                    fontSize: 'var(--font-size-lg)'
                }}
            >
                <Save size={24} />
                Finalizar Compra
            </button>

            {/* Price Modal */}
            {showPriceModal && (
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
                    <div className="card fade-in" style={{ width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                            Qual o valor de {showPriceModal.productName}?
                        </h3>

                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>Preço (R$)</label>
                        <input
                            className="input"
                            type="number"
                            step="0.01"
                            autoFocus
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            placeholder="0.00"
                            style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-xl)' }}
                        />

                        <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>Marca (Opcional)</label>
                        <input
                            className="input"
                            type="text"
                            value={brandInput}
                            onChange={(e) => setBrandInput(e.target.value)}
                            placeholder="Ex: Tio João"
                            style={{ marginBottom: 'var(--spacing-lg)' }}
                        />

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPriceModal(null)}
                                style={{ flex: 1 }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmPrice}
                                style={{ flex: 1 }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ShoppingList;
