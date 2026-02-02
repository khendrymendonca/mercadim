import { supabase } from './lib/supabase';

// Store Operations
export const addStore = async (store) => {
    const { data, error } = await supabase
        .from('stores')
        .insert([{ name: store.name, address: store.address }])
        .select()
        .single();

    if (error) throw error;
    return data.id;
};

export const getAllStores = async () => {
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data;
};

export const updateStore = async (id, updates) => {
    const { data, error } = await supabase
        .from('stores')
        .update({ name: updates.name, address: updates.address })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// Product Catalog Operations
export const addProduct = async (product) => {
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: product.name,
            default_category: product.category,
            default_unit: product.unit
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getAllProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data.map(p => ({
        ...p,
        category: p.default_category,
        unit: p.default_unit
    }));
};

export const deleteProduct = async (id) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const updateProduct = async (id, updates) => {
    const { data, error } = await supabase
        .from('products')
        .update({
            name: updates.name,
            default_category: updates.category,
            default_unit: updates.unit
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return { ...data, category: data.default_category, unit: data.default_unit };
};

// Category Operations
export const addCategory = async (name) => {
    const { data, error } = await supabase
        .from('categories')
        .insert([{ name }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getAllCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
    if (error) throw error;
    return data;
};

export const deleteCategory = async (id) => {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

export const updateCategory = async (id, name) => {
    const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getStoreById = async (id) => {
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

// Purchase Operations
export const addPurchase = async (purchase) => {
    const { data, error } = await supabase
        .from('purchases')
        .insert([{
            date: purchase.date,
            store_id: purchase.storeId,
            total: purchase.total
        }])
        .select()
        .single();

    if (error) throw error;
    return data.id;
};

export const getAllPurchases = async () => {
    const { data, error } = await supabase
        .from('purchases')
        .select('*, stores(name)')
        .order('date', { ascending: false });

    if (error) throw error;

    // Map back to format expected by UI if needed
    return data.map(p => ({
        ...p,
        storeId: p.store_id
    }));
};

export const getPurchaseById = async (id) => {
    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return { ...data, storeId: data.store_id };
};

export const deletePurchase = async (id) => {
    const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Purchase Item Operations
export const addPurchaseItem = async (item) => {
    const { error } = await supabase
        .from('purchase_items')
        .insert([{
            purchase_id: item.purchaseId,
            product_name: item.productName,
            brand: item.brand,
            category: item.category,
            weight: item.weight,
            unit: item.unit,
            price: item.price,
            date: item.date,
            is_promotion: item.isPromotion || false
        }]);

    if (error) throw error;
};

export const getPurchaseItems = async (purchaseId) => {
    const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId);

    if (error) throw error;

    return data.map(i => ({
        ...i,
        purchaseId: i.purchase_id,
        productName: i.product_name,
        isPromotion: i.is_promotion
    }));
};

export const getAllPurchaseItems = async () => {
    const { data, error } = await supabase
        .from('purchase_items')
        .select('*');

    if (error) throw error;
    return data.map(i => ({
        ...i,
        purchaseId: i.purchase_id,
        productName: i.product_name
    }));
};

export const updatePurchaseItem = async (id, updates) => {
    const { data, error } = await supabase
        .from('purchase_items')
        .update({
            product_name: updates.productName,
            brand: updates.brand,
            category: updates.category,
            weight: updates.weight,
            unit: updates.unit,
            price: updates.price,
            is_promotion: updates.isPromotion
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return { ...data, productName: data.product_name, isPromotion: data.is_promotion };
};

export const deletePurchaseItem = async (id, purchaseId) => {
    // Excluir o item
    const { error: deleteError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('id', id);
    if (deleteError) throw deleteError;

    // Recalcular total da compra
    const items = await getPurchaseItems(purchaseId);
    const newTotal = items.reduce((sum, item) => sum + (item.price * (item.weight || 1)), 0);

    const { error: updateError } = await supabase
        .from('purchases')
        .update({ total: newTotal })
        .eq('id', purchaseId);

    if (updateError) throw updateError;
};

// Shopping List Operations
export const createShoppingList = async (list) => {
    const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{ name: list.name, status: 'active' }])
        .select()
        .single();

    if (error) throw error;
    return data.id;
};

export const getAllShoppingLists = async () => {
    // Usando uma subquery ou select count para pegar itemCount se necessário
    // Por simplicidade agora, vamos pegar as listas e depois os counts seriam calculados no front ou via RPC
    const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
            *,
            shopping_list_items(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(l => ({
        ...l,
        createdAt: l.created_at,
        itemCount: l.shopping_list_items?.[0]?.count || 0
    }));
};

export const getShoppingListById = async (id) => {
    const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

export const updateShoppingList = async (id, updates) => {
    const { data, error } = await supabase
        .from('shopping_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteShoppingList = async (id) => {
    const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Shopping List Item Operations
export const addShoppingListItem = async (item) => {
    const { data, error } = await supabase
        .from('shopping_list_items')
        .insert([{
            list_id: item.listId,
            product_name: item.productName,
            unit: item.unit || 'un',
            checked: false
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getShoppingListItems = async (listId) => {
    const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', listId);

    if (error) throw error;
    return data.map(i => ({
        ...i,
        listId: i.list_id,
        productName: i.product_name
    }));
};

export const updateShoppingListItem = async (id, updates) => {
    const cleanUpdates = {};
    if (updates.productName) cleanUpdates.product_name = updates.productName;
    if (updates.checked !== undefined) cleanUpdates.checked = updates.checked;
    if (updates.price !== undefined) cleanUpdates.price = updates.price;

    const { data, error } = await supabase
        .from('shopping_list_items')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteShoppingListItem = async (id) => {
    const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// Analytics Operations
export const getProductHistory = async (productName) => {
    const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .ilike('product_name', `%${productName}%`)
        .order('date', { ascending: false });

    if (error) throw error;
    return data.map(i => ({ ...i, productName: i.product_name }));
};

export const getLowestPrice = async (productName, brand = null) => {
    let query = supabase
        .from('purchase_items')
        .select('*')
        .ilike('product_name', productName)
        .order('price', { ascending: true })
        .limit(1);

    if (brand) {
        query = query.ilike('brand', brand);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.length > 0 ? { ...data[0], productName: data[0].product_name } : null;
};

export const getCategoryTotals = async () => {
    const { data, error } = await supabase
        .from('purchase_items')
        .select('category, price');

    if (error) throw error;

    const totals = {};
    data.forEach(item => {
        if (!totals[item.category]) totals[item.category] = 0;
        totals[item.category] += parseFloat(item.price);
    });

    return Object.entries(totals).map(([category, total]) => ({
        category,
        total: parseFloat(total.toFixed(2))
    }));
};

export const getMonthlyTotals = async () => {
    const { data, error } = await supabase
        .from('purchases')
        .select('date, total');

    if (error) throw error;

    const monthlyData = {};
    data.forEach(purchase => {
        const date = new Date(purchase.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
        monthlyData[monthKey] += parseFloat(purchase.total);
    });

    return Object.entries(monthlyData)
        .map(([month, total]) => ({
            month,
            total: parseFloat(total.toFixed(2))
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
};

export const getStoreRanking = async () => {
    const { data: purchases, error: pError } = await supabase.from('purchases').select('store_id, total');
    const { data: stores, error: sError } = await supabase.from('stores').select('*');

    if (pError || sError) throw pError || sError;

    const storeStats = {};
    purchases.forEach(p => {
        if (!storeStats[p.store_id]) storeStats[p.store_id] = { total: 0, count: 0 };
        storeStats[p.store_id].total += parseFloat(p.total);
        storeStats[p.store_id].count += 1;
    });

    return Object.entries(storeStats).map(([storeId, stats]) => {
        const store = stores.find(s => s.id === parseInt(storeId));
        return {
            storeName: store?.name || 'Desconhecido',
            averageSpent: parseFloat((stats.total / stats.count).toFixed(2)),
            totalSpent: parseFloat(stats.total.toFixed(2)),
            purchaseCount: stats.count
        };
    }).sort((a, b) => a.averageSpent - b.averageSpent);
};

export const deleteStore = async (id) => {
    const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

