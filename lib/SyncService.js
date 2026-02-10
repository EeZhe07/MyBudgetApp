
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const STORAGE_KEY = '@my_budget_data'; // Transactions
const ASSETS_KEY = '@my_budget_assets';
const GOALS_KEY = '@my_budget_goals';
const CATEGORIES_KEY = '@my_budget_categories';
const BUDGET_KEY = '@my_budget_plan';

export const SyncService = {

    // --- 1. Migration: Upload Local Data to Cloud (First Time) ---
    async uploadLocalDataToCloud(userId) {
        console.log("Starting Migration...");
        try {
            // 1. Assets
            const assetsJson = await AsyncStorage.getItem(ASSETS_KEY);
            const assets = assetsJson ? JSON.parse(assetsJson) : [];
            if (assets.length > 0) {
                const { error } = await supabase.from('assets').upsert(
                    assets.map(a => ({
                        id: a.id, // Keep local ID if possible, or mapping might be needed if using UUIDs
                        user_id: userId,
                        name: a.name,
                        balance: a.balance,
                        icon: a.icon,
                        type: a.type
                    }))
                );
                if (error) {
                    console.error("Assets Upload Error:", JSON.stringify(error));
                    return { success: false, error: "Assets: " + error.message };
                }
            }

            // 2. Categories
            const catJson = await AsyncStorage.getItem(CATEGORIES_KEY);
            const categories = catJson ? JSON.parse(catJson) : null;
            if (categories) {
                // Fix: Inject 'type' property since it is not stored in the object
                const expenseCats = (categories.expense || []).map(c => ({ ...c, type: 'expense' }));
                const incomeCats = (categories.income || []).map(c => ({ ...c, type: 'income' }));

                const allCats = [...expenseCats, ...incomeCats];

                // Fix: Deduplicate by ID to prevent "ON CONFLICT" error (Duplicate IDs in same batch)
                const uniqueCats = Array.from(new Map(allCats.map(item => [item.id, item])).values());

                const { error } = await supabase.from('categories').upsert(
                    uniqueCats.map(c => ({
                        id: c.id,
                        user_id: userId,
                        name: c.name,
                        icon: c.icon,
                        type: c.type,
                        is_default: false
                    }))
                );
                if (error) {
                    console.error("Categories Upload Error:", JSON.stringify(error));
                    return { success: false, error: "Categories: " + error.message };
                }
            }

            // 3. Goals
            const goalsJson = await AsyncStorage.getItem(GOALS_KEY);
            const goals = goalsJson ? JSON.parse(goalsJson) : [];
            if (goals.length > 0) {
                const { error } = await supabase.from('goals').upsert(
                    goals.map(g => ({
                        id: g.id,
                        user_id: userId,
                        title: g.title,
                        // Fix: handle camelCase 'targetAmount' used in App.js
                        target_amount: g.targetAmount || g.target_amount || g.target || 0,
                        saved_amount: g.savedAmount || g.saved_amount || g.saved || 0,
                        icon: g.icon,
                        background_image: g.backgroundImage
                    }))
                );
                if (error) {
                    console.error("Goals Upload Error:", JSON.stringify(error));
                    return { success: false, error: "Goals: " + error.message };
                }
            }

            // 4. Transactions
            const transJson = await AsyncStorage.getItem(STORAGE_KEY);
            const transactions = transJson ? JSON.parse(transJson) : [];
            if (transactions.length > 0) {
                // Batch upload might be needed for large datasets, simplying for now
                const { error } = await supabase.from('transactions').upsert(
                    transactions.map(t => ({
                        id: t.id,
                        user_id: userId,
                        type: t.type,
                        amount: t.amount,
                        date: t.date,
                        note: t.note || t.title,
                        asset_id: t.assetId,
                        // Fix: 'transfer' string is not a valid uuid/id in categories table. Send null.
                        category_id: (t.categoryId === 'transfer' || !t.categoryId) ? null : t.categoryId,
                        goal_id: t.goalId,
                        to_asset_id: t.toAssetId
                    }))
                );
                if (error) console.error("Transactions Upload Error", error);
            }

            // 5. Budget
            const budget = await AsyncStorage.getItem(BUDGET_KEY);
            if (budget) {
                const month = new Date().toISOString().substring(0, 7); // 2023-10
                await supabase.from('budget').upsert({
                    user_id: userId,
                    month: month,
                    amount: parseFloat(budget)
                });
            }

            return { success: true };
        } catch (e) {
            console.error("Migration Failed", e);
            return { success: false, error: e };
        }
    },

    // --- 2. Pull: Download Cloud Data to Local (Login on new device) ---
    async pullDataFromCloud(userId) {
        try {
            // Fetch all tables
            const { data: assets } = await supabase.from('assets').select('*').eq('user_id', userId);
            const { data: categories } = await supabase.from('categories').select('*').eq('user_id', userId);
            const { data: goals } = await supabase.from('goals').select('*').eq('user_id', userId);
            const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', userId);
            const { data: budget } = await supabase.from('budget').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);

            // Transform back to Local Structure if needed
            // (Assuming ID consistency for now)

            if (assets) await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
            if (goals) await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals.map(g => ({
                ...g,
                target: g.target_amount,
                saved: g.saved_amount,
                backgroundImage: g.background_image
            }))));

            if (transactions) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.map(t => ({
                ...t,
                title: t.note, // Mapping 'note' back to 'title' used in App logic
            }))));

            if (budget && budget.length > 0) await AsyncStorage.setItem(BUDGET_KEY, budget[0].amount.toString());

            // Categories might need splitting back into expense/income arrays
            if (categories) {
                const expense = categories.filter(c => c.type === 'expense');
                const income = categories.filter(c => c.type === 'income');
                // Merge with defaults or replace? For now, let's just save custom ones if we tracked that difference.
                // Simplification: We only synced custom categories in theory, but the upload logic took all.
                // Let's defer category merging.
            }

            return { success: true, count: transactions?.length || 0 };
        } catch (e) {
            console.error("Pull Failed", e);
            return { success: false, error: e };
        }
    },

    // --- 3. Incremental Sync (Call on Save) ---
    async syncTransaction(t, userId) {
        if (!userId) return;
        const { error } = await supabase.from('transactions').upsert({
            id: t.id,
            user_id: userId,
            type: t.type,
            amount: t.amount,
            date: t.date,
            note: t.note || t.title,
            asset_id: t.assetId,
            category_id: t.categoryId,
            goal_id: t.goalId,
            to_asset_id: t.toAssetId
        });
        if (error) console.log("Sync Transaction Error", error);
    },

    async deleteTransaction(id, userId) {
        if (!userId) return;
        await supabase.from('transactions').delete().eq('id', id);
    }
};
