import { openDB } from 'idb';

const DB_NAME = 'SmartPriceTrackerDB';
const DB_VERSION = 2; // Incrementado para adicionar novas stores

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Stores (Mercados)
            if (!db.objectStoreNames.contains('stores')) {
                const storeOS = db.createObjectStore('stores', { keyPath: 'id', autoIncrement: true });
                storeOS.createIndex('name', 'name', { unique: false });
            }

            // Purchases (Compras)
            if (!db.objectStoreNames.contains('purchases')) {
                const purchaseOS = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                purchaseOS.createIndex('date', 'date', { unique: false });
                purchaseOS.createIndex('storeId', 'storeId', { unique: false });
            }

            // Purchase Items (Itens de Compra)
            if (!db.objectStoreNames.contains('purchaseItems')) {
                const itemOS = db.createObjectStore('purchaseItems', { keyPath: 'id', autoIncrement: true });
                itemOS.createIndex('purchaseId', 'purchaseId', { unique: false });
                itemOS.createIndex('productName', 'productName', { unique: false });
                itemOS.createIndex('category', 'category', { unique: false });
            }

            // Shopping Lists (Listas de Compras)
            if (!db.objectStoreNames.contains('shoppingLists')) {
                const listOS = db.createObjectStore('shoppingLists', { keyPath: 'id', autoIncrement: true });
                listOS.createIndex('name', 'name', { unique: false });
                listOS.createIndex('createdAt', 'createdAt', { unique: false });
                listOS.createIndex('status', 'status', { unique: false }); // 'active', 'completed'
            }

            // Shopping List Items (Itens da Lista)
            if (!db.objectStoreNames.contains('shoppingListItems')) {
                const listItemOS = db.createObjectStore('shoppingListItems', { keyPath: 'id', autoIncrement: true });
                listItemOS.createIndex('listId', 'listId', { unique: false });
                listItemOS.createIndex('productName', 'productName', { unique: false });
            }
        },
    });
};

// Store Operations
export const addStore = async (store) => {
    const db = await initDB();
    return db.add('stores', store);
};

export const getAllStores = async () => {
    const db = await initDB();
    return db.getAll('stores');
};

export const getStoreById = async (id) => {
    const db = await initDB();
    return db.get('stores', id);
};

// Purchase Operations
export const addPurchase = async (purchase) => {
    const db = await initDB();
    return db.add('purchases', purchase);
};

export const getAllPurchases = async () => {
    const db = await initDB();
    const purchases = await db.getAll('purchases');
    return purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getPurchaseById = async (id) => {
    const db = await initDB();
    return db.get('purchases', id);
};

// Purchase Item Operations
export const addPurchaseItem = async (item) => {
    const db = await initDB();
    return db.add('purchaseItems', item);
};

export const getPurchaseItems = async (purchaseId) => {
    const db = await initDB();
    const allItems = await db.getAllFromIndex('purchaseItems', 'purchaseId', purchaseId);
    return allItems;
};

export const getAllPurchaseItems = async () => {
    const db = await initDB();
    return db.getAll('purchaseItems');
};

// Shopping List Operations
export const createShoppingList = async (list) => {
    const db = await initDB();
    return db.add('shoppingLists', {
        ...list,
        createdAt: new Date().toISOString(),
        status: 'active'
    });
};

export const getAllShoppingLists = async () => {
    const db = await initDB();
    const lists = await db.getAll('shoppingLists');
    return lists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getShoppingListById = async (id) => {
    const db = await initDB();
    return db.get('shoppingLists', id);
};

export const updateShoppingList = async (id, updates) => {
    const db = await initDB();
    const list = await db.get('shoppingLists', id);
    const updated = { ...list, ...updates };
    await db.put('shoppingLists', updated);
    return updated;
};

export const deleteShoppingList = async (id) => {
    const db = await initDB();
    // Delete list items first
    const items = await getShoppingListItems(id);
    for (const item of items) {
        await db.delete('shoppingListItems', item.id);
    }
    // Delete list
    await db.delete('shoppingLists', id);
};

// Shopping List Item Operations
export const addShoppingListItem = async (item) => {
    const db = await initDB();
    return db.add('shoppingListItems', {
        ...item,
        checked: false,
        price: null
    });
};

export const getShoppingListItems = async (listId) => {
    const db = await initDB();
    return db.getAllFromIndex('shoppingListItems', 'listId', listId);
};

export const updateShoppingListItem = async (id, updates) => {
    const db = await initDB();
    const item = await db.get('shoppingListItems', id);
    const updated = { ...item, ...updates };
    await db.put('shoppingListItems', updated);
    return updated;
};

export const deleteShoppingListItem = async (id) => {
    const db = await initDB();
    await db.delete('shoppingListItems', id);
};

// Analytics Operations
export const getProductHistory = async (productName) => {
    const db = await initDB();
    const allItems = await db.getAll('purchaseItems');
    return allItems.filter(item =>
        item.productName.toLowerCase().includes(productName.toLowerCase())
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const getLowestPrice = async (productName, brand = null) => {
    const db = await initDB();
    const allItems = await db.getAll('purchaseItems');
    const filtered = allItems.filter(item => {
        const nameMatch = item.productName.toLowerCase() === productName.toLowerCase();
        const brandMatch = !brand || item.brand.toLowerCase() === brand.toLowerCase();
        return nameMatch && brandMatch;
    });

    if (filtered.length === 0) return null;

    return filtered.reduce((min, item) =>
        item.price < min.price ? item : min
    );
};

export const getCategoryTotals = async () => {
    const db = await initDB();
    const allItems = await db.getAll('purchaseItems');

    const totals = {};
    allItems.forEach(item => {
        if (!totals[item.category]) {
            totals[item.category] = 0;
        }
        totals[item.category] += item.price;
    });

    return Object.entries(totals).map(([category, total]) => ({
        category,
        total: parseFloat(total.toFixed(2))
    }));
};

export const getMonthlyTotals = async () => {
    const db = await initDB();
    const purchases = await db.getAll('purchases');

    const monthlyData = {};
    purchases.forEach(purchase => {
        const date = new Date(purchase.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += purchase.total;
    });

    return Object.entries(monthlyData)
        .map(([month, total]) => ({
            month,
            total: parseFloat(total.toFixed(2))
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
};

export const getStoreRanking = async () => {
    const db = await initDB();
    const purchases = await db.getAll('purchases');
    const stores = await db.getAll('stores');

    const storeData = {};

    purchases.forEach(purchase => {
        if (!storeData[purchase.storeId]) {
            storeData[purchase.storeId] = {
                total: 0,
                count: 0
            };
        }
        storeData[purchase.storeId].total += purchase.total;
        storeData[purchase.storeId].count += 1;
    });

    return Object.entries(storeData).map(([storeId, data]) => {
        const store = stores.find(s => s.id === parseInt(storeId));
        return {
            storeName: store?.name || 'Desconhecido',
            averageSpent: parseFloat((data.total / data.count).toFixed(2)),
            totalSpent: parseFloat(data.total.toFixed(2)),
            purchaseCount: data.count
        };
    }).sort((a, b) => a.averageSpent - b.averageSpent);
};
