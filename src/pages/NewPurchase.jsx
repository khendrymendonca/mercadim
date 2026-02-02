import React, { useState, useEffect } from 'react';
import { Plus, Store, AlertCircle, TrendingDown, Calculator } from 'lucide-react';
import { addStore, getAllStores, addPurchase, addPurchaseItem, getLowestPrice } from '../db';
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
    const [currentItem, setCurrentItem] = useState({
        productName: '',
        brand: '',
        weight: '',
        unit: 'kg',
        category: 'Mercearia',
        price: ''
    });
    const [showNewStoreForm, setShowNewStoreForm] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', address: '' });
    const [lowestPriceInfo, setLowestPriceInfo] = useState(null);

    useEffect(() => {
        loadStores();
    }, []);

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
            id: Date.now()
        };

        setItems([...items, newItem]);
        setCurrentItem({
            productName: '',
            brand: '',
            weight: '',
            unit: 'kg',
            category: 'Mercearia',
            price: ''
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
        if (!selectedStore || items.length === 0) return;

        const total = parseFloat(calculateTotal());
        const purchaseId = await addPurchase({
            date: purchaseDate,
            storeId: parseInt(selectedStore),
            total
        });

        for (const item of items) {
            await addPurchaseItem({
                ...item,
                purchaseId,
                date: purchaseDate
            });
        }

        // Reset form
        setItems([]);
        setCurrentItem({
            productName: '',
            brand: '',
            weight: '',
            unit: 'kg',
            category: 'Mercearia',
            price: ''
        });

        alert('Compra salva com sucesso!');
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
                    style={{ width: '100%' }}
                >
                    <Plus size={20} />
                    Cadastrar Novo Mercado
                </button>

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

                <input
                    className="input"
                    type="text"
                    placeholder="Nome do produto"
                    value={currentItem.productName}
                    onChange={(e) => setCurrentItem({ ...currentItem, productName: e.target.value })}
                    style={{ marginBottom: 'var(--spacing-sm)' }}
                />

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
                                <p style={{ fontWeight: 600 }}>{item.productName}</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                    {item.brand} • {item.weight}{item.unit} • {item.category}
                                </p>
                                {item.pricePerUnit && (
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-500)' }}>
                                        R$ {item.pricePerUnit}/{item.unit}
                                    </p>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                    R$ {item.price.toFixed(2)}
                                </span>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleRemoveItem(item.id)}
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
                        <p style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 700 }}>R$ {calculateTotal()}</p>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleSavePurchase}
                        disabled={!selectedStore}
                        style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
                    >
                        Salvar Compra
                    </button>
                </div>
            )}
        </div>
    );
}

export default NewPurchase;
