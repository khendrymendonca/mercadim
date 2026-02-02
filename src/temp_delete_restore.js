export const deletePurchase = async (id) => {
    const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
