import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
    createShoppingList,
    getAllShoppingLists,
    getShoppingListItems,
    addShoppingListItem,
    deleteShoppingListItem,
    deleteShoppingList
} from '../db';

function ShoppingList() {
    const [lists, setLists] = useState([]);
    const [activeList, setActiveList] = useState(null);
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
        const name = prompt('Nome do Planejamento (ex: Compras BH):');
        if (!name) return;

        const id = await createShoppingList({ name });
        await loadLists();
        const lists = await getAllShoppingLists();
        const newList = lists.find(l => l.id === id);
        setActiveList(newList);
    };

    const handleDeleteList = async (e, id) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este planejamento?')) {
            await deleteShoppingList(id);
            loadLists();
        }
    };

    if (activeList) {
        return (
            <ActiveListView
                list={activeList}
                onBack={() => {
                    setActiveList(null);
                    loadLists();
                }}
                onDelete={() => {
                    setActiveList(null);
                    loadLists();
                }}
            />
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
                Planejamento
            </h2>

            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateList}
                    style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={20} />
                    Criar Novo Planejamento
                </button>

                {lists.length === 0 && !loading && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                        <ShoppingBag size={64} color="var(--slate-300)" style={{ margin: '0 auto var(--spacing-md)' }} />
                        <p style={{ color: 'var(--slate-500)' }}>Nenhuma lista planejada</p>
                    </div>
                )}

                {lists.map(list => (
                    <div
                        key={list.id}
                        className="card fade-in"
                        onClick={() => setActiveList(list)}
                        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <div>
                            <h3 style={{ fontWeight: 600 }}>{list.name}</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--slate-600)' }}>
                                {list.itemCount || 0} itens planejados
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <button
                                onClick={(e) => handleDeleteList(e, list.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: 'var(--spacing-xs)' }}
                            >
                                <Trash2 size={20} />
                            </button>
                            <ArrowLeft size={24} style={{ transform: 'rotate(180deg)' }} color="var(--slate-400)" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActiveListView({ list, onBack, onDelete }) {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        loadItems();
    }, [list.id]);

    const loadItems = async () => {
        const listItems = await getShoppingListItems(list.id);
        setItems(listItems);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        await addShoppingListItem({
            listId: list.id,
            productName: newItemName,
            unit: 'un'
        });
        setNewItemName('');
        loadItems();
    };

    const handleDeleteItem = async (id) => {
        await deleteShoppingListItem(id);
        loadItems();
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <button onClick={onBack} className="btn btn-secondary" style={{ padding: 'var(--spacing-sm)' }}>
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, flex: 1 }}>
                    Planejar: {list.name}
                </h2>
                <button
                    onClick={async () => {
                        if (confirm('Excluir este planejamento?')) {
                            await deleteShoppingList(list.id);
                            onDelete();
                        }
                    }}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-sm)', color: 'var(--ef4444)' }}
                >
                    <Trash2 size={20} />
                </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                <input
                    className="input"
                    placeholder="O que você precisa comprar?"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                    <Plus />
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
                {items.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--slate-400)', padding: 'var(--spacing-xl)' }}>
                        Sua lista está vazia.
                    </p>
                )}
                {items.map(item => (
                    <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)' }}>
                        <span style={{ fontWeight: 500 }}>{item.productName}</span>
                        <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer' }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                className="btn btn-primary"
                onClick={onBack}
                style={{ width: '100%', padding: 'var(--spacing-lg)' }}
            >
                <CheckCircle2 size={20} style={{ marginRight: '8px' }} />
                Finalizar Planejamento
            </button>
        </div>
    );
}

export default ShoppingList;
