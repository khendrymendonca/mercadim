import React, { useState, useEffect } from 'react';
import { Calendar, Store as StoreIcon, ChevronRight, Package, Edit2, Check, X, Tag, Trash2 } from 'lucide-react';
import { getAllPurchases, getAllStores, getPurchaseItems, updatePurchaseItem, deletePurchase, deletePurchaseItem, getPurchaseById } from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function PurchaseHistory() {
    const [purchases, setPurchases] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [purchaseItems, setPurchaseItems] = useState([]);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const CATEGORIES = [
        'Higiene', 'Bebidas', 'Mercearia', 'Padaria', 'Limpeza', 'Hortifruti', 'Açougue', 'Outros'
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const purchaseList = await getAllPurchases();
        const storeList = await getAllStores();
        setPurchases(purchaseList);
        setStores(storeList);
    };

    const getStoreName = (storeId) => {
        const store = stores.find(s => s.id === storeId);
        return store?.name || 'Desconhecido';
    };

    const handleViewDetails = async (purchase) => {
        const items = await getPurchaseItems(purchase.id);
        setPurchaseItems(items);
        setSelectedPurchase(purchase);
    };

    const handleBack = () => {
        setSelectedPurchase(null);
        setPurchaseItems([]);
        setEditingItemId(null);
    };

    const startEditing = (item) => {
        setEditingItemId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        await updatePurchaseItem(editingItemId, editForm);
        const updatedItems = await getPurchaseItems(selectedPurchase.id);
        const updatedPurchase = await getPurchaseById(selectedPurchase.id);
        setPurchaseItems(updatedItems);
        setSelectedPurchase(updatedPurchase);
        setEditingItemId(null);
        loadData(); // Update the main list in the background
    };

    const handleDeletePurchase = async (id) => {
        if (confirm('Tem certeza que deseja excluir todo este lançamento?')) {
            await deletePurchase(id);
            handleBack();
            loadData();
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (confirm('Remover este item do lançamento?')) {
            await deletePurchaseItem(itemId, selectedPurchase.id);
            const updatedItems = await getPurchaseItems(selectedPurchase.id);
            const updatedPurchase = await getPurchaseById(selectedPurchase.id);
            setPurchaseItems(updatedItems);
            setSelectedPurchase(updatedPurchase);
            loadData();
        }
    };

    if (selectedPurchase) {
        return (
            <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
                <button
                    className="btn btn-secondary"
                    onClick={handleBack}
                    style={{ marginBottom: 'var(--spacing-lg)' }}
                >
                    ← Voltar
                </button>

                <div className="card fade-in" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-md)' }}>
                        <div>
                            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                                {getStoreName(selectedPurchase.storeId)}
                            </h2>
                            <p style={{ color: 'var(--slate-600)' }}>
                                <Calendar size={16} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                                {format(new Date(selectedPurchase.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>Total</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                R$ {selectedPurchase.total.toFixed(2)}
                            </p>
                            <button
                                className="btn btn-danger"
                                style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--font-size-xs)' }}
                                onClick={() => handleDeletePurchase(selectedPurchase.id)}
                            >
                                <Trash2 size={14} /> Excluir Lançamento
                            </button>
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Itens ({purchaseItems.length})
                </h3>

                {purchaseItems.map((item, index) => (
                    <div key={index} className="card fade-in" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {editingItemId === item.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                <input
                                    className="input"
                                    value={editForm.productName}
                                    onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                                    placeholder="Nome do Produto"
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        className="input"
                                        value={editForm.brand || ''}
                                        onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                                        placeholder="Marca"
                                    />
                                    <select
                                        className="select"
                                        value={editForm.category}
                                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        className="input"
                                        type="number"
                                        value={editForm.price}
                                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                                        placeholder="Preço Unitário"
                                    />
                                    <input
                                        className="input"
                                        type="number"
                                        value={editForm.weight}
                                        onChange={(e) => setEditForm({ ...editForm, weight: parseFloat(e.target.value) })}
                                        placeholder="Qtd / Peso"
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="checkbox"
                                        id="editIsPromotionHistory"
                                        checked={editForm.isPromotion || false}
                                        onChange={(e) => setEditForm({ ...editForm, isPromotion: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <label htmlFor="editIsPromotionHistory" style={{ fontWeight: 600, color: 'var(--emerald-700)', fontSize: '14px' }}>Item em Promoção</label>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEdit}>
                                        <Check size={18} /> Salvar
                                    </button>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingItemId(null)}>
                                        <X size={18} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                        {item.productName}
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <span className="badge badge-success">{item.category}</span>
                                        {item.isPromotion && <span className="badge" style={{ background: 'var(--emerald-100)', color: 'var(--emerald-700)', fontWeight: 700 }}>🎁 PROMO</span>}
                                        {item.brand && (
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                                {item.brand}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                        {item.weight}{item.unit}
                                        {item.price && ` • R$ ${item.price.toFixed(2)}/${item.unit}`}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
                                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                        R$ {(item.price * (item.weight || 1)).toFixed(2)}
                                    </p>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', minHeight: 'auto' }}
                                        onClick={() => startEditing(item)}
                                    >
                                        <Edit2 size={16} /> Editar
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', minHeight: 'auto', color: 'var(--ef4444)' }}
                                        onClick={() => handleDeleteItem(item.id)}
                                    >
                                        <Trash2 size={16} /> Excluir
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Histórico de Compras
            </h2>

            {purchases.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <Package size={64} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)' }} />
                    <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--slate-500)' }}>
                        Nenhuma compra registrada ainda
                    </p>
                </div>
            ) : (
                purchases.map(purchase => (
                    <div
                        key={purchase.id}
                        className="card fade-in"
                        style={{
                            marginBottom: 'var(--spacing-md)',
                            cursor: 'pointer'
                        }}
                        onClick={() => handleViewDetails(purchase)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                    <StoreIcon size={20} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                                    {getStoreName(purchase.storeId)}
                                </h3>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                    <Calendar size={14} style={{ display: 'inline', marginRight: 'var(--spacing-xs)' }} />
                                    {format(new Date(purchase.date), "dd/MM/yyyy")}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>Total</p>
                                    <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                        R$ {purchase.total.toFixed(2)}
                                    </p>
                                </div>
                                <ChevronRight size={24} color="var(--slate-400)" />
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default PurchaseHistory;
