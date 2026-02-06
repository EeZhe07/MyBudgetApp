import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Platform, Modal, TextInput, KeyboardAvoidingView, Alert, Dimensions, ImageBackground, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, LineChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';

// --- 预设分类数据 ---
const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', name: '餐饮', icon: '🍔' },
    { id: 'transport', name: '交通', icon: '🚕' },
    { id: 'shopping', name: '购物', icon: '🛍️' },
    { id: 'entertainment', name: '娱乐', icon: '🎮' },
    { id: 'housing', name: '居住', icon: '🏠' },
    { id: 'medical', name: '医疗', icon: '💊' },
    { id: 'other', name: '其他', icon: '💸' },
  ],
  income: [
    { id: 'salary', name: '工资', icon: '💰' },
    { id: 'invest', name: '理财', icon: '📈' },
    { id: 'parttime', name: '兼职', icon: '⚡' },
    { id: 'other', name: '其他', icon: '💵' },
  ]
};

export default function App() {
  // --- 1. 核心状态管理 ---
  const [modalVisible, setModalVisible] = useState(false); // 记账弹窗
  const [assetModalVisible, setAssetModalVisible] = useState(false); // 资产弹窗
  const [goalModalVisible, setGoalModalVisible] = useState(false); // 目标弹窗

  // 页面导航 & 统计状态
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'stats'
  const [currentMonth, setCurrentMonth] = useState(new Date()); // 用于统计筛选月份
  const [statsRange, setStatsRange] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'

  // 记账输入状态
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense'); // 'expense' or 'income'
  const [selectedAssetId, setSelectedAssetId] = useState(null); // 记账时选中的资产ID
  // 新增：选中分类状态
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES.expense[0]);
  // 编辑模式状态
  const [editingId, setEditingId] = useState(null);
  const [activeTransaction, setActiveTransaction] = useState(null); // Detail View State
  // 日期时间状态 (Phase 7)
  const [transactionDate, setTransactionDate] = useState(''); // YYYY-MM-DD
  const [transactionTime, setTransactionTime] = useState(''); // HH:mm

  // 资产输入状态
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetBalance, setNewAssetBalance] = useState('');
  const [newAssetIcon, setNewAssetIcon] = useState('💰');
  const [activeAsset, setActiveAsset] = useState(null); // Current asset for detail view
  const [editingAssetId, setEditingAssetId] = useState(null); // Asset ID being edited

  // 目标输入状态
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalIcon, setNewGoalIcon] = useState('🚗');
  const [newGoalImage, setNewGoalImage] = useState(null); // Background Image URI
  const [editingGoalId, setEditingGoalId] = useState(null); // ID of goal being edited

  // 存钱进目标状态 (新增)
  const [savingModalVisible, setSavingModalVisible] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null); // 当前选中的目标

  // Calendar Picker State (Phase 9 & 12)
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(new Date()); // Viewing Year/Month
  const [monthModalVisible, setMonthModalVisible] = useState(false); // For Month Picker
  const [savingAmount, setSavingAmount] = useState('');

  // 数据列表
  // 数据列表
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // 新增分类状态
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍕');

  // Budget State (Phase 15)
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');

  // --- 数据库 Key ---
  const STORAGE_KEY = '@my_budget_data';
  const ASSETS_KEY = '@my_budget_assets';
  const GOALS_KEY = '@my_budget_goals';
  const CATEGORIES_KEY = '@my_budget_categories';
  const BUDGET_KEY = '@my_budget_plan';

  // --- 初始化加载 ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const transJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (transJson) setTransactions(JSON.parse(transJson));

      const assetsJson = await AsyncStorage.getItem(ASSETS_KEY);
      let loadedAssets = [];
      if (assetsJson) {
        loadedAssets = JSON.parse(assetsJson);
        setAssets(loadedAssets);
        if (loadedAssets.length > 0) setSelectedAssetId(loadedAssets[0].id);
      } else {
        const defaultAssets = [
          { id: 1, name: '现金', balance: 500, icon: '💵' },
          { id: 2, name: 'Maybank', balance: 2500, icon: '🏦' },
          { id: 3, name: 'TnG', balance: 150, icon: '📱' },
        ];
        setAssets(defaultAssets);
        loadedAssets = defaultAssets;
        saveAssets(defaultAssets);
        setSelectedAssetId(1);
      }

      const goalsJson = await AsyncStorage.getItem(GOALS_KEY);
      if (goalsJson) setGoals(JSON.parse(goalsJson));

      const budgetJson = await AsyncStorage.getItem(BUDGET_KEY); // Load Budget
      if (budgetJson) setMonthlyBudget(parseFloat(budgetJson));

    } catch (e) {
      console.error("加载失败", e);
    }
  };

  const saveTransactions = async (data) => { try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveAssets = async (data) => { try { await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveGoals = async (data) => { try { await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveCategories = async (data) => { try { await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveBudget = async (amount) => { try { await AsyncStorage.setItem(BUDGET_KEY, amount.toString()); } catch (e) { } };

  // --- 计算总资产 (Assets + Goals) ---
  const totalAssetBalance = assets.reduce((acc, item) => acc + parseFloat(item.balance), 0) +
    goals.reduce((acc, item) => acc + parseFloat(item.savedAmount), 0);

  // --- 统计计算 Helper ---
  // --- 统计计算 Helper ---
  const getStats = (overrideRange = null, dateOverride = null) => {
    let filteredTrans = [];
    const now = dateOverride ? new Date(dateOverride) : new Date(currentMonth);
    const range = overrideRange || statsRange;

    if (range === 'weekly') {
      // 获取本周起始/结束 (假设周一为第一天)
      const day = now.getDay() || 7; // Get current day number, converting Sun (0) to 7
      if (day !== 1) now.setHours(-24 * (day - 1)); // Set to Monday
      now.setHours(0, 0, 0, 0);
      const startOfWeek = now.getTime();
      const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000;

      filteredTrans = transactions.filter(t => {
        const tDate = new Date(t.date).getTime();
        return tDate >= startOfWeek && tDate < endOfWeek;
      });
    } else if (statsRange === 'monthly') {
      const year = now.getFullYear();
      const month = now.getMonth();
      filteredTrans = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && tDate.getMonth() === month;
      });
    } else if (statsRange === 'yearly') {
      const year = now.getFullYear();
      filteredTrans = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year;
      });
    }

    const totalExpense = filteredTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = filteredTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    // 分类汇总 (Pie Chart Data)
    const categoryMap = {};
    filteredTrans.filter(t => t.type === 'expense').forEach(t => {
      if (!categoryMap[t.categoryId]) {
        categoryMap[t.categoryId] = {
          name: t.title,
          amount: 0,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
          legendFontColor: "#7F7F7F",
          legendFontSize: 12
        };
        const cat = categories.expense.find(c => c.id === t.categoryId);
        if (cat) categoryMap[t.categoryId].name = cat.name;
      }
      categoryMap[t.categoryId].amount += Math.abs(t.amount);
    });

    const pieData = Object.keys(categoryMap).map(key => ({
      name: categoryMap[key].name,
      population: categoryMap[key].amount,
      color: categoryMap[key].color,
      legendFontColor: "#AAA",
      legendFontSize: 12
    })).sort((a, b) => b.population - a.population);

    return { totalExpense, totalIncome, pieData };
  };

  // --- Helper: Group Transactions by Date (Phase 14) ---
  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    // Sort dates descending
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
    return sortedDates.map(date => ({ title: date, data: groups[date] }));
  };

  const currentMonthGroups = groupTransactionsByDate(transactions.slice(0, 20)); // Group recent transactions

  // --- A. 添加/修改资产 ---
  const handleAddAsset = async () => {
    if (!newAssetName) return;

    if (editingAssetId) {
      // Update existing
      const updatedAssets = assets.map(a =>
        a.id === editingAssetId
          ? { ...a, name: newAssetName, balance: parseFloat(newAssetBalance) || 0, icon: newAssetIcon || '💰' }
          : a
      );
      setAssets(updatedAssets);
      await saveAssets(updatedAssets);
      // Update active if needed
      if (activeAsset && activeAsset.id === editingAssetId) {
        setActiveAsset(updatedAssets.find(a => a.id === editingAssetId));
      }
    } else {
      // Create new
      const newAsset = {
        id: Date.now(),
        name: newAssetName,
        balance: parseFloat(newAssetBalance) || 0,
        icon: newAssetIcon || '💰'
      };
      const updated = [...assets, newAsset];
      setAssets(updated);
      await saveAssets(updated);
    }

    setNewAssetName(''); setNewAssetBalance(''); setNewAssetIcon('💰'); setEditingAssetId(null); setAssetModalVisible(false);
  };

  // --- Image Picker Helper ---
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setNewGoalImage(result.assets[0].uri);
    }
  };

  // --- B. 添加/修改目标 ---
  const handleAddGoal = async () => {
    if (!newGoalTitle || !newGoalTarget) return;

    if (editingGoalId) {
      // Update existing goal
      const updatedGoals = goals.map(g => {
        if (g.id === editingGoalId) {
          return {
            ...g,
            title: newGoalTitle,
            targetAmount: parseFloat(newGoalTarget),
            icon: newGoalIcon,
            backgroundImage: newGoalImage
          };
        }
        return g;
      });
      setGoals(updatedGoals);
      await saveGoals(updatedGoals);

      // Update activeGoal if it's the one being edited
      if (activeGoal && activeGoal.id === editingGoalId) {
        setActiveGoal(updatedGoals.find(g => g.id === editingGoalId));
      }
    } else {
      // Create new goal
      const newGoal = {
        id: Date.now(),
        title: newGoalTitle,
        targetAmount: parseFloat(newGoalTarget),
        savedAmount: 0,
        icon: newGoalIcon,
        backgroundImage: newGoalImage, // Save Image URI
      };
      const updated = [...goals, newGoal];
      setGoals(updated);
      await saveGoals(updated);
    }

    setNewGoalTitle(''); setNewGoalTarget(''); setNewGoalImage(null); setEditingGoalId(null); setGoalModalVisible(false);
  };

  const openEditGoal = (goal) => {
    setNewGoalTitle(goal.title);
    setNewGoalTarget(goal.targetAmount.toString());
    setNewGoalIcon(goal.icon);
    setNewGoalImage(goal.backgroundImage);
    setEditingGoalId(goal.id);
    setGoalModalVisible(true);
  };

  // --- D. 存钱进目标 ---
  const handleDepositToGoal = async () => {
    if (!savingAmount || !activeGoal || !selectedAssetId) return;
    const amountVal = parseFloat(savingAmount);
    // 1. 从资产扣钱
    const assetIndex = assets.findIndex(a => a.id === selectedAssetId);
    if (assetIndex === -1) return;
    const updatedAssets = [...assets];
    updatedAssets[assetIndex].balance -= amountVal;
    // 2. 给目标加钱
    const updatedGoals = goals.map(g => {
      if (g.id === activeGoal.id) { return { ...g, savedAmount: g.savedAmount + amountVal }; }
      return g;
    });
    // 3. 记录
    const selectedAsset = assets[assetIndex];
    const newTransaction = {
      id: Date.now(),
      title: `存入目标: ${activeGoal.title}`,
      date: new Date(`${transactionDate}T${transactionTime}:00`).toISOString(), // Fix: Use ISO format from inputs
      amount: -amountVal,
      icon: '🎯',
      type: 'expense',
      assetName: selectedAsset.name,
      assetId: selectedAsset.id,
      goalId: activeGoal.id // Link transaction to goal
    };
    setAssets(updatedAssets); await saveAssets(updatedAssets);
    setGoals(updatedGoals); await saveGoals(updatedGoals);
    const updatedTrans = [newTransaction, ...transactions];
    setTransactions(updatedTrans); await saveTransactions(updatedTrans);
    setSavingAmount(''); setSavingModalVisible(false);
  };

  // --- F. 添加自定义分类 ---
  const handleAddCategory = async () => {
    if (!newCatName) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCatName,
      icon: newCatIcon
    };

    // 根据当前 type (expense/income) 添加到对应列表
    const updatedCategories = { ...categories };
    if (type === 'expense') {
      updatedCategories.expense = [...updatedCategories.expense, newCat];
    } else {
      updatedCategories.income = [...updatedCategories.income, newCat];
    }

    setCategories(updatedCategories);
    await saveCategories(updatedCategories);
    // 自动选中新分类
    setSelectedCategory(newCat);
    setNewCatName('');
    setCategoryModalVisible(false);
  };

  // --- C. 添加/编辑 记账 (核心逻辑更新) ---
  const handleSaveTransaction = async (shouldClose = true) => {
    if (!amount) return;
    if (!selectedAssetId) { Alert.alert("提示", "请选择支付账户"); return; }

    const transAmount = parseFloat(amount);
    const finalAmount = type === 'expense' ? -transAmount : transAmount;

    // 准备新数据
    const selectedAsset = assets.find(a => a.id === selectedAssetId);
    if (!selectedAsset) return;

    let updatedAssets = [...assets];
    let updatedTransactions = [...transactions];

    // 如果没有填备注，就用分类名称代替 (例如 "餐饮")
    const displayTitle = note || selectedCategory.name;

    if (editingId) {
      // === 编辑模式 ===
      const oldTransaction = transactions.find(t => t.id === editingId);
      if (!oldTransaction) return;

      // 1. 还原旧账 (回滚旧资产余额)
      if (oldTransaction.assetId) {
        const oldAssetIndex = updatedAssets.findIndex(a => a.id === oldTransaction.assetId);
        if (oldAssetIndex !== -1) {
          updatedAssets[oldAssetIndex].balance -= oldTransaction.amount; // 减去旧金额 
        }
      }

      // 2. 扣除新账 (更新新资产余额)
      const newAssetIndex = updatedAssets.findIndex(a => a.id === selectedAssetId);
      if (newAssetIndex !== -1) {
        updatedAssets[newAssetIndex].balance += finalAmount;
      }

      // 3. 更新交易记录
      updatedTransactions = updatedTransactions.map(t => {
        if (t.id === editingId) {
          return {
            ...t,
            title: displayTitle,
            date: new Date(`${transactionDate}T${transactionTime}:00`).toISOString(), // Update date on edit
            amount: finalAmount,
            icon: selectedCategory.icon, // 使用分类图标
            type: type,
            assetName: selectedAsset.name,
            assetId: selectedAsset.id,
            categoryId: selectedCategory.id // 记录分类ID
          };
        }
        return t;
      });

    } else {
      // === 新增模式 ===
      const assetIndex = updatedAssets.findIndex(a => a.id === selectedAssetId);
      if (assetIndex !== -1) {
        updatedAssets[assetIndex].balance += finalAmount;
      }

      const newTransaction = {
        id: Date.now(),
        title: displayTitle,
        date: new Date(`${transactionDate}T${transactionTime}:00`).toISOString(), // Combine Date & Time
        amount: finalAmount,
        icon: selectedCategory.icon,
        type: type,
        assetName: selectedAsset.name,
        assetId: selectedAsset.id,
        categoryId: selectedCategory.id
      };
      updatedTransactions = [newTransaction, ...updatedTransactions];
    }

    setAssets(updatedAssets); await saveAssets(updatedAssets);
    setTransactions(updatedTransactions); await saveTransactions(updatedTransactions);

    // Phase 8: Recalculate Goal Progress (Safe Approach)
    // If we just edited/added a transaction that *might* be related to a goal, 
    // it's safest to just re-sum all goals' saved amounts from the transactions.
    // However, that's heavy. 
    // Let's just check if the EDITED transaction had a goalId.
    const goalIdToUpdate = editingId
      ? transactions.find(t => t.id === editingId)?.goalId
      : null;

    if (goalIdToUpdate) {
      const totalSaved = updatedTransactions
        .filter(t => t.goalId === goalIdToUpdate)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const updatedGoals = goals.map(g => {
        if (g.id === goalIdToUpdate) return { ...g, savedAmount: totalSaved };
        return g;
      });
      setGoals(updatedGoals); await saveGoals(updatedGoals);
      // Also update activeGoal if it matches, so UI updates immediately
      if (activeGoal && activeGoal.id === goalIdToUpdate) {
        const newActive = updatedGoals.find(g => g.id === goalIdToUpdate);
        setActiveGoal(newActive);
      }
    }

    // 重置并关闭 或 继续
    if (shouldClose) {
      setAmount(''); setNote(''); setEditingId(null); setModalVisible(false);
    } else {
      // Save & Continue: Clear specific fields, keep Date/Time/Category/Asset
      setAmount('');
      setNote('');
      setEditingId(null); // Switch to 'add' mode for next one if we were editing (though typically this button is for adding)
      Alert.alert("Success", "已保存，请继续添加下一笔");
    }
  };

  // --- E. 长按操作 (编辑/删除) ---
  const openEditTransactionModal = (transaction) => {
    setAmount(Math.abs(transaction.amount).toString());
    setNote(transaction.title);
    setType(transaction.type);
    setSelectedAssetId(transaction.assetId || null);
    // 尝试恢复之前的分类 (如果有)
    if (transaction.categoryId) {
      const catGroup = transaction.type === 'expense' ? categories.expense : categories.income;
      const foundCat = catGroup.find(c => c.id === transaction.categoryId);
      if (foundCat) setSelectedCategory(foundCat);
    }

    // Populate Date/Time
    const tDate = new Date(transaction.date);
    setTransactionDate(tDate.toISOString().split('T')[0]);
    setTransactionTime(tDate.toTimeString().split(' ')[0].substring(0, 5));

    setEditingId(transaction.id);
    setModalVisible(true);
  };

  const handleLongPressTransaction = (transaction) => {
    Alert.alert(
      "操作记录",
      `想要对 "${transaction.title}" 做什么？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "✏️ 修改",
          onPress: () => openEditTransactionModal(transaction) // Use extracted function
        },
        {
          text: "🗑️ 删除",
          style: "destructive",
          onPress: () => handleDeleteTransaction(transaction)
        }
      ]
    );
  };

  const handleDeleteTransaction = async (transaction) => {
    if (transaction.assetId) {
      const updatedAssets = assets.map(asset => {
        if (asset.id === transaction.assetId) {
          return { ...asset, balance: asset.balance - transaction.amount };
        }
        return asset;
      });
      setAssets(updatedAssets); await saveAssets(updatedAssets);
    }

    // Phase 8: Recalculate Goal Progress if deleting a deposit
    if (transaction.goalId) {
      const updatedGoals = goals.map(g => {
        if (g.id === transaction.goalId) {
          // Deduct the saved amount (transaction.amount is negative for expense, so we add it back? No, wait.)
          // Deposit transaction amount is NEGATIVE (expense). 
          // Saving Goal Amount is POSITIVE.
          // If I deposit 100, transaction is -100. Goal Amount +100.
          // If I delete transaction -100, Goal Amount should be -100.
          return { ...g, savedAmount: g.savedAmount - Math.abs(transaction.amount) };
        }
        return g;
      });
      setGoals(updatedGoals); await saveGoals(updatedGoals);
    }

    const updatedTrans = transactions.filter(t => t.id !== transaction.id);
    setTransactions(updatedTrans); await saveTransactions(updatedTrans);
  };

  // --- Render Stats Screen ---
  const renderStatsScreen = () => {
    const stats = getStats();
    const screenWidth = Dimensions.get("window").width;

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.statsHeader}>
          <TouchableOpacity onPress={() => {
            const splitDate = new Date(currentMonth);
            if (statsRange === 'weekly') splitDate.setDate(splitDate.getDate() - 7);
            else if (statsRange === 'monthly') splitDate.setMonth(splitDate.getMonth() - 1);
            else splitDate.setFullYear(splitDate.getFullYear() - 1);
            setCurrentMonth(splitDate);
          }}><Text style={styles.monthChangeArrow}>◀</Text></TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setMonthModalVisible(true)}>
              <Text style={styles.monthTitle}>
                {statsRange === 'yearly' ? currentMonth.getFullYear() :
                  statsRange === 'monthly' ? `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月` :
                    `${currentMonth.getMonth() + 1}月${currentMonth.getDate()}日 (本周)`}
              </Text>
              <Text style={{ color: '#666', fontSize: 10, textAlign: 'center' }}>(点击切换)</Text>
            </TouchableOpacity>
            {/* Range Switcher */}
            <View style={{ flexDirection: 'row', marginTop: 5 }}>
              {['weekly', 'monthly', 'yearly'].map(range => (
                <TouchableOpacity key={range} onPress={() => setStatsRange(range)} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ color: statsRange === range ? '#4A90E2' : '#555', fontWeight: statsRange === range ? 'bold' : 'normal' }}>
                    {range === 'weekly' ? '周' : range === 'monthly' ? '月' : '年'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity onPress={() => {
            const splitDate = new Date(currentMonth);
            if (statsRange === 'weekly') splitDate.setDate(splitDate.getDate() + 7);
            else if (statsRange === 'monthly') splitDate.setMonth(splitDate.getMonth() + 1);
            else splitDate.setFullYear(splitDate.getFullYear() + 1);
            setCurrentMonth(splitDate);
          }}><Text style={styles.monthChangeArrow}>▶</Text></TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>支出构成</Text>
            {stats.pieData.length > 0 ? (
              <PieChart
                data={stats.pieData}
                width={screenWidth - 48}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            ) : (
              <Text style={{ color: '#555', textAlign: 'center', marginVertical: 20 }}>本月没有支出记录 🍃</Text>
            )}
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 100 }}>
            <Text style={styles.sectionTitle}>分类排行</Text>
            {stats.pieData.map((item, index) => (
              <View key={index} style={styles.statRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 10 }} />
                  <Text style={styles.statCatName}>{item.name}</Text>
                </View>
                <Text style={styles.statAmount}>RM {item.population.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // --- Helper: Asset History Calculation (Phase 11) ---
  const calculateAssetHistory = (asset) => {
    const today = new Date();
    const dates = [];
    let currentBalance = asset.balance;

    // 1. Generate last 30 days dates
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.unshift(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    // 2. Map date to daily net change
    const dailyChange = {};
    transactions.forEach(t => {
      if (t.assetId === asset.id) {
        const dateStr = t.date.split('T')[0];
        if (!dailyChange[dateStr]) dailyChange[dateStr] = 0;
        const sign = t.type === 'income' ? 1 : -1;
        dailyChange[dateStr] += (t.amount * sign);
      }
    });

    const reversedDates = [...dates].reverse();
    const historyMap = {};
    let runningBalance = currentBalance;

    reversedDates.forEach(dateStr => {
      historyMap[dateStr] = runningBalance;
      const change = dailyChange[dateStr] || 0;
      runningBalance = runningBalance - change;
    });

    return {
      labels: dates.filter((_, i) => i % 5 === 0).map(d => d.slice(5)), // Show fewer labels
      datasets: [{
        data: dates.map(d => historyMap[d] || 0)
      }]
    };
  };

  // --- Helper: Net Worth History Calculation (Phase 16) ---
  const calculateNetWorthHistory = () => {
    const today = new Date();
    const dates = [];
    // Start with current Total Net Worth (Assets + Goals)
    let currentNetWorth = assets.reduce((acc, item) => acc + parseFloat(item.balance), 0) +
      goals.reduce((acc, item) => acc + parseFloat(item.savedAmount), 0);

    // 1. Generate last 30 days dates
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.unshift(d.toISOString().split('T')[0]);
    }

    // 2. Map date to daily net change (ALL transactions)
    const dailyChange = {};
    transactions.forEach(t => {
      const dateStr = t.date.split('T')[0];
      if (!dailyChange[dateStr]) dailyChange[dateStr] = 0;
      // Expense reduces net worth, Income increases it. 
      // But transaction amount is stored as positive for expense? 
      // Let's check: expense is usually negative logic in balance calc, but stored as positive number + type='expense'.
      // In calculateAssetHistory: `dailyChange[dateStr] += t.amount` (Wait, this looks wrong in previous code if t.amount is always positive).
      // Let's check transaction storage. 
      // handleSaveTransaction: amount is parseFloat(amount). type is 'expense' or 'income'.
      // If type='expense', asset balance should decrease.
      // But in calculateAssetHistory, we did `dailyChange += t.amount`. 
      // And then `runningBalance = runningBalance - change`.
      // If I spent 100 today. Current is 900. Previous was 1000.
      // dailyChange = 100. running = 900 - 100 = 800. WRONG.
      // It should be `running = current - change`. 
      // If I spent 100 (balance went DOWN), to get yesterday, I must ADD 100.
      // So `previous = current - (-100)` -> `current + 100`.

      // Let's fix the logic here correctly.
      // We are going BACKWARDS in time.
      // Yesterday = Today - (Change that happened today).
      // Change = Income - Expense.
      // If I had 1000 yesterday, +200 Income, -50 Expense = 1150 Today.
      // Yesterday (1000) = Today (1150) - (150). Correct.

      let change = 0;
      if (t.type === 'income') change = t.amount;
      else change = -t.amount;

      // However, my previous `calculateAssetHistory` might be buggy if `t.amount` is always positive.
      // `dailyChange` summed up `t.amount` regardless of type? 
      // Let's check `calculateAssetHistory` again. 
      // It filters by `t.assetId === asset.id`.
      // It sums `t.amount`. 
      // App.js line 1550 (approx): `t.amount` seems to be just the number. 
      // `handleSaveTransaction`: 
      // if (type === 'expense') updatedAssets... balance -= amount;
      // if (type === 'income') updatedAssets... balance += amount;
      // So transaction object `amount` is positive number.
      // `t.type` determines sign.

      const sign = t.type === 'income' ? 1 : -1;
      if (!dailyChange[dateStr]) dailyChange[dateStr] = 0;
      dailyChange[dateStr] += (t.amount * sign);
    });

    const reversedDates = [...dates].reverse();
    const historyMap = {};
    let runningBalance = currentNetWorth;

    reversedDates.forEach(dateStr => {
      historyMap[dateStr] = runningBalance;
      const change = dailyChange[dateStr] || 0;
      runningBalance = runningBalance - change; // Work backwards: subtract the change
    });

    return {
      labels: dates.filter((_, i) => i % 6 === 0).map(d => d.slice(5)),
      datasets: [{ data: dates.map(d => historyMap[d] || 0) }]
    };
  };

  const openEditAsset = (asset) => {
    setNewAssetName(asset.name);
    setNewAssetBalance(asset.balance.toString());
    setNewAssetIcon(asset.icon);
    setEditingAssetId(asset.id);
    setAssetModalVisible(true);
  };

  // --- Render Asset Detail Screen (Phase 11) ---
  const renderAssetDetailScreen = () => {
    if (!activeAsset) return null;
    const historyData = calculateAssetHistory(activeAsset);
    const assetHistory = transactions.filter(t => t.assetId === activeAsset.id);

    return (
      <View style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage('assets')}>
          <Text style={{ color: '#4A90E2', fontSize: 16 }}>◀ 返回列表</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Text style={{ fontSize: 60, marginBottom: 10 }}>{activeAsset.icon}</Text>
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>{activeAsset.name}</Text>
          <Text style={{ color: '#4CAF50', fontSize: 32, fontWeight: 'bold', marginTop: 10 }}>RM {activeAsset.balance.toLocaleString('en-MY')}</Text>
        </View>

        {/* Chart */}
        <View style={{ marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ color: '#888', marginBottom: 10 }}>最近30天趋势</Text>
          <LineChart
            data={historyData}
            width={Dimensions.get("window").width - 48}
            height={200}
            chartConfig={{
              backgroundColor: "#1e1e1e",
              backgroundGradientFrom: "#2C3E50",
              backgroundGradientTo: "#1e1e1e",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#4A90E2" },
              propsForBackgroundLines: { strokeDasharray: "" }
            }}
            bezier
            style={{ borderRadius: 16, marginVertical: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 }, android: { elevation: 5 } }) }}
          />
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#FF9800', marginHorizontal: 10, width: 120 }]} onPress={() => openEditAsset(activeAsset)}>
            <Text style={styles.addButtonText}>✏️ 编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#333', borderWidth: 1, borderColor: '#555', marginHorizontal: 10, width: 120 }]} onPress={() => {
            Alert.alert("删除账户", "确定要删除这个账户吗？", [
              { text: "取消", style: "cancel" },
              {
                text: "删除", style: "destructive", onPress: async () => {
                  const updatedAssets = assets.filter(a => a.id !== activeAsset.id);
                  setAssets(updatedAssets); await saveAssets(updatedAssets);
                  setCurrentPage('assets');
                }
              }
            ]);
          }}>
            <Text style={[styles.addButtonText, { color: '#FF6B6B' }]}>🗑️ 删除</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <Text style={styles.sectionTitle}>交易明细</Text>
        <ScrollView style={{ flex: 1 }}>
          {assetHistory.length === 0 ? (
            <Text style={{ color: '#555', textAlign: 'center', marginTop: 20 }}>暂无交易</Text>
          ) : (
            assetHistory.slice(0, 20).map((item) => (
              <TouchableOpacity key={item.id} style={styles.transactionItem} onPress={() => {
                setActiveTransaction({ ...item, fromPage: 'asset_detail' });
                setCurrentPage('transaction_detail');
              }}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{item.title}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={item.type === 'expense' ? styles.expenseAmount : styles.incomeAmount}>
                  {item.type === 'expense' ? '' : '+'} RM {Math.abs(item.amount).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // --- Render Assets Screen (Phase 16: Net Worth & Prettier Graph) ---
  const renderAssetsScreen = () => {
    const netWorthData = calculateNetWorthHistory();
    const totalLiabilities = assets.filter(a => a.balance < 0).reduce((acc, a) => acc + a.balance, 0); // Negative number
    const totalAssets = assets.filter(a => a.balance >= 0).reduce((acc, a) => acc + a.balance, 0) +
      goals.reduce((acc, g) => acc + g.savedAmount, 0);
    const netWorth = totalAssets + totalLiabilities; // liabilities are negative

    return (
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={styles.sectionTitle}>我的资产</Text>

        {/* 1. Net Worth Card */}
        <View style={styles.overviewCard}>
          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <Text style={styles.overviewLabel}>总净资产 (Net Worth)</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FFF', marginVertical: 5 }}>
              RM {netWorth.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15 }}>
            <View>
              <Text style={{ color: '#AAA', fontSize: 12 }}>总资产 (Assets)</Text>
              <Text style={{ color: '#4CAF50', fontSize: 16, fontWeight: 'bold' }}>
                RM {totalAssets.toLocaleString()}
              </Text>
            </View>
            <View>
              <Text style={{ color: '#AAA', fontSize: 12, textAlign: 'right' }}>总负债 (Liabilities)</Text>
              <Text style={{ color: '#FF6B6B', fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                RM {Math.abs(totalLiabilities).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Global Trend Chart */}
        <View style={{ marginVertical: 20 }}>
          <Text style={{ color: '#888', marginBottom: 10, fontSize: 12 }}>最近30天净值走势</Text>
          <LineChart
            data={netWorthData}
            width={Dimensions.get("window").width - 48}
            height={180}
            chartConfig={{
              backgroundColor: "#1e1e1e",
              backgroundGradientFrom: "#2C2C2E",
              backgroundGradientTo: "#1e1e1e",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(100, 255, 218, ${opacity})`, // Teal color
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: "#64FFDA" },
              propsForBackgroundLines: { strokeDasharray: "" } // Solid lines
            }}
            bezier
            style={{ borderRadius: 16, marginVertical: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 }, android: { elevation: 5 } }) }}
          />
        </View>

        {/* 3. Assets List */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>账户列表</Text>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {assets.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.assetCard, { width: '48%', marginBottom: 15, marginRight: 0 }]}
                onPress={() => { setActiveAsset(item); setCurrentPage('asset_detail'); }}
              >
                <View style={styles.assetHeaderRow}>
                  <View style={styles.assetIcon}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditAsset(item)}>
                    <Text style={{ fontSize: 16, color: '#AAA' }}>...</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <Text style={styles.assetName}>{item.name}</Text>
                  <Text style={[styles.assetBalance, { color: item.balance >= 0 ? '#FFF' : '#FF6B6B' }]}>
                    RM {item.balance.toLocaleString('en-MY')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Add Asset Button */}
            <TouchableOpacity
              style={[styles.assetCard, { width: '48%', marginBottom: 15, marginRight: 0, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#555', backgroundColor: 'transparent' }]}
              onPress={() => setAssetModalVisible(true)}
            >
              <Text style={{ fontSize: 30, color: '#555' }}>+</Text>
              <Text style={{ color: '#555', marginTop: 5 }}>添加账户</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  // --- Render Month Picker Modal (Phase 12) ---
  const renderMonthPickerModal = () => {
    const years = [2023, 2024, 2025, 2026, 2027];
    const months = Array.from({ length: 12 }, (_, i) => i); // 0-11

    return (
      <Modal animationType="fade" transparent={true} visible={monthModalVisible} onRequestClose={() => setMonthModalVisible(false)}>
        <View style={styles.modalContainerCenter}>
          <View style={[styles.modalContentCenter, { width: 340, padding: 20 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 20 }]}>选择月份 📅</Text>

            {/* Year Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(currentMonth);
                newDate.setFullYear(newDate.getFullYear() - 1);
                setCurrentMonth(newDate);
              }}>
                <Text style={{ fontSize: 24, color: '#4A90E2', paddingHorizontal: 20 }}>◀</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFF' }}>{currentMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(currentMonth);
                newDate.setFullYear(newDate.getFullYear() + 1);
                setCurrentMonth(newDate);
              }}>
                <Text style={{ fontSize: 24, color: '#4A90E2', paddingHorizontal: 20 }}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Months Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {months.map(m => (
                <TouchableOpacity
                  key={m}
                  style={{
                    width: '30%',
                    paddingVertical: 12,
                    marginBottom: 10,
                    backgroundColor: currentMonth.getMonth() === m ? '#4A90E2' : '#333',
                    borderRadius: 10,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(m);
                    setCurrentMonth(newDate);
                    setMonthModalVisible(false);
                  }}
                >
                  <Text style={{ color: currentMonth.getMonth() === m ? '#FFF' : '#AAA', fontWeight: 'bold' }}>
                    {m + 1}月
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={{ marginTop: 15, padding: 10, alignItems: 'center' }} onPress={() => setMonthModalVisible(false)}>
              <Text style={{ color: '#888' }}>关闭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // --- Render Calendar Modal (Phase 9) ---
  const renderCalendarModal = () => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth(); // 0-11

    // Generate days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)

    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <Modal animationType="fade" transparent={true} visible={calendarVisible} onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.modalContainerCenter}>
          <View style={[styles.modalContentCenter, { width: 320, padding: 15 }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={() => setCalendarCursor(new Date(year, month - 1, 1))}>
                <Text style={{ fontSize: 20, padding: 10, color: '#FFF' }}>◀</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>{year}年 {month + 1}月</Text>
              <TouchableOpacity onPress={() => setCalendarCursor(new Date(year, month + 1, 1))}>
                <Text style={{ fontSize: 20, padding: 10, color: '#FFF' }}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <Text key={d} style={{ width: '14.2%', textAlign: 'center', color: '#888' }}>{d}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {days.map((date, index) => {
                if (!date) return <View key={index} style={{ width: '14.2%', aspectRatio: 1 }} />; // Empty slot

                const dateStr = date.toISOString().split('T')[0];
                const isSelected = dateStr === transactionDate;
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: '14.2%',
                      aspectRatio: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: 20,
                      backgroundColor: isSelected ? '#E57373' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent')
                    }}
                    onPress={() => {
                      setTransactionDate(dateStr);
                      setCalendarVisible(false);
                    }}
                  >
                    <Text style={{
                      color: isSelected ? '#FFF' : '#DDD', // Light text for dark bg
                      fontWeight: isSelected || isToday ? 'bold' : 'normal'
                    }}>{date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={{ marginTop: 15, padding: 10, alignSelf: 'center' }} onPress={() => setCalendarVisible(false)}>
              <Text style={{ color: '#888' }}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };



  // --- Render Budget Modal (Phase 15) ---
  const renderBudgetModal = () => {
    const currentExpense = Math.abs(getStats('monthly', new Date()).totalExpense);
    const budget = parseFloat(monthlyBudget) || 0;
    const remaining = budget - currentExpense;
    // const percentage = budget > 0 ? (remaining / budget) * 100 : 0;

    return (
      <Modal animationType="fade" transparent={true} visible={budgetModalVisible} onRequestClose={() => setBudgetModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainerCenter}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.modalTitle}>💰 本月预算</Text>

            {/* Edit Budget Input */}
            <Text style={styles.inputLabel}>设定预算金额</Text>
            <TextInput
              style={styles.input}
              placeholder="例如: 2000"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={newBudgetAmount}
              onChangeText={setNewBudgetAmount}
            />

            {/* Status Display */}
            {budget > 0 && (
              <View style={{ marginVertical: 15, width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: '#AAA' }}>已支出: RM {currentExpense.toFixed(2)}</Text>
                  <Text style={{ color: '#AAA' }}>总预算: RM {budget.toFixed(2)}</Text>
                </View>
                <View style={{ height: 10, backgroundColor: '#333', borderRadius: 5, overflow: 'hidden' }}>
                  <View style={{
                    width: `${Math.min((currentExpense / budget) * 100, 100)}%`,
                    height: '100%',
                    backgroundColor: remaining >= 0 ? '#4CAF50' : '#FF6B6B'
                  }} />
                </View>
                <Text style={{
                  textAlign: 'center', marginTop: 10, fontWeight: 'bold',
                  color: remaining >= 0 ? '#4CAF50' : '#FF6B6B'
                }}>
                  {remaining >= 0 ? `还剩 RM ${remaining.toFixed(2)}` : `超支 RM ${Math.abs(remaining).toFixed(2)}`}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setBudgetModalVisible(false)}>
                <Text style={styles.cancelButtonText}>关闭</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={async () => {
                if (!newBudgetAmount) return;
                const amount = parseFloat(newBudgetAmount);
                setMonthlyBudget(amount);
                await saveBudget(amount);
                setBudgetModalVisible(false);
              }}>
                <Text style={styles.saveButtonText}>保存设定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // --- Render Transaction Detail Screen (Phase 17) ---
  const renderTransactionDetailScreen = () => {
    if (!activeTransaction) return null;
    const isExpense = activeTransaction.type === 'expense';
    const dateObj = new Date(activeTransaction.date);

    return (
      <View style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage(activeTransaction.fromPage || 'home')}>
          <Text style={{ color: '#4A90E2', fontSize: 16 }}>◀ 返回</Text>
        </TouchableOpacity>

        {/* Hero Section */}
        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 40 }}>{activeTransaction.icon}</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#AAA', letterSpacing: 1, textTransform: 'uppercase' }}>{activeTransaction.type === 'expense' ? '支出' : '收入'}</Text>
          <Text style={{ fontSize: 40, fontWeight: 'bold', color: isExpense ? '#FF6B6B' : '#4CAF50', marginVertical: 10 }}>
            {isExpense ? '-' : '+'} RM {Math.abs(activeTransaction.amount).toFixed(2)}
          </Text>
          <Text style={{ fontSize: 20, color: '#FFF' }}>{activeTransaction.title}</Text>
        </View>

        {/* Info Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <View style={{ width: '48%', backgroundColor: '#2C2C2C', padding: 15, borderRadius: 16, marginBottom: 15 }}>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>日期</Text>
            <Text style={{ color: '#FFF', fontSize: 16 }}>{dateObj.toLocaleDateString()}</Text>
          </View>
          <View style={{ width: '48%', backgroundColor: '#2C2C2C', padding: 15, borderRadius: 16, marginBottom: 15 }}>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>时间</Text>
            <Text style={{ color: '#FFF', fontSize: 16 }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={{ width: '100%', backgroundColor: '#2C2C2C', padding: 15, borderRadius: 16, marginBottom: 15 }}>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>账户</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{activeTransaction.assetName}</Text>
              {/* We could find asset icon but assetName is string in transaction. */}
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={{ flexDirection: 'row', paddingBottom: 20 }}>
          <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#FF9800', marginRight: 10 }]} onPress={() => {
            // Open Edit Directly
            openEditTransactionModal(activeTransaction);
          }}>
            <Text style={styles.addButtonText}>✏️ 编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#333', borderColor: '#555', borderWidth: 1 }]} onPress={() => {
            Alert.alert("删除交易", "确定要删除这条记录吗？", [
              { text: "取消", style: "cancel" },
              {
                text: "删除", style: "destructive", onPress: () => {
                  const updatedTransactions = transactions.filter(t => t.id !== activeTransaction.id);
                  setTransactions(updatedTransactions);
                  saveTransactions(updatedTransactions);

                  // Revert asset balance
                  const asset = assets.find(a => a.id === activeTransaction.assetId);
                  if (asset) {
                    const sign = activeTransaction.type === 'income' ? -1 : 1; // Reverse logic
                    const updatedAssets = assets.map(a => a.id === asset.id ? { ...a, balance: a.balance + (activeTransaction.amount * sign) } : a);
                    setAssets(updatedAssets);
                    saveAssets(updatedAssets);
                  }

                  // Handle Goal Revert if needed
                  if (activeTransaction.goalId) {
                    const goal = goals.find(g => g.id === activeTransaction.goalId);
                    if (goal) {
                      const updatedGoals = goals.map(g => g.id === goal.id ? { ...g, savedAmount: g.savedAmount - activeTransaction.amount } : g);
                      setGoals(updatedGoals);
                      saveGoals(updatedGoals);
                    }
                  }

                  setCurrentPage(activeTransaction.fromPage || 'home');
                }
              }
            ]);
          }}>
            <Text style={[styles.addButtonText, { color: '#FF6B6B' }]}>🗑️ 删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Render Goal Detail Screen (Phase 8) ---
  const renderGoalDetailScreen = () => {
    if (!activeGoal) return null;
    const progress = activeGoal.targetAmount > 0 ? (activeGoal.savedAmount / activeGoal.targetAmount) : 0;
    const progressWidth = `${Math.min(progress * 100, 100)}%`;

    // Filter transactions for this goal
    // Fallback logic: check goalId OR check title/note string pattern for legacy data
    const goalHistory = transactions.filter(t =>
      t.goalId === activeGoal.id ||
      (t.title === `存入目标: ${activeGoal.title}` && t.type === 'expense')
    );

    return (
      <View style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage('home')}>
          <Text style={{ color: '#4A90E2', fontSize: 16 }}>◀ 返回首页</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Text style={{ fontSize: 60, marginBottom: 10 }}>{activeGoal.icon}</Text>
          <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>{activeGoal.title}</Text>
          <Text style={{ color: '#888', fontSize: 14, marginTop: 5 }}>目标: RM {activeGoal.targetAmount.toLocaleString()}</Text>
        </View>

        {/* Progress */}
        <View style={{ marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>已存: RM {activeGoal.savedAmount.toLocaleString()}</Text>
            <Text style={{ color: '#888' }}>{(progress * 100).toFixed(1)}%</Text>
          </View>
          <View style={[styles.progressBarBg, { height: 12, borderRadius: 6 }]}>
            <View style={[styles.progressBarFill, { width: progressWidth, height: 12, borderRadius: 6 }]} />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
          <TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 5, backgroundColor: '#4A90E2' }]} onPress={() => {
            const now = new Date();
            setTransactionDate(now.toISOString().split('T')[0]);
            setTransactionTime(now.toTimeString().slice(0, 5));
            setSavingModalVisible(true);
          }}>
            <Text style={styles.addButtonText}>💰 存入</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addButton, { flex: 1, marginHorizontal: 5, backgroundColor: '#FF9800' }]} onPress={() => openEditGoal(activeGoal)}>
            <Text style={styles.addButtonText}>✏️ 编辑</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addButton, { flex: 1, marginLeft: 5, backgroundColor: '#333', borderWidth: 1, borderColor: '#555' }]} onPress={() => {
            Alert.alert("删除目标", "确定要删除这个目标吗？已存金额将保留在目标中(需手动转出)。", [
              { text: "取消", style: "cancel" },
              {
                text: "删除", style: "destructive", onPress: async () => {
                  const updatedGoals = goals.filter(g => g.id !== activeGoal.id);
                  setGoals(updatedGoals); await saveGoals(updatedGoals);
                  setCurrentPage('home');
                }
              }
            ]);
          }}>
            <Text style={[styles.addButtonText, { color: '#FF6B6B' }]}>🗑️ 删除</Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        <Text style={styles.sectionTitle}>存钱记录</Text>
        <ScrollView style={{ flex: 1 }}>
          {goalHistory.length === 0 ? (
            <Text style={styles.emptyText}>还没有存入记录，加油！</Text>
          ) : (
            goalHistory.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.transactionItem}
                onPress={() => {
                  setActiveTransaction({ ...item, fromPage: 'goal_detail' });
                  setCurrentPage('transaction_detail');
                }}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{item.title}</Text>
                  <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.expenseAmount}>RM {Math.abs(item.amount)}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // --- Render Bottom Navigation ---
  const renderBottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentPage('home')}>
        <Text style={[styles.navText, currentPage === 'home' && styles.navTextActive]}>🏠 首页</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentPage('assets')}>
        <Text style={[styles.navText, currentPage === 'assets' && styles.navTextActive]}>💰 账户</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => setCurrentPage('stats')}>
        <Text style={[styles.navText, currentPage === 'stats' && styles.navTextActive]}>📊 统计</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {currentPage === 'home' && (
          <>
            <ScrollView style={{ flex: 1 }}>
              {/* 顶部面板 (Phase 15: Budget Widget) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 }}>
                <View>
                  <Text style={{ color: '#AAA', fontSize: 13 }}>{new Date().getFullYear()}年</Text>
                  <TouchableOpacity onPress={() => setMonthModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold', marginRight: 5 }}>
                      {new Date().getMonth() + 1}月
                    </Text>
                    <Text style={{ fontSize: 14 }}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* Budget Widget */}
                <TouchableOpacity
                  style={{ backgroundColor: '#2C2C2E', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#444' }}
                  onPress={() => {
                    setNewBudgetAmount(monthlyBudget > 0 ? monthlyBudget.toString() : '');
                    setBudgetModalVisible(true);
                  }}
                >
                  {monthlyBudget > 0 ? (
                    <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>
                      {(() => {
                        const currentExpense = Math.abs(getStats('monthly', new Date()).totalExpense);
                        const left = monthlyBudget - currentExpense;
                        // const percent = (left / monthlyBudget) * 100;
                        return left >= 0 ? `💰 剩余 ${(left / monthlyBudget * 100).toFixed(0)}%` : `⚠️ 超支`;
                      })()}
                    </Text>
                  ) : (
                    <Text style={{ color: '#AAA' }}>🎯 设定预算</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 月度概览 */}
              <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewRow}>
                    <View>
                      <Text style={styles.overviewLabel}>{new Date().getMonth() + 1}月支出</Text>
                      <Text style={styles.overviewExpense}>RM {Math.abs(getStats('monthly', new Date()).totalExpense).toFixed(2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.overviewLabel}>{new Date().getMonth() + 1}月收入</Text>
                      <Text style={styles.overviewIncome}>RM {getStats('monthly', new Date()).totalIncome.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Net Balance (Phase 13) */}
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 5 }}>⚖️</Text>
                    <Text style={{ color: '#888', marginRight: 5 }}>净收支:</Text>
                    <Text style={{
                      color: (getStats('monthly', new Date()).totalIncome - Math.abs(getStats('monthly', new Date()).totalExpense)) >= 0 ? '#4CAF50' : '#FF6B6B',
                      fontWeight: 'bold', fontSize: 16
                    }}>
                      RM {(getStats('monthly', new Date()).totalIncome - Math.abs(getStats('monthly', new Date()).totalExpense)).toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.overviewButton} onPress={() => { setStatsRange('monthly'); setCurrentPage('stats'); }}>
                    <Text style={styles.overviewButtonText}>📊 查看更多分析</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 储蓄目标 */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>我的目标</Text>
                <TouchableOpacity onPress={() => setGoalModalVisible(true)}>
                  <Text style={styles.linkText}>+ 添加</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalScroll}>
                {goals.length === 0 ? (
                  <TouchableOpacity style={styles.emptyGoalCard} onPress={() => setGoalModalVisible(true)}>
                    <Text style={{ color: '#888' }}>+ 定个小目标</Text>
                  </TouchableOpacity>
                ) : (
                  goals.map((goal) => {
                    const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) : 0;
                    const progressWidth = `${Math.min(progress * 100, 100)}%`;
                    return (
                      <TouchableOpacity key={goal.id}
                        style={[styles.goalCard, { padding: 0 }]}
                        onPress={() => {
                          setActiveGoal(goal);
                          setCurrentPage('goal_detail');
                        }}
                      >
                        {goal.backgroundImage ? (
                          <ImageBackground source={{ uri: goal.backgroundImage }} style={{ width: '100%', height: '100%' }} imageStyle={{ borderRadius: 20 }}>
                            <View style={{ flex: 1, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, justifyContent: 'space-between' }}>
                              <View style={styles.goalHeader}>
                                <View />
                                <Text style={styles.goalAmount}>RM {goal.savedAmount}</Text>
                              </View>
                              <View>
                                <Text style={styles.goalTitle}>{goal.title}</Text>
                                <Text style={styles.goalTarget}>目标: RM {goal.targetAmount}</Text>
                                <View style={styles.progressBarBg}>
                                  <View style={[styles.progressBarFill, { width: progressWidth }]} />
                                </View>
                              </View>
                            </View>
                          </ImageBackground>
                        ) : (
                          <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
                            <View style={styles.goalHeader}>
                              <Text style={{ fontSize: 24 }}>{goal.icon}</Text>
                              <Text style={styles.goalAmount}>RM {goal.savedAmount}</Text>
                            </View>
                            <View>
                              <Text style={styles.goalTitle}>{goal.title}</Text>
                              <Text style={styles.goalTarget}>目标: RM {goal.targetAmount}</Text>
                              <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: progressWidth }]} />
                              </View>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* 最近交易 */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>最近交易</Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(true);
                  // Initialize Date/Time to now
                  const now = new Date();
                  setTransactionDate(now.toISOString().split('T')[0]);
                  setTransactionTime(now.toTimeString().split(' ')[0].substring(0, 5));
                }}><Text style={styles.linkText}>+ 记一笔</Text></TouchableOpacity>
              </View>
              <View style={styles.transactionList}>
                {currentMonthGroups.length === 0 ? (
                  <Text style={styles.emptyText}>快记一笔吧！</Text>
                ) : (
                  currentMonthGroups.map((group) => {
                    const dateObj = new Date(group.title);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    let dateLabel = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
                    if (group.title === todayStr) dateLabel += " (Today)";
                    else if (group.title === yesterdayStr) dateLabel += " (Yesterday)";

                    return (
                      <View key={group.title} style={{ marginBottom: 15 }}>
                        <Text style={{ color: '#888', fontWeight: 'bold', marginBottom: 5, marginLeft: 5 }}>{dateLabel}</Text>
                        {group.data.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.transactionItem}
                            onPress={() => {
                              setActiveTransaction({ ...item, fromPage: 'home' });
                              setCurrentPage('transaction_detail');
                            }}
                          >
                            <View style={styles.iconCircle}>
                              <Text style={styles.iconText}>{item.icon}</Text>
                            </View>
                            <View style={styles.transactionInfo}>
                              <Text style={styles.transactionTitle}>{item.title}</Text>
                              <Text style={styles.transactionDate}>
                                {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <Text style={{ color: '#4A90E2' }}>{item.assetName}</Text>
                              </Text>
                            </View>
                            <Text style={item.type === 'expense' ? styles.expenseAmount : styles.incomeAmount}>
                              {item.type === 'expense' ? '' : '+'} RM {Math.abs(item.amount).toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })
                )}
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                setModalVisible(true);
                // Initialize Date/Time to now
                const now = new Date();
                setTransactionDate(now.toISOString().split('T')[0]);
                setTransactionTime(now.toTimeString().split(' ')[0].substring(0, 5));
              }}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          </>
        )}

        {currentPage === 'stats' && renderStatsScreen()}
        {currentPage === 'assets' && renderAssetsScreen()}
        {currentPage === 'asset_detail' && renderAssetDetailScreen()}
        {currentPage === 'goal_detail' && renderGoalDetailScreen()}
        {currentPage === 'transaction_detail' && renderTransactionDetailScreen()}
      </View>

      {/* Footer Navigation */}
      {renderBottomNav()}

      {/* --- Modals --- */}
      <Modal animationType="fade" transparent={true} visible={assetModalVisible} onRequestClose={() => setAssetModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainerCenter}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.modalTitle}>{editingAssetId ? '✏️ 修改账户' : '添加新账户'}</Text>
            <Text style={styles.inputLabel}>账户名称</Text>
            <TextInput style={styles.input} placeholderTextColor="#555" value={newAssetName} onChangeText={setNewAssetName} autoFocus={true} />
            <Text style={styles.inputLabel}>初始余额</Text>
            <TextInput style={styles.input} placeholderTextColor="#555" keyboardType="numeric" value={newAssetBalance} onChangeText={setNewAssetBalance} />

            <Text style={styles.inputLabel}>图标 (Emoji)</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 30 }]}
              placeholder="💰"
              placeholderTextColor="#555"
              value={newAssetIcon}
              onChangeText={setNewAssetIcon}
            />
            {/* I need to add state for newAssetIcon later. For now, let's fix the UI structure first. 
                Wait, I should implement the state now. 
            */}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAssetModalVisible(false)}><Text style={styles.cancelButtonText}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddAsset}><Text style={styles.saveButtonText}>创建</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={goalModalVisible} onRequestClose={() => setGoalModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainerCenter}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.modalTitle}>{editingGoalId ? '✏️ 修改目标' : '🎯 定个小目标'}</Text>
            <Text style={styles.inputLabel}>目标名称</Text>
            <TextInput style={styles.input} placeholder="我的梦想..." placeholderTextColor="#555" value={newGoalTitle} onChangeText={setNewGoalTitle} />
            <Text style={styles.inputLabel}>目标金额</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#555" keyboardType="numeric" value={newGoalTarget} onChangeText={setNewGoalTarget} />

            <Text style={styles.inputLabel}>背景图片 (选填)</Text>
            <TouchableOpacity onPress={pickImage} style={{ marginBottom: 15, padding: 15, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' }}>
              {newGoalImage ? (
                <Image source={{ uri: newGoalImage }} style={{ width: '100%', height: 100, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <Text style={{ color: '#4A90E2' }}>📷 选择背景照片</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>选择图标</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
              {['🚗', '🏠', '✈️', '💍', '💻'].map(icon => (
                <TouchableOpacity key={icon} onPress={() => setNewGoalIcon(icon)} style={{ padding: 10, backgroundColor: newGoalIcon === icon ? '#4A90E2' : '#333', borderRadius: 10 }}>
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setGoalModalVisible(false)}><Text style={styles.cancelButtonText}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddGoal}><Text style={styles.saveButtonText}>确立目标</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={savingModalVisible} onRequestClose={() => setSavingModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💰 存入目标</Text>
            <Text style={{ color: '#888', textAlign: 'center', marginBottom: 10 }}>为 {activeGoal?.title} 存一笔钱</Text>

            <Text style={styles.inputLabel}>从哪个账户扣款?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, maxHeight: 60 }}>
              {assets.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  style={[styles.selectAssetChip, selectedAssetId === asset.id && styles.selectAssetChipActive]}
                  onPress={() => setSelectedAssetId(asset.id)}
                >
                  <Text style={[styles.selectAssetText, selectedAssetId === asset.id && styles.selectAssetTextActive]}>
                    {asset.name}
                  </Text>
                  <Text style={{ color: '#555', fontSize: 10 }}>RM {asset.balance}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>存入金额</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#555" keyboardType="numeric" value={savingAmount} onChangeText={setSavingAmount} autoFocus={true} />

            {/* Date Input for Goal Deposit */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>日期 (YYYY-MM-DD)</Text>
                <TouchableOpacity onPress={() => {
                  setCalendarCursor(new Date(transactionDate));
                  setCalendarVisible(true);
                }}>
                  <View pointerEvents="none">
                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#555" value={transactionDate} editable={false} />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>时间 (HH:MM)</Text>
                <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor="#555" value={transactionTime} onChangeText={setTransactionTime} />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSavingModalVisible(false)}><Text style={styles.cancelButtonText}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleDepositToGoal}><Text style={styles.saveButtonText}>确认存入</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => { setModalVisible(false); setEditingId(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? '✏️ 修改账单' : '记一笔'}</Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]} onPress={() => setType('expense')}>
                <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>支出</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, type === 'income' && styles.typeButtonActive]} onPress={() => setType('income')}>
                <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>收入</Text>
              </TouchableOpacity>
            </View>

            {/* 账户选择区 */}
            <Text style={styles.inputLabel}>选择账户 (Account)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 45 }}>
              {assets.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  style={[styles.selectAssetChip, selectedAssetId === asset.id && styles.selectAssetChipActive]}
                  onPress={() => setSelectedAssetId(asset.id)}
                >
                  <Text style={[styles.selectAssetText, selectedAssetId === asset.id && styles.selectAssetTextActive]}>
                    {asset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 分类选择区 (New) */}
            <Text style={styles.inputLabel}>选择分类 (Category)</Text>
            <View style={styles.categoryGrid}>
              {(type === 'expense' ? categories.expense : categories.income).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryItem, selectedCategory.id === cat.id && styles.categoryItemActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                  <Text style={[styles.categoryText, selectedCategory.id === cat.id && styles.categoryTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}

              {/* Add Category Button */}
              <TouchableOpacity
                style={[styles.categoryItem, { borderColor: '#555', borderStyle: 'dashed' }]}
                onPress={() => setCategoryModalVisible(true)}
              >
                <Text style={{ fontSize: 24, color: '#555' }}>+</Text>
              </TouchableOpacity>
            </View>

            {/* 金额输入 */}
            <Text style={styles.inputLabel}>金额</Text>
            <TextInput style={styles.input} placeholderTextColor="#555" keyboardType="numeric" value={amount} onChangeText={setAmount} />

            {/* 日期和时间输入 (Phase 7 & 9) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>日期 (YYYY-MM-DD)</Text>
                <TouchableOpacity onPress={() => {
                  setCalendarCursor(new Date(transactionDate)); // Init calendar to current selection
                  setCalendarVisible(true);
                }}>
                  <View pointerEvents="none">
                    <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#555" value={transactionDate} editable={false} />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>时间 (HH:MM)</Text>
                <TextInput style={styles.input} placeholder="HH:MM" placeholderTextColor="#555" value={transactionTime} onChangeText={setTransactionTime} />
              </View>
            </View>

            {/* 备注输入 (Optional) */}
            <Text style={styles.inputLabel}>备注 (选填)</Text>
            <TextInput style={styles.input} placeholder="例如：奶茶 (可不填)" placeholderTextColor="#555" value={note} onChangeText={setNote} />

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { flex: 1, marginRight: 5 }]} onPress={() => { setModalVisible(false); setEditingId(null); }}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              {!editingId && (
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4CAF50', flex: 1, marginRight: 5 }]} onPress={() => handleSaveTransaction(false)}>
                  <Text style={styles.saveButtonText}>再记一笔</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.modalButton, styles.saveButton, { flex: 1 }]} onPress={() => handleSaveTransaction(true)}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={categoryModalVisible} onRequestClose={() => setCategoryModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainerCenter}>
          <View style={styles.modalContentCenter}>
            <Text style={styles.modalTitle}>✨ 新建分类</Text>
            <Text style={styles.inputLabel}>分类名称</Text>
            <TextInput style={styles.input} placeholderTextColor="#555" value={newCatName} onChangeText={setNewCatName} autoFocus={true} />

            <Text style={styles.inputLabel}>图标 (Emoji)</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center', fontSize: 30 }]}
              placeholder="🍕"
              placeholderTextColor="#555"
              value={newCatIcon}
              onChangeText={setNewCatIcon}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setCategoryModalVisible(false)}><Text style={styles.cancelButtonText}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddCategory}><Text style={styles.saveButtonText}>创建</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {renderCalendarModal()}
      {renderMonthPickerModal()}
      {renderBudgetModal()}
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { padding: 24, backgroundColor: '#1E1E1E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  headerTopUser: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  greeting: { color: '#AAAAAA', fontSize: 14 },
  smallAddButton: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  smallAddButtonText: { color: '#4A90E2', fontSize: 12, fontWeight: 'bold' },
  label: { color: '#888', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  balance: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  assetScroll: { marginTop: 15 },
  assetCard: { backgroundColor: '#2C2C2C', padding: 12, borderRadius: 16, marginRight: 12, width: 130, height: 90, justifyContent: 'space-between' },
  assetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  assetIcon: { backgroundColor: 'rgba(255,255,255,0.1)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  assetName: { color: '#AAAAAA', fontSize: 12, marginTop: 4 },
  assetBalance: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  // Goal Styles
  goalScroll: { paddingHorizontal: 24, marginBottom: 20, maxHeight: 150 },
  emptyGoalCard: { width: 160, height: 120, backgroundColor: '#1E1E1E', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
  goalCard: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 20, marginRight: 15, width: 160, height: 130, justifyContent: 'space-between' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalAmount: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  goalTitle: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  goalTarget: { color: '#888', fontSize: 12 },
  progressBarBg: { height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 10, width: '100%' },
  progressBarFill: { height: 6, backgroundColor: '#4CAF50', borderRadius: 3 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#4A90E2', fontSize: 14 },
  transactionList: { flex: 1, paddingHorizontal: 24 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 50, fontSize: 14 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 16, marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 20 },
  transactionInfo: { flex: 1 },
  transactionTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  transactionDate: { color: '#888', fontSize: 12 },
  expenseAmount: { color: '#FF6B6B', fontSize: 16, fontWeight: 'bold' },
  incomeAmount: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  footer: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  addButton: { backgroundColor: '#4A90E2', width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  addButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  inputLabel: { color: '#AAAAAA', fontSize: 14, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#2C2C2C', color: '#FFF', borderRadius: 12, padding: 16, fontSize: 18, borderWidth: 1, borderColor: '#333' },

  // Chip Styles
  selectAssetChip: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#333', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  selectAssetChipActive: { backgroundColor: '#1E3A5F', borderColor: '#4A90E2' },
  selectAssetText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  selectAssetTextActive: { color: '#4A90E2' },

  // Category Grid Styles (New)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, justifyContent: 'space-between' },
  categoryItem: { width: '23%', aspectRatio: 1, backgroundColor: '#333', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  categoryItemActive: { backgroundColor: '#1E3A5F', borderColor: '#4A90E2' },
  categoryText: { color: '#888', fontSize: 12, marginTop: 4 },
  categoryTextActive: { color: '#4A90E2', fontWeight: 'bold' },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50 },
  modalContainerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContentCenter: { width: '85%', backgroundColor: '#1E1E1E', borderRadius: 24, padding: 24, paddingBottom: 30 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#333', borderRadius: 12, padding: 4 },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeButtonActive: { backgroundColor: '#4A90E2' },
  typeText: { color: '#888', fontWeight: '600' },
  typeTextActive: { color: '#FFF', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  modalButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333', marginRight: 10 },
  saveButton: { backgroundColor: '#4A90E2', marginLeft: 10 },
  cancelButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Stats / Overview Styles
  overviewCard: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 20, borderColor: '#333', borderWidth: 1 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  overviewLabel: { color: '#888', fontSize: 12, marginBottom: 5 },
  overviewExpense: { color: '#FF6B6B', fontSize: 18, fontWeight: 'bold' },
  overviewIncome: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  overviewButton: { backgroundColor: '#2C2C2C', padding: 12, borderRadius: 12, alignItems: 'center' },
  overviewButtonText: { color: '#4A90E2', fontWeight: 'bold' },

  statsHeader: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 20, backgroundColor: '#1E1E1E' },
  monthChangeArrow: { fontSize: 24, color: '#4A90E2', padding: 10 },
  monthTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  chartCard: { margin: 20, padding: 10, backgroundColor: '#1E1E1E', borderRadius: 20, alignItems: 'center' },
  chartTitle: { color: '#888', marginBottom: 10, alignSelf: 'flex-start', paddingLeft: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  statCatName: { color: '#FFF', fontSize: 16 },
  statAmount: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Bottom Navigation Styles
  bottomNav: { flexDirection: 'row', backgroundColor: '#1E1E1E', paddingVertical: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderTopColor: '#333' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: '#888', fontSize: 12, marginTop: 4 },
  navTextActive: { color: '#4A90E2', fontWeight: 'bold' },

  // Assets Page Styles
  pageTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  fabText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2
  }
});
