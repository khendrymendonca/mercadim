import React, { useState, useEffect } from 'react';
import { Calendar, Store as StoreIcon, ChevronRight, Package } from 'lucide-react';
import { getAllPurchases, getAllStores, getPurchaseItems } from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function PurchaseHistory() {
    const [purchases, setPurchases] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [purchaseItems, setPurchaseItems] = useState([]);

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
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>Total</p>
                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                R$ {selectedPurchase.total.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Itens ({purchaseItems.length})
                </h3>

                {purchaseItems.map((item, index) => (
                    <div key={index} className="card fade-in" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                    {item.productName}
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                    <span className="badge badge-success">{item.category}</span>
                                    {item.brand && (
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                            {item.brand}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                    {item.weight}{item.unit}
                                    {item.pricePerUnit && ` • R$ ${item.pricePerUnit.toFixed(2)}/${item.unit}`}
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--emerald-600)' }}>
                                    R$ {item.price.toFixed(2)}
                                </p>
                            </div>
                        </div>
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
