import React, { useState, useEffect } from 'react';
import { Plus, Store, AlertCircle, TrendingDown, Calculator, ClipboardList, Check, Trash2, Edit2 } from 'lucide-react';
import { addStore, getAllStores, addPurchase, addPurchaseItem, getLowestPrice, getAllShoppingLists, getShoppingListItems, deleteShoppingList } from '../db';
import { format } from 'date-fns';

const CATEGORIES = [
    'Higiene',
    'Bebidas',
    'Mercearia',
    'Padaria',
    'Limpeza',
    'Hortifruti',
    'Açougue',
    'Outros'
];

function NewPurchase() {
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [items, setItems] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        productName: '',
        brand: '',
        weight: '',
        unit: 'kg',
        category: 'Mercearia',
        price: '',
        isPromotion: false
    });
    const [availableLists, setAvailableLists] = useState([]);
    const [selectedListId, setSelectedListId] = useState('');
    const [showNewStoreForm, setShowNewStoreForm] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', address: '' });
    const [lowestPriceInfo, setLowestPriceInfo] = useState(null);
    const [showEditModal, setShowEditModal] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editIsPromotion, setEditIsPromotion] = useState(false);

    useEffect(() => {
        loadStores();
        loadLists();
        loadCatalog();
    }, []);

    const loadCatalog = async () => {
        const prodList = await getAllProducts();
        setCatalog(prodList);
    };

    const loadLists = async () => {
        const listData = await getAllShoppingLists();
        setAvailableLists(listData.filter(l => l.status === 'active'));
    };

    useEffect(() => {
        if (currentItem.productName.length >= 3) {
            checkLowestPrice();
        } else {
            setLowestPriceInfo(null);
        }
    }, [currentItem.productName, currentItem.brand]);

    const loadStores = async () => {
        const storeList = await getAllStores();
        setStores(storeList);
    };

    const checkLowestPrice = async () => {
        const lowest = await getLowestPrice(currentItem.productName, currentItem.brand);
        setLowestPriceInfo(lowest);
    };

    const handleImportList = async (listId) => {
        if (!listId) return;
        const listItems = await getShoppingListItems(parseInt(listId));

        const importedItems = listItems.map(item => ({
            productName: item.productName,
            brand: '',
            weight: '',
            unit: item.unit || 'un',
            category: 'Mercearia',
            price: null, // Pendente
            id: Date.now() + Math.random(),
            isPlanned: true,
            fromListId: parseInt(listId)
        }));

        setItems([...items, ...importedItems]);
        setSelectedListId('');
        // Marcar lista como em uso ou apenas importar? 
        // Vamos apenas importar para manter a flexibilidade.
    };

    const handleAddStore = async () => {
        if (!newStore.name) return;

        const storeId = await addStore(newStore);
        await loadStores();
        setSelectedStore(storeId);
        setNewStore({ name: '', address: '' });
        setShowNewStoreForm(false);
    };

    const calculatePricePerUnit = () => {
        if (!currentItem.price || !currentItem.weight) return null;
        const price = parseFloat(currentItem.price);
        const weight = parseFloat(currentItem.weight);
        if (isNaN(price) || isNaN(weight) || weight === 0) return null;
        return (price / weight).toFixed(2);
    };

    const handleAddItem = () => {
        if (!currentItem.productName || !currentItem.price) return;

        const pricePerUnit = calculatePricePerUnit();
        const newItem = {
            ...currentItem,
            price: parseFloat(currentItem.price),
            pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
            id: Date.now(),
            isPromotion: currentItem.isPromotion
        };

        setItems([...items, newItem]);
        setCurrentItem({
            productName: '',
            brand: '',
            weight: '',
            unit: 'kg',
            category: 'Mercearia',
            price: '',
            isPromotion: false
        });
        setLowestPriceInfo(null);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.price, 0).toFixed(2);
    };

    const handleSavePurchase = async () => {
        console.log('Iniciando salvamento da compra...', { selectedStore, itemCount: items.length });

        try {
            if (!selectedStore) {
                alert('Por favor, selecione um mercado.');
                return;
            }

            const validItems = items.filter(i => i.price !== null);
            if (validItems.length === 0) {
                alert('Adicione pelo menos um item com preço para salvar.');
                return;
            }

            console.log('Itens válidos encontrados:', validItems);

            const total = validItems.reduce((sum, item) => {
                const itemTotal = (parseFloat(item.price) || 0) * (parseFloat(item.weight) || 1);
                return sum + itemTotal;
            }, 0);

            console.log('Calculando total:', total);

            const purchaseData = {
                date: purchaseDate,
                storeId: parseInt(selectedStore),
                total: parseFloat(total.toFixed(2))
            };

            const purchaseId = await addPurchase(purchaseData);
            console.log('Compra criada com ID:', purchaseId);

            for (const item of validItems) {
                // Criamos uma cópia limpa SEM o ID temporário do frontend
                const cleanItem = {
                    productName: item.productName || 'Sem nome',
                    brand: item.brand || '',
                    weight: parseFloat(item.weight) || 1,
                    unit: item.unit || 'un',
                    category: item.category || 'Outros',
                    price: parseFloat(item.price) || 0,
                    purchaseId: purchaseId,
                    date: purchaseDate,
                    isPromotion: item.isPromotion || false
                };

                await addPurchaseItem(cleanItem);
                console.log('Item salvo:', cleanItem.productName);
            }

            // Limpa listas se houver itens planejados
            if (items.some(i => i.isPlanned)) {
                console.log('Limpando listas importadas...');
                const listIdsToDelete = [...new Set(items.filter(i => i.isPlanned).map(i => i.fromListId))];
                for (const id of listIdsToDelete) {
                    if (id) await deleteShoppingList(id);
                }
                loadLists();
            }

            setItems([]);
            alert('✅ Compra salva com sucesso!');
            console.log('Fluxo finalizado com sucesso.');
        } catch (error) {
            console.error('ERRO FATAL ao salvar compra:', error);
            alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido no banco de dados'));
        }
    };

    const handleQuickEdit = async (item) => {
        setShowEditModal(item);
        setEditPrice(item.price || '');
        setEditWeight(item.weight || '1');
        setEditIsPromotion(item.isPromotion || false);

        // Buscar menor preço histórico para inteligência no mercado
        const lowest = await getLowestPrice(item.productName);
        setLowestPriceInfo(lowest);
    };

    const confirmQuickEdit = () => {
        setItems(items.map(i => i.id === showEditModal.id ? {
            ...i,
            price: parseFloat(editPrice),
            weight: parseFloat(editWeight),
            isPromotion: editIsPromotion
        } : i));
        setShowEditModal(null);
        setLowestPriceInfo(null);
    };

    const pricePerUnit = calculatePricePerUnit();

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Nova Compra
            </h2>

            {/* Seleção de Mercado */}
            <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    <Store size={20} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                    Mercado
                </label>
                <select
                    className="select"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    style={{ marginBottom: 'var(--spacing-md)' }}
                >
                    <option value="">Selecione um mercado</option>
                    {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                </select>

                <button
                    className="btn btn-secondary"
                    onClick={() => setShowNewStoreForm(!showNewStoreForm)}
                    style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={20} />
                    Cadastrar Novo Mercado
                </button>

                <div style={{ padding: 'var(--spacing-md)', background: 'var(--emerald-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--emerald-200)' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--emerald-800)' }}>
                        <ClipboardList size={18} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                        Iniciar a partir de uma Lista
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <select
                            className="select"
                            style={{ flex: 1 }}
                            value={selectedListId}
                            onChange={(e) => setSelectedListId(e.target.value)}
                        >
                            <option value="">Selecione uma lista planejada...</option>
                            {availableLists.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                        <button
                            className="btn btn-primary"
                            disabled={!selectedListId}
                            onClick={() => handleImportList(selectedListId)}
                        >
                            Importar
                        </button>
                    </div>
                </div>

                {showNewStoreForm && (
                    <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)' }}>
                        <input
                            className="input"
                            type="text"
                            placeholder="Nome do mercado"
                            value={newStore.name}
                            onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                            style={{ marginBottom: 'var(--spacing-sm)' }}
                        />
                        <input
                            className="input"
                            type="text"
                            placeholder="Endereço (opcional)"
                            value={newStore.address}
                            onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                            style={{ marginBottom: 'var(--spacing-sm)' }}
                        />
                        <button className="btn btn-primary" onClick={handleAddStore} style={{ width: '100%' }}>
                            Salvar Mercado
                        </button>
                    </div>
                )}

                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Data da Compra
                    </label>
                    <input
                        className="input"
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Adicionar Item */}
            <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Adicionar Item
                </h3>

                {lowestPriceInfo && (
                    <div style={{
                        background: 'var(--emerald-50)',
                        border: '2px solid var(--emerald-500)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <TrendingDown size={24} color="var(--emerald-600)" />
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--emerald-700)' }}>
                                Menor preço histórico: R$ {lowestPriceInfo.price.toFixed(2)}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--emerald-600)' }}>
                                {lowestPriceInfo.brand && `Marca: ${lowestPriceInfo.brand}`}
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ position: 'relative' }}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Nome do produto"
                        value={currentItem.productName}
                        onChange={(e) => {
                            const val = e.target.value;
                            setCurrentItem({ ...currentItem, productName: val });
                            if (val.length > 1) {
                                const filtered = catalog.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
                                setSuggestions(filtered);
                            } else {
                                setSuggestions([]);
                            }
                        }}
                        style={{ marginBottom: 'var(--spacing-sm)' }}
                    />
                    {suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '45px',
                            left: 0,
                            right: 0,
                            background: 'white',
                            zIndex: 10,
                            border: '1px solid var(--slate-200)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-lg)',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            {suggestions.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setCurrentItem({
                                            ...currentItem,
                                            productName: p.name,
                                            category: p.category,
                                            unit: p.unit
                                        });
                                        setSuggestions([]);
                                    }}
                                    style={{
                                        padding: '10px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--slate-100)',
                                        display: 'flex',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--slate-400)' }}>{p.category}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <input
                    className="input"
                    type="text"
                    placeholder="Marca"
                    value={currentItem.brand}
                    onChange={(e) => setCurrentItem({ ...currentItem, brand: e.target.value })}
                    style={{ marginBottom: 'var(--spacing-sm)' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                    <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder="Peso/Medida"
                        value={currentItem.weight}
                        onChange={(e) => setCurrentItem({ ...currentItem, weight: e.target.value })}
                    />
                    <select
                        className="select"
                        value={currentItem.unit}
                        onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                    >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="un">un</option>
                    </select>
                </div>

                <select
                    className="select"
                    value={currentItem.category}
                    onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                    style={{ marginBottom: 'var(--spacing-sm)' }}
                >
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <input
                    className="input"
                    type="number"
                    step="0.01"
                    placeholder="Preço (R$)"
                    value={currentItem.price}
                    onChange={(e) => setCurrentItem({ ...currentItem, price: e.target.value })}
                    style={{ marginBottom: 'var(--spacing-md)' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <input
                        type="checkbox"
                        id="isPromotion"
                        checked={currentItem.isPromotion}
                        onChange={(e) => setCurrentItem({ ...currentItem, isPromotion: e.target.checked })}
                        style={{ width: '20px', height: '20px' }}
                    />
                    <label htmlFor="isPromotion" style={{ fontWeight: 600, color: 'var(--emerald-700)' }}>🏷️ Este item está em Promoção?</label>
                </div>

                {pricePerUnit && (
                    <div style={{
                        background: 'var(--slate-100)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <Calculator size={20} color="var(--slate-600)" />
                        <span style={{ fontWeight: 600 }}>
                            Preço por {currentItem.unit}: R$ {pricePerUnit}
                        </span>
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    onClick={handleAddItem}
                    disabled={!currentItem.productName || !currentItem.price}
                    style={{ width: '100%' }}
                >
                    <Plus size={20} />
                    Adicionar Item
                </button>
            </div>

            {/* Lista de Itens */}
            {items.length > 0 && (
                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Itens da Compra ({items.length})
                    </h3>

                    {items.map(item => (
                        <div
                            key={item.id}
                            onClick={() => item.price === null ? handleQuickEdit(item) : null}
                            style={{
                                padding: 'var(--spacing-md)',
                                background: item.price === null ? 'var(--slate-100)' : 'var(--slate-50)',
                                border: item.price === null ? '2px dashed var(--slate-300)' : 'none',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-sm)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: item.price === null ? 'pointer' : 'default'
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.productName}
                                    {item.isPromotion && <span style={{ fontSize: '10px', background: 'var(--emerald-500)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PROMO</span>}
                                    {item.price === null && <span style={{ fontSize: '10px', background: 'var(--slate-400)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>PENDENTE</span>}
                                </p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                    {item.brand} • {item.weight}{item.unit} • {item.category}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                {item.price !== null ? (
                                    <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                        R$ {(item.price * (item.weight || 1)).toFixed(2)}
                                    </span>
                                ) : (
                                    <div style={{ color: 'var(--slate-400)', fontSize: 'var(--font-size-sm)' }}>
                                        Clique para lançar <Edit2 size={14} style={{ display: 'inline' }} />
                                    </div>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                                    style={{ padding: 'var(--spacing-sm)' }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}

                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-lg)',
                        background: 'linear-gradient(135deg, var(--emerald-500), var(--emerald-600))',
                        borderRadius: 'var(--radius-lg)',
                        color: 'white'
                    }}>
                        <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-xs)' }}>Total da Compra</p>
                        <p style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 700 }}>R$ {items.reduce((sum, i) => sum + ((i.price || 0) * (i.weight || 1)), 0).toFixed(2)}</p>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleSavePurchase}
                        disabled={!selectedStore || items.filter(i => i.price !== null).length === 0}
                        style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                    >
                        Salvar Compra
                    </button>
                </div>
            )}

            {/* Quick Edit Modal for Planned Items */}
            {showEditModal && (
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
                        <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Lançar: {showEditModal.productName}</h3>

                        {lowestPriceInfo && (
                            <div style={{
                                background: 'var(--emerald-50)',
                                border: '1px solid var(--emerald-200)',
                                borderRadius: 'var(--radius-sm)',
                                padding: 'var(--spacing-sm)',
                                marginBottom: 'var(--spacing-md)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--emerald-700)',
                                textAlign: 'center'
                            }}>
                                📉 Menor histórico: <strong>R$ {lowestPriceInfo.price.toFixed(2)}</strong>
                                {lowestPriceInfo.brand && ` (${lowestPriceInfo.brand})`}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Preço Unitário</label>
                                <input
                                    className="input"
                                    type="number"
                                    autoFocus
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    placeholder="R$ 0.00"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Quantidade/Peso</label>
                                <input
                                    className="input"
                                    type="number"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmQuickEdit}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NewPurchase;
