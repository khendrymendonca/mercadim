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
