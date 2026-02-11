
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

            // Build a category lookup map for icon restoration
            const catMap = {};
            if (categories) {
                categories.forEach(c => { catMap[c.id] = c; });
            }

            // Save Assets (map snake_case back to camelCase)
            if (assets) await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(assets.map(a => ({
                id: a.id,
                name: a.name,
                balance: a.balance,
                icon: a.icon || '💰',
                type: a.type
            }))));

            // Save Goals
            if (goals) await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals.map(g => ({
                id: g.id,
                title: g.title,
                targetAmount: g.target_amount,
                savedAmount: g.saved_amount,
                icon: g.icon || '🎯',
                backgroundImage: g.background_image
            }))));

            // Save Transactions (map snake_case back to camelCase + restore icon)
            if (transactions) {
                // Build asset name lookup
                const assetMap = {};
                if (assets) assets.forEach(a => { assetMap[a.id] = a.name; });

                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.map(t => {
                    const cat = catMap[t.category_id];
                    return {
                        id: t.id,
                        title: t.note || (cat ? cat.name : '其他'),
                        date: t.date,
                        amount: t.amount,
                        type: t.type,
                        icon: cat ? cat.icon : (t.type === 'transfer' ? '↔️' : '💸'),
                        assetId: t.asset_id,
                        assetName: assetMap[t.asset_id] || '',
                        categoryId: t.category_id,
                        goalId: t.goal_id,
                        toAssetId: t.to_asset_id,
                        toAssetName: assetMap[t.to_asset_id] || '',
                        subType: t.goal_id ? 'goal_deposit' : (t.to_asset_id ? 'internal' : undefined)
                    };
                })));
            }

            if (budget && budget.length > 0) await AsyncStorage.setItem(BUDGET_KEY, budget[0].amount.toString());

            // Categories: split back into expense/income
            if (categories && categories.length > 0) {
                const expense = categories.filter(c => c.type === 'expense').map(c => ({
                    id: c.id, name: c.name, icon: c.icon || '💸', color: c.color || '#8395A7'
                }));
                const income = categories.filter(c => c.type === 'income').map(c => ({
                    id: c.id, name: c.name, icon: c.icon || '💵', color: c.color || '#8395A7'
                }));
                if (expense.length > 0 || income.length > 0) {
                    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify({ expense, income }));
                }
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
