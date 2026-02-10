import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback, ScrollView, SafeAreaView, Platform, Modal, TextInput, KeyboardAvoidingView, Alert, Dimensions, ImageBackground, Image, Animated } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, LineChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as QuickActions from 'expo-quick-actions';
// import { requestWidgetUpdate } from 'react-native-android-widget';
// import { InfoWidget } from './widgets/InfoWidget';
import { supabase } from './lib/supabase';
import { SyncService } from './lib/SyncService';
import AuthScreen from './screens/AuthScreen';

// --- 预设分类数据 ---
const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'food', name: '餐饮', icon: '🍔', color: '#FF9F43' }, // Orange
    { id: 'transport', name: '交通', icon: '🚕', color: '#54A0FF' }, // Blue
    { id: 'shopping', name: '购物', icon: '🛍️', color: '#FF6B6B' }, // Pink/Red
    { id: 'entertainment', name: '娱乐', icon: '🎮', color: '#5F27CD' }, // Purple
    { id: 'housing', name: '居住', icon: '🏠', color: '#48DBFB' }, // Cyan
    { id: 'medical', name: '医疗', icon: '💊', color: '#EE5253' }, // Red
    { id: 'transfer', name: '转账', icon: '↔️', color: '#8E44AD' }, // Purple (Transfer)
    { id: 'other', name: '其他', icon: '💸', color: '#8395A7' }, // Grey
  ],
  income: [
    { id: 'salary', name: '工资', icon: '💰', color: '#10AC84' }, // Green
    { id: 'invest', name: '理财', icon: '📈', color: '#F3CA20' }, // Gold
    { id: 'parttime', name: '兼职', icon: '⚡', color: '#22A6B3' }, // Teal
    { id: 'transfer', name: '转账', icon: '↔️', color: '#8E44AD' }, // Purple (Transfer)
    { id: 'other', name: '其他', icon: '💵', color: '#8395A7' }, // Grey
  ]
};

// --- Theme Definition (Phase 18) ---
const theme = {
  colors: {
    background: '#0F172A', // Deep Navy (Main BG)
    surface: '#1E293B',    // Lighter Navy (Cards)
    surfaceHighlight: '#334155', // Pressed/Active
    primary: '#6366F1',    // Indigo (Actions)
    secondary: '#64748B',  // Grey (Inactive)
    success: '#10B981',    // Emerald (Income)
    danger: '#EF4444',     // Red (Expense)
    text: '#F8FAFC',       // White (Primary Text)
    textSecondary: '#94A3B8', // Light Grey (Secondary Text)
    border: '#334155',     // Borders
  },
  spacing: { s: 8, m: 16, l: 24 },
  borderRadius: 20,
};


// --- Reusable ScaleButton (Phase 16) ---

const FadeInView = (props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;  // Initial value for opacity: 0
  const slideAnim = useRef(new Animated.Value(20)).current; // Initial value for translateY: 20

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View                 // Special animatable View
      style={{
        ...props.style,
        opacity: fadeAnim,         // Bind opacity to animated value
        transform: [{ translateY: slideAnim }] // Bind transform
      }}
    >
      {props.children}
    </Animated.View>
  );
}


const ScaleButton = ({ onPress, style, children }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};



const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  return (
    <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '80%', backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10, textAlign: 'center' }}>{title}</Text>
          <Text style={{ fontSize: 16, color: theme.colors.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 22 }}>{message}</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: btn.style === 'destructive' ? 'rgba(239, 68, 68, 0.2)' : (btn.style === 'cancel' ? theme.colors.surfaceHighlight : theme.colors.primary),
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginLeft: index > 0 ? 10 : 0,
                  alignItems: 'center',
                  borderWidth: btn.style === 'cancel' ? 1 : 0,
                  borderColor: theme.colors.border
                }}
                onPress={() => {
                  if (btn.onPress) btn.onPress();
                  onClose();
                }}
              >
                <Text style={{
                  color: btn.style === 'destructive' ? theme.colors.danger : (btn.style === 'cancel' ? theme.colors.textSecondary : '#FFF'),
                  fontWeight: 'bold', fontSize: 16
                }}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};


export default function App() {

  // --- Custom Alert State (Phase 24) ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', buttons: [] });

  // --- Auth State (Phase 27) ---
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handleInitialSync(session.user.id);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) handleInitialSync(session.user.id);
    });
  }, []);

  const handleInitialSync = async (userId) => {
    const hasSynced = await AsyncStorage.getItem('@first_sync_complete');
    if (hasSynced) return; // Already migrated

    // Simple strategy: Check if we have local transactions
    const localData = await AsyncStorage.getItem(STORAGE_KEY);
    const hasLocalData = localData && JSON.parse(localData).length > 0;

    if (hasLocalData) {
      // Local exists -> Upload to Cloud (Backup)
      const res = await SyncService.uploadLocalDataToCloud(userId);
      if (res.success) {
        Alert.alert("Cloud Backup", "Your local data has been safely backed up to the cloud!");
        await AsyncStorage.setItem('@first_sync_complete', 'true');
      }
    } else {
      // No local -> Try to download (Restore)
      const res = await SyncService.pullDataFromCloud(userId);
      if (res.success && res.count > 0) {
        Alert.alert("Data Restored", `Downloaded ${res.count} transactions from cloud.`);
        // Reload data to UI
        loadData();
        await AsyncStorage.setItem('@first_sync_complete', 'true');
      }
    }
  };

  const showAlert = (title, message, buttons = [{ text: 'OK', onPress: () => { } }]) => {
    // Normalize buttons if strictly native API format was used (text, style, onPress)
    const formattedButtons = buttons.map(b => ({
      text: b.text || 'OK',
      onPress: b.onPress,
      style: b.style || 'default'
    }));
    setAlertConfig({ title, message, buttons: formattedButtons });
    setAlertVisible(true);
  };

  // --- 1. 核心状态管理 ---
  const [modalVisible, setModalVisible] = useState(false); // 记账弹窗
  const [assetModalVisible, setAssetModalVisible] = useState(false); // 资产弹窗
  const [goalModalVisible, setGoalModalVisible] = useState(false); // 目标弹窗

  // 页面导航 & 统计状态
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'stats'
  const [currentMonth, setCurrentMonth] = useState(new Date()); // 用于统计筛选月份
  const [statsRange, setStatsRange] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'
  const [statsType, setStatsType] = useState('expense'); // 'expense' | 'income'

  // 记账输入状态
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense'); // 'expense', 'income', 'transfer'
  const [selectedAssetId, setSelectedAssetId] = useState(null); // 'From' Asset
  const [toAssetId, setToAssetId] = useState(null); // 'To' Asset
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

  // --- Smart Features: Quick Actions (Phase 18) ---
  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    QuickActions.setItems([
      {
        title: "吃饭 (Food)",
        subtitle: "快速记录餐饮",
        icon: "compose",
        id: "quick_food",
        params: { categoryId: 'food' },
      },
      {
        title: "交通 (Transport)",
        subtitle: "快速记录交通",
        icon: "car",
        id: "quick_transport",
        params: { categoryId: 'transport' },
      },
      {
        title: "奶茶 (Bubble Tea)",
        subtitle: "续命水 🥤",
        icon: "heart",
        id: "quick_tea",
        params: { categoryId: 'food', note: '奶茶' },
      },
    ]);

    const subscription = QuickActions.addListener((action) => {
      // Small delay to ensure app loads
      setTimeout(() => {
        setModalVisible(true);
        if (action.params) {
          if (action.params.categoryId) {
            const cat = DEFAULT_CATEGORIES.expense.find(c => c.id === action.params.categoryId);
            if (cat) setSelectedCategory(cat);
          }
          if (action.params.note) setNote(action.params.note);
        }
      }, 500);
    });

    return () => subscription.remove();
  }, []);

  // 新增分类状态
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  // 备注弹窗状态 (Phase 20)
  const [remarkModalVisible, setRemarkModalVisible] = useState(false);
  const remarkInputRef = useRef(null);

  useEffect(() => {
    if (remarkModalVisible) {
      // Delay focus to ensure modal animation completes
      setTimeout(() => {
        remarkInputRef.current?.focus();
      }, 300);
    }
  }, [remarkModalVisible]);
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
  const LAST_USED_ASSET_KEY = '@my_budget_last_asset';

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

      // Restore Last Used Asset
      const lastAssetId = await AsyncStorage.getItem(LAST_USED_ASSET_KEY);
      if (lastAssetId) {
        const id = parseInt(lastAssetId);
        if (loadedAssets.find(a => a.id === id)) {
          setSelectedAssetId(id);
        }
      }

      const goalsJson = await AsyncStorage.getItem(GOALS_KEY);
      if (goalsJson) setGoals(JSON.parse(goalsJson));

      const budgetJson = await AsyncStorage.getItem(BUDGET_KEY); // Load Budget
      if (budgetJson) setMonthlyBudget(parseFloat(budgetJson));

    } catch (e) {
      console.error("加载失败", e);
    }
  };

  const saveTransactions = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      updateWidgets(data, monthlyBudget);
    } catch (e) { }
  };
  const saveAssets = async (data) => { try { await AsyncStorage.setItem(ASSETS_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveGoals = async (data) => { try { await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveCategories = async (data) => { try { await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data)); } catch (e) { } };
  const saveBudget = async (amount) => {
    try {
      await AsyncStorage.setItem(BUDGET_KEY, amount.toString());
      updateWidgets(transactions, amount);
    } catch (e) { }
  };

  // --- Widget Update Helper ---
  const updateWidgets = async () => {
    // try {
    //   // Calculate Today's Expense
    //   const todayStr = new Date().toISOString().split('T')[0];
    //   const todayExpense = transactions
    //     .filter(t => t.type === 'expense' && t.date.startsWith(todayStr))
    //     .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    //   // Get Budget
    //   const budgetVal = monthlyBudget || 0;
    //   const currentMonthStr = new Date().toISOString().substring(0, 7);
    //   const monthExpense = transactions
    //     .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr))
    //     .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    //   const remaining = budgetVal - monthExpense;

    //   requestWidgetUpdate({
    //     widgetName: 'InfoWidget',
    //     renderWidget: () => <InfoWidget expense={todayExpense.toFixed(2)} budget={remaining.toFixed(2)} theme="dark" />,
    //     widgetClassName: 'InfoWidget',
    //   });
    // } catch (e) {
    //   console.log("Widget Update Failed (Non-Native Mode):", e);
    // }
  };

  // --- 计算总资产 (Assets + Goals) ---
  const totalAssetBalance = assets.reduce((acc, item) => acc + parseFloat(item.balance), 0) +
    goals.reduce((acc, item) => acc + parseFloat(item.savedAmount), 0);

  // --- 统计计算 Helper ---
  // --- 统计计算 Helper ---
  // --- Helper: Get Statistics (Phase 4 & 22) ---
  const getStats = (range = 'monthly', date = currentMonth, type = 'expense') => {
    let filtered = transactions.filter(t => t.type === type); // Filter by type first

    const rangeDate = new Date(date);
    if (range === 'weekly') {
      // Logic for weekly range (simplified for now: match ISO week or just strictly > 7 days ago?)
      // Keeping it simple: Filter by date string >= 7 days ago
      // Actually let's just stick to the current month logic for simplicity first, or reuse existing logic if robust.
      // Existing logic was: `t.date.startsWith...`
      // Let's implement robust Weekly/Monthly/Yearly

      const start = new Date(rangeDate);
      start.setDate(start.getDate() - 7); // Last 7 days
      filtered = filtered.filter(t => new Date(t.date) >= start && new Date(t.date) <= rangeDate);

    } else if (range === 'monthly') {
      const y = rangeDate.getFullYear();
      const m = rangeDate.getMonth();
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    } else if (range === 'yearly') {
      const y = rangeDate.getFullYear();
      filtered = filtered.filter(t => new Date(t.date).getFullYear() === y);
    }

    const total = filtered.reduce((acc, t) => acc + Math.abs(t.amount), 0);

    // Group by Category
    const categoryMap = {};
    filtered.forEach(t => {
      const catId = t.categoryId || 'uncategorized';
      // Find category info
      let catName = '未分类';
      let catColor = '#CCC';
      let catIcon = '❓';

      if (t.categoryId) {
        // Search in both expense and income to find match
        const allCats = [...categories.expense, ...categories.income];
        const c = allCats.find(c => c.id === t.categoryId);
        if (c) {
          catName = c.name;
          catColor = c.color;
          catIcon = c.icon;
        }
      } else {
        catName = t.title || '其他';
      }

      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          name: catName,
          population: 0,
          color: catColor,
          icon: catIcon,
          legendFontColor: "#7F7F7F",
          legendFontSize: 15
        };
      }
      categoryMap[catId].population += Math.abs(t.amount);
    });

    const pieData = Object.values(categoryMap)
      .sort((a, b) => b.population - a.population);

    return { total, pieData };
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
      amount: amountVal, // Store as positive (logic handles deduction)
      icon: '🎯',
      type: 'transfer',
      subType: 'goal_deposit',
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

  // --- E. 删除交易 (Phase 19) ---
  // --- E. 删除交易 (Phase 19 & 27) ---
  const handleDeleteTransaction = async (targetItem) => {
    const target = targetItem || activeTransaction;
    if (!target) return;

    // 1. 从资产中退回金额
    if (target.assetId) {
      const assetIndex = assets.findIndex(a => a.id === target.assetId);
      if (assetIndex !== -1) {
        const updatedAssets = [...assets];
        updatedAssets[assetIndex].balance -= target.amount;
        setAssets(updatedAssets);
        await saveAssets(updatedAssets);
      }
    }

    // 2. 从交易列表中删除
    const updatedTransactions = transactions.filter(t => t.id !== target.id);
    setTransactions(updatedTransactions);
    await saveTransactions(updatedTransactions);

    // 3. 如果是目标存款，从目标中扣除
    if (target.goalId && target.subType === 'goal_deposit') {
      const updatedGoals = goals.map(g => {
        if (g.id === target.goalId) {
          return { ...g, savedAmount: g.savedAmount - Math.abs(target.amount) };
        }
        return g;
      });
      setGoals(updatedGoals);
      await saveGoals(updatedGoals);
    }

    // Shadow Sync (Cloud)
    if (session) SyncService.deleteTransaction(target.id, session.user.id);

    // UI Cleanup
    setModalVisible(false);
    setActiveTransaction(null);
    showAlert("已删除", `资金已退回到 ${target.assetName}`);
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
    if (!selectedAssetId) { showAlert("提示", "请选择支付账户"); return; }

    // --- Smart Feature: Calculator (Phase 20) ---
    // Allow simple math inputs like "10+5" or "20-2"
    let transAmount = 0;
    try {
      // Safe simplistic eval for basic math
      const cleanInput = amount.replace(/[^0-9+\-*/.]/g, '');
      // check if it's just a number
      if (!isNaN(parseFloat(cleanInput)) && isFinite(cleanInput)) {
        transAmount = parseFloat(cleanInput);
      } else {
        // It has math symbols. 
        // Note: eval() is generally unsafe but strict regex above prevents malicious code. 
        // For a safer approach without eval, we'd write a parser. Given requirements, let's use a Function constructor for basic math.
        transAmount = new Function('return ' + cleanInput)();
      }
    } catch (e) {
      showAlert("Error", "Invalid Amount."); return;
    }

    // const transAmount = parseFloat(amount); // Replaced by logic above
    const finalAmount = type === 'expense' ? -transAmount : transAmount;

    // 准备新数据
    const selectedAsset = assets.find(a => a.id === selectedAssetId);
    if (!selectedAsset) return;

    let updatedAssets = [...assets];
    let updatedTransactions = [...transactions];

    // 如果没有填备注，就用分类名称代替 (例如 "餐饮")
    const displayTitle = note || (type === 'transfer' ? '转账' : selectedCategory.name);

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
      if (type === 'transfer') {
        // === 处理转账 (Internal Transfer) ===
        if (!toAssetId) { showAlert("提示", "请选择转入账户"); return; }

        const fromAssetIndex = updatedAssets.findIndex(a => a.id === selectedAssetId);
        const toAssetIndex = updatedAssets.findIndex(a => a.id === toAssetId);

        if (fromAssetIndex !== -1 && toAssetIndex !== -1) {
          updatedAssets[fromAssetIndex].balance -= transAmount; // Deduct from Source
          updatedAssets[toAssetIndex].balance += transAmount;   // Add to Dest

          const newTransaction = {
            id: Date.now(),
            title: displayTitle || '转账',
            date: new Date(`${transactionDate}T${transactionTime}:00`).toISOString(),
            amount: transAmount, // Transfers are positive numbers
            icon: '↔️',
            type: 'transfer',
            subType: 'internal',
            assetName: selectedAsset.name, // From Asset Name
            assetId: selectedAsset.id,
            toAssetId: toAssetId,
            toAssetName: updatedAssets[toAssetIndex].name,
            categoryId: 'transfer'
          };
          updatedTransactions = [newTransaction, ...updatedTransactions];
        }

      } else {
        // === 普通收支 (Expense / Income) ===
        const assetIndex = updatedAssets.findIndex(a => a.id === selectedAssetId);
        if (assetIndex !== -1) {
          updatedAssets[assetIndex].balance += finalAmount;
        }

        const newTransaction = {
          id: Date.now(),
          title: displayTitle,
          date: new Date(`${transactionDate}T${transactionTime}:00`).toISOString(),
          amount: finalAmount,
          icon: selectedCategory.icon,
          type: type,
          assetName: selectedAsset.name,
          assetId: selectedAsset.id,
          categoryId: selectedCategory.id
        };
        updatedTransactions = [newTransaction, ...updatedTransactions];
        // Shadow Sync (Cloud)
        if (session) SyncService.syncTransaction(newTransaction, session.user.id);
      }
    }

    setAssets(updatedAssets); await saveAssets(updatedAssets);
    setTransactions(updatedTransactions); await saveTransactions(updatedTransactions);

    // Save Persistent Asset Selection
    if (selectedAssetId) {
      AsyncStorage.setItem(LAST_USED_ASSET_KEY, selectedAssetId.toString()).catch(e => console.log(e));
    }

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
      showAlert("Success", "已保存，请继续添加下一笔");
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
    showAlert(
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



  // --- Render Stats Screen ---
  // --- Render Stats Screen (Phase 22: Redesign) ---
  // --- Render Stats Screen (Phase 23: Visual Refinement) ---

  // --- Helper: Get Week Range (Mon-Sun) ---
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const start = new Date(d.setDate(diff));
    const end = new Date(d.setDate(diff + 6));

    const format = (date) => `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    return `${format(start)} - ${format(end)}`;
  };

  const renderStatsScreen = () => {
    // Determine Type Filter
    // In update_stats.py, I injected `const [statsType, setStatsType] = useState('expense');`
    // Assuming that state exists now.

    const stats = getStats(statsRange, currentMonth, statsType);

    const expenseStats = getStats(statsRange, currentMonth, 'expense');
    const incomeStats = getStats(statsRange, currentMonth, 'income');
    const netBalance = incomeStats.total - expenseStats.total;

    const screenWidth = Dimensions.get("window").width;

    return (
      <LinearGradient
        colors={['#0F172A', '#1E3A5F']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>

          {/* 1. Header & Range Switcher */}
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {/* Range Selector */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 3 }}>
                {['weekly', 'monthly', 'yearly'].map(range => (
                  <TouchableOpacity key={range} onPress={() => setStatsRange(range)}
                    style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: statsRange === range ? '#6366F1' : 'transparent', borderRadius: 18 }}>
                    <Text style={{ color: statsRange === range ? '#FFF' : '#94A3B8', fontWeight: 'bold', fontSize: 13 }}>
                      {range === 'weekly' ? '周' : range === 'monthly' ? '月' : '年'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Navigator */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => {
                const d = new Date(currentMonth);
                if (statsRange === 'weekly') d.setDate(d.getDate() - 7);
                else if (statsRange === 'monthly') d.setMonth(d.getMonth() - 1);
                else d.setFullYear(d.getFullYear() - 1);
                setCurrentMonth(d);
              }}>
                <Text style={{ fontSize: 22, color: '#6366F1' }}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                if (statsRange === 'monthly') setMonthModalVisible(true);
                if (statsRange === 'weekly') setCalendarVisible(true); // Reuse calendar for week
                // Yearly? Maybe just use month picker for now or add year picker later
              }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                  {statsRange === 'yearly' ? `${currentMonth.getFullYear()}年` :
                    statsRange === 'monthly' ? `${currentMonth.getFullYear()}年 ${currentMonth.getMonth() + 1}月` :
                      getWeekRange(currentMonth)}
                </Text>
                <Text style={{ color: '#AAA', fontSize: 12, textAlign: 'center' }}>
                  {(statsRange === 'monthly' || statsRange === 'weekly') ? '▼' : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                const d = new Date(currentMonth);
                if (statsRange === 'weekly') d.setDate(d.getDate() + 7);
                else if (statsRange === 'monthly') d.setMonth(d.getMonth() + 1);
                else d.setFullYear(d.getFullYear() + 1);
                setCurrentMonth(d);
              }}>
                <Text style={{ fontSize: 22, color: '#6366F1' }}>▶</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: 20, paddingBottom: 100 }}>

              {/* 2. Total Summary Card (Updated with Net Balance) */}
              <View style={{
                flexDirection: 'column',
                backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 24,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                  <View>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>总收入 Income</Text>
                    <Text style={{ color: '#4ADE80', fontSize: 20, fontWeight: 'bold' }}>
                      + {incomeStats.total.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <View>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4, textAlign: 'right' }}>总支出 Expense</Text>
                    <Text style={{ color: '#F87171', fontSize: 20, fontWeight: 'bold', textAlign: 'right' }}>
                      - {expenseStats.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Net Balance Row */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)', paddingVertical: 8, borderRadius: 12
                }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>{netBalance >= 0 ? '💰' : '⚠️'}</Text>
                  <Text style={{ color: '#CBD5E1', marginRight: 8, fontSize: 13 }}>结余 (Net Balance):</Text>
                  <Text style={{
                    color: netBalance >= 0 ? '#4ADE80' : '#F87171',
                    fontWeight: 'bold', fontSize: 16
                  }}>
                    {netBalance >= 0 ? '+' : ''} RM {netBalance.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* 3. Type Toggle (Income | Expense) */}
              <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 4 }}>
                <TouchableOpacity onPress={() => setStatsType('expense')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: statsType === 'expense' ? '#FF6B6B' : 'transparent', borderRadius: 14 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>支出 Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStatsType('income')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: statsType === 'income' ? '#4CAF50' : 'transparent', borderRadius: 14 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>收入 Income</Text>
                </TouchableOpacity>
              </View>

              {/* 4. Donut Chart Section (Custom Side Legend) */}
              {stats.pieData.length > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30, paddingHorizontal: 10 }}>

                  {/* Left: Chart */}
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                      <PieChart
                        data={stats.pieData}
                        width={180}
                        height={180}
                        chartConfig={{ color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})` }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"45"} // Center in 180
                        hasLegend={false}
                        absolute
                      />
                      {/* Donut Hole */}
                      <View style={{
                        position: 'absolute',
                        width: 70, height: 70, borderRadius: 35,
                        backgroundColor: '#1E3A5F',
                        justifyContent: 'center', alignItems: 'center'
                      }} />
                    </View>
                  </View>

                  {/* Right: Custom Legend */}
                  <View style={{ flex: 1, paddingLeft: 20, justifyContent: 'center' }}>
                    {stats.pieData.map((item, index) => {
                      const percentage = ((item.population / stats.total) * 100).toFixed(1);
                      return (
                        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          {/* Color Dot */}
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                          {/* Name */}
                          <Text style={{ color: '#E2E8F0', fontSize: 12, marginRight: 6, fontWeight: '600' }}>{item.name}</Text>
                          {/* Percentage */}
                          <Text style={{ color: '#94A3B8', fontSize: 12 }}>{percentage}%</Text>
                        </View>
                      );
                    })}
                  </View>

                </View>
              ) : (
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 40 }}>🍃</Text>
                  <Text style={{ color: '#94A3B8', marginTop: 10 }}>没有记录</Text>
                </View>
              )}

              {/* 5. Detailed Category List */}
              <Text style={styles.sectionTitle}>分类详情</Text>
              {stats.pieData.map((item, index) => {
                const percentage = ((item.population / stats.total) * 100);
                return (
                  <View key={index} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 12, padding: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
                  }}>
                    {/* Left: Icon */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      justifyContent: 'center', alignItems: 'center', marginRight: 15
                    }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>

                    {/* Middle: Name + Progress Bar */}
                    <View style={{ flex: 1, marginRight: 15, justifyContent: 'center' }}>
                      {/* Name */}
                      <Text style={{ color: '#F1F5F9', fontSize: 15, fontWeight: '600', marginBottom: 6 }}>{item.name}</Text>

                      {/* Progress Bar (Color matches category) */}
                      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: item.color,
                          borderRadius: 3
                        }} />
                      </View>
                    </View>

                    {/* Right: Amount + % */}
                    <View style={{ alignItems: 'flex-end' }}>
                      {/* Amount */}
                      <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 2 }}>
                        RM {item.population.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </Text>
                      {/* Percentage */}
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                        {percentage.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}


            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  // --- Helper: Net Worth History Calculation (Phase 16) ---
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

      let change = 0;
      if (t.type === 'income') change = t.amount;
      else if (t.type === 'expense') change = -t.amount;

      dailyChange[dateStr] += change;
    });

    const reversedDates = [...dates].reverse();
    const historyMap = {};
    let runningBalance = currentNetWorth;

    reversedDates.forEach(dateStr => {
      historyMap[dateStr] = runningBalance;
      const change = dailyChange[dateStr] || 0;
      runningBalance = runningBalance - change;
    });

    // Filter to show every 3rd day (to reduce dots/density)
    const sparseDates = dates.filter((_, i) => i % 3 === 0);

    // Return labels for the sparse dates (e.g., show label every 2nd point of the sparse set => every 6th day)
    const labels = sparseDates.map((d, i) => {
      if (i % 2 === 0) {
        const [year, month, day] = d.split('-');
        return `${month}/${day}`;
      }
      return '';
    });

    return {
      labels: labels,
      datasets: [{ data: sparseDates.map(d => historyMap[d] || 0) }]
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
              backgroundGradientFrom: "#1E293B",
              backgroundGradientTo: "#1E293B",
              backgroundGradientFromOpacity: 0,
              backgroundGradientToOpacity: 0,
              fillShadowGradientFrom: '#4A90E2',
              fillShadowGradientTo: '#1E1E1E',
              fillShadowGradientOpacity: 0.3,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "0", strokeWidth: "0", stroke: "#4A90E2" }, // Hide dots
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
            showAlert("删除账户", "确定要删除这个账户吗？", [
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

  // --- Helper: Stable Color based on ID (Phase 21) ---
  const getStableColor = (id) => {
    let hash = 0;
    const str = id.toString();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
  };

  // --- Render Assets Screen (Phase 16: Net Worth & Prettier Graph) ---
  const renderAssetsScreen = () => {
    const netWorthData = calculateNetWorthHistory();
    const totalLiabilities = assets.filter(a => a.balance < 0).reduce((acc, a) => acc + a.balance, 0);
    const totalAssets = assets.filter(a => a.balance >= 0).reduce((acc, a) => acc + a.balance, 0) +
      goals.reduce((acc, g) => acc + g.savedAmount, 0);
    const netWorth = totalAssets + totalLiabilities;
    const screenWidth = Dimensions.get("window").width;

    // Vibrant Palette for Pie Chart
    const CHART_COLORS = [
      '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA', '#FBBF24',
      '#2DD4BF', '#FB7185', '#34D399', '#818CF8', '#FB923C'
    ];

    // Asset Breakdown Data
    const positiveAssets = assets.filter(a => a.balance > 0);
    const totalPositiveValue = positiveAssets.reduce((acc, a) => acc + a.balance, 0);

    const pieData = positiveAssets.map((asset, index) => {
      const percentage = ((asset.balance / totalPositiveValue) * 100).toFixed(1);
      return {
        name: `${percentage}% ${asset.name}`,
        population: asset.balance,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: "#CBD5E1",
        legendFontSize: 12
      };
    }).sort((a, b) => b.population - a.population);

    return (
      <LinearGradient
        colors={['#0F172A', '#1E3A5F']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 24, paddingTop: 10 }]}>我的资产</Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={{ paddingHorizontal: 24 }}>

              {/* 1. SEPARATED Header: Net Worth Card */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 24,
                padding: 20,
                marginBottom: 15,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', letterSpacing: 1 }}>总净资产 (NET WORTH)</Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginVertical: 8 }}>
                  RM {netWorth.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingHorizontal: 10 }}>
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 12 }}>总资产 Assets</Text>
                    <Text style={{ color: '#4ADE80', fontSize: 16, fontWeight: 'bold' }}>
                      {totalAssets.toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'right' }}>总负债 Liabilities</Text>
                    <Text style={{ color: '#F87171', fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                      {Math.abs(totalLiabilities).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. SEPARATED Graph Card */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 24,
                padding: 10,
                marginBottom: 20,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
                overflow: 'hidden'
              }}>
                <LineChart
                  data={netWorthData}
                  width={screenWidth - 48 - 20}
                  height={180}
                  yAxisLabel="" // REMOVING RM LABEL
                  yAxisSuffix="k"
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  formatYLabel={(y) => (parseFloat(y) / 1000).toFixed(1)}
                  chartConfig={{
                    backgroundColor: "transparent",
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientToOpacity: 0,
                    fillShadowGradientFrom: '#6366F1',
                    fillShadowGradientTo: '#1E1E1E',
                    fillShadowGradientOpacity: 0.5,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    propsForDots: { r: "3", strokeWidth: "2", stroke: "#818CF8" },
                    propsForBackgroundLines: { stroke: "rgba(255,255,255,0.1)", strokeDasharray: "" }
                  }}
                  bezier
                  style={{ marginTop: 10, borderRadius: 16 }}
                />
              </View>

              {/* 3. Assets List Grid */}
              <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 15, color: '#E2E8F0' }]}>账户列表</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {assets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '48%', marginBottom: 15,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 16,
                      padding: 15,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
                    }}
                    onPress={() => { setActiveAsset(item); setCurrentPage('asset_detail'); }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 4 }}>{item.name}</Text>
                    <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }}>RM {item.balance.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}

                {/* Add Asset Button */}
                <TouchableOpacity
                  style={{
                    width: '48%', height: 110, marginBottom: 15,
                    borderRadius: 16,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
                    justifyContent: 'center', alignItems: 'center'
                  }}
                  onPress={() => {
                    setNewAssetName(''); setNewAssetBalance(''); setNewAssetIcon('💰');
                    setEditingAssetId(null); setAssetModalVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 24, color: '#64748B', marginBottom: 5 }}>+</Text>
                  <Text style={{ color: '#64748B', fontSize: 12 }}>添加账户</Text>
                </TouchableOpacity>
              </View>

              {/* 4. Improved Asset Distribution Pie Chart */}
              {positiveAssets.length > 0 && (
                <View style={{ marginTop: 20, marginBottom: 30, alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 15, color: '#E2E8F0', alignSelf: 'flex-start' }]}>资产分布</Text>
                  <PieChart
                    data={pieData}
                    width={screenWidth - 48}
                    height={200}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    absolute
                  />
                </View>
              )}

            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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

  // --- Render Calendar Modal (Phase 9 + Phase 24 Week Picker) ---
  const renderCalendarModal = () => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth(); // 0-11

    // Generate days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    // Helper to check if a date matches the selected stats week
    const isSameWeek = (d1, d2) => {
      if (!d1 || !d2) return false;
      // Get start of week for both
      const start1 = new Date(d1); start1.setDate(start1.getDate() - start1.getDay() + (start1.getDay() === 0 ? -6 : 1));
      const start2 = new Date(d2); start2.setDate(start2.getDate() - start2.getDay() + (start2.getDay() === 0 ? -6 : 1));
      return start1.toDateString() === start2.toDateString();
    };

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
                if (!date) return <View key={index} style={{ width: '14.2%', aspectRatio: 1 }} />;

                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;

                // Selection Logic
                let isSelected = false;
                if (currentPage === 'stats' && statsRange === 'weekly') {
                  isSelected = isSameWeek(date, currentMonth);
                } else if (currentPage === 'home' || !currentPage) {
                  // Transaction Date Picker
                  // Note: 'dateStr' is localized manually above, 'transactionDate' is YYYY-MM-DD
                  isSelected = dateStr === transactionDate;
                }

                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20,
                      backgroundColor: isSelected ? '#6366F1' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent')
                    }}
                    onPress={() => {
                      if (currentPage === 'stats' && statsRange === 'weekly') {
                        // Select Week
                        // Set currentMonth to the Monday of this week? Or just the date.
                        // getWeekRange handles logic from any date.
                        setCurrentMonth(date);
                        setCalendarVisible(false);
                      } else {
                        // Default: Transaction Date Picker
                        setTransactionDate(dateStr);
                        setCalendarVisible(false);
                        // Auto Open Time Picker? No, user might just want date.
                      }
                    }}
                  >
                    <Text style={{ color: isSelected ? '#FFF' : (isToday ? '#4A90E2' : '#FFF'), fontWeight: isSelected || isToday ? 'bold' : 'normal' }}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={{ marginTop: 15, padding: 10, alignItems: 'center' }} onPress={() => setCalendarVisible(false)}>
              <Text style={{ color: '#888' }}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  ;



  // --- Render Budget Modal (Phase 15) ---
  const renderBudgetModal = () => {
    const currentExpense = getStats('monthly', new Date(), 'expense').total;
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
        <TouchableOpacity
          style={{
            position: 'absolute', top: 50, left: 24, zIndex: 50,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.1)',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
          }}
          onPress={() => setCurrentPage(activeTransaction.fromPage || 'home')}
        >
          <Text style={{ fontSize: 20, color: '#FFF', marginLeft: -2 }}>◀</Text>
        </TouchableOpacity>

        {/* Hero Section */}
        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 40 }}>{activeTransaction.icon}</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#AAA', letterSpacing: 1, textTransform: 'uppercase' }}>
            {activeTransaction.type === 'expense' ? '支出' : (activeTransaction.type === 'income' ? '收入' : '转账 / 存入')}
          </Text>
          <Text style={{
            fontSize: 40, fontWeight: 'bold',
            color: activeTransaction.type === 'expense' ? '#FF6B6B' : (activeTransaction.type === 'income' ? '#4CAF50' : '#4A90E2'),
            marginVertical: 10
          }}>
            {activeTransaction.type === 'expense' ? '-' : (activeTransaction.type === 'income' ? '+' : '')} RM {Math.abs(activeTransaction.amount).toFixed(2)}
          </Text>
          <Text style={{ fontSize: 20, color: '#FFF' }}>
            {(activeTransaction.type === 'transfer' && (activeTransaction.title === '餐饮' || activeTransaction.title === 'Food'))
              ? '转账'
              : activeTransaction.title}
          </Text>
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
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>
              {activeTransaction.type === 'transfer' ? '资金流向 (From → To)' : '账户'}
            </Text>
            {activeTransaction.type === 'transfer' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: 'bold' }}>{activeTransaction.assetName}</Text>
                  <Text style={{ color: '#777', fontSize: 10, marginLeft: 4 }}>(Out)</Text>
                </View>
                <Text style={{ fontSize: 20, color: '#AAA' }}>➡️</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: '#10B981', fontWeight: 'bold' }}>{activeTransaction.toAssetName || '?'}</Text>
                  <Text style={{ color: '#777', fontSize: 10, marginLeft: 4 }}>(In)</Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: 8, color: '#FFF' }}>{activeTransaction.assetName}</Text>
              </View>
            )}
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
            showAlert("删除交易", "确定要删除这条记录吗？", [
              { text: "取消", style: "cancel" },
              {
                text: "删除", style: "destructive", onPress: () => {
                  const updatedTransactions = transactions.filter(t => t.id !== activeTransaction.id);
                  setTransactions(updatedTransactions);
                  saveTransactions(updatedTransactions);

                  // Revert asset balance
                  // Revert asset balance
                  const asset = assets.find(a => a.id === activeTransaction.assetId);

                  // refundAmount: How much to ADD back to the asset.
                  // For Expense: Add (+amount)
                  // For Income: Deduct (-amount)
                  // For Transfer (Source): Add (+amount)
                  // For Transfer (Dest): Deduct (-amount)

                  let refundAmount = 0;
                  if (activeTransaction.type === 'expense') {
                    refundAmount = Math.abs(activeTransaction.amount);
                  } else if (activeTransaction.type === 'income') {
                    refundAmount = -Math.abs(activeTransaction.amount);
                  } else if (activeTransaction.type === 'transfer') {
                    // Transfer logic
                    refundAmount = Math.abs(activeTransaction.amount); // Always refund source
                  }

                  if (asset) {
                    const updatedAssets = assets.map(a => a.id === asset.id ? { ...a, balance: a.balance + refundAmount } : a);

                    // Specific handling for Internal Transfer (Reverse Destination)
                    if (activeTransaction.subType === 'internal' && activeTransaction.toAssetId) {
                      const toIndex = updatedAssets.findIndex(a => a.id === activeTransaction.toAssetId);
                      if (toIndex !== -1) {
                        updatedAssets[toIndex].balance -= Math.abs(activeTransaction.amount);
                      }
                    }

                    setAssets(updatedAssets);
                    saveAssets(updatedAssets);
                  }

                  // Handle Goal Revert if needed
                  if (activeTransaction.goalId) {
                    const goal = goals.find(g => g.id === activeTransaction.goalId);
                    if (goal) {
                      // Reduce goal saved amount
                      const updatedGoals = goals.map(g => g.id === goal.id ? { ...g, savedAmount: g.savedAmount - Math.abs(activeTransaction.amount) } : g);
                      setGoals(updatedGoals);
                      saveGoals(updatedGoals);
                    }
                  }

                  setCurrentPage(activeTransaction.fromPage || 'home');
                  if (activeTransaction.type === 'transfer' && activeTransaction.subType === 'goal_deposit') {
                    showAlert("已删除", `资金已退回到 ${activeTransaction.assetName}`);
                  }
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
        <TouchableOpacity
          style={{
            position: 'absolute', top: 50, left: 24, zIndex: 50,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.1)',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
          }}
          onPress={() => setCurrentPage('home')}
        >
          <Text style={{ fontSize: 20, color: '#FFF', marginLeft: -2 }}>◀</Text>
        </TouchableOpacity>
        {/* Spacer for absolute header */}
        <View style={{ height: 40 }} />

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
            showAlert("删除目标", "确定要删除这个目标吗？已存金额将保留在目标中(需手动转出)。", [
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
                <Text style={{
                  fontSize: 16, fontWeight: 'bold',
                  color: item.type === 'expense' ? '#FF6B6B' : (item.type === 'income' ? '#4CAF50' : '#4A90E2') // Blue for Transfer
                }}>
                  {item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '')} RM {Math.abs(item.amount).toFixed(2)}
                </Text>
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

  // --- Auth Check ---
  if (!session) {
    return <AuthScreen />;
  }

  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A5F']} // Deep Navy -> Slightly lighter Blue/Grey
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <CustomAlert
          visible={alertVisible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertVisible(false)}
        />
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

                  {/* Sync Button (Debug) */}
                  <TouchableOpacity
                    style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, marginRight: 10 }}
                    onPress={async () => {
                      if (!session) { Alert.alert("Not Logged In"); return; }
                      Alert.alert("Syncing...", "Uploading data to cloud...");
                      const res = await SyncService.uploadLocalDataToCloud(session.user.id);
                      if (res.success) Alert.alert("Success", "Manual Backup Complete!");
                      else Alert.alert("Error", String(res.error));
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>☁️</Text>
                  </TouchableOpacity>

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
                          const currentExpense = getStats('monthly', new Date(), 'expense').total;
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
                        <Text style={styles.overviewExpense}>RM {getStats('monthly', new Date(), 'expense').total.toFixed(2)}</Text>
                      </View>
                      <View>
                        <Text style={styles.overviewLabel}>{new Date().getMonth() + 1}月收入</Text>
                        <Text style={styles.overviewIncome}>RM {getStats('monthly', new Date(), 'income').total.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Net Balance (Phase 13) */}
                    <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, marginRight: 5 }}>⚖️</Text>
                      <Text style={{ color: '#888', marginRight: 5 }}>净收支:</Text>
                      <Text style={{
                        color: (getStats('monthly', new Date(), 'income').total - getStats('monthly', new Date(), 'expense').total) >= 0 ? '#4CAF50' : '#FF6B6B',
                        fontWeight: 'bold', fontSize: 16
                      }}>
                        RM {(getStats('monthly', new Date(), 'income').total - getStats('monthly', new Date(), 'expense').total).toFixed(2)}
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
                              <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  height: '70%',
                                  borderRadius: 20,
                                }}
                              />
                              <View style={{ flex: 1, padding: 16, backgroundColor: 'transparent', borderRadius: 20, justifyContent: 'space-between' }}>
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
                          {group.data.map((item, index) => (
                            <FadeInView key={item.id} style={{ marginBottom: 10 }} index={index}>
                              <TouchableOpacity
                                style={styles.transactionItem}
                                onLongPress={() => {
                                  // --- Smart Feature: Template Copy (Phase 20) ---
                                  setAmount(Math.abs(item.amount).toString());
                                  setNote(item.title);
                                  setType(item.type);
                                  setSelectedAssetId(item.assetId);
                                  if (item.itemType === 'transfer') setToAssetId(item.toAssetId);

                                  // Set Category
                                  if (item.categoryId) {
                                    const catGroup = item.type === 'expense' ? categories.expense : categories.income;
                                    const foundCat = catGroup.find(c => c.id === item.categoryId);
                                    if (foundCat) setSelectedCategory(foundCat);
                                  }

                                  // Set Date/Time to NOW (Instant Record)
                                  const now = new Date();
                                  setTransactionDate(now.toISOString().split('T')[0]);
                                  setTransactionTime(now.toTimeString().split(' ')[0].substring(0, 5));

                                  setEditingId(null); // Ensure it's a NEW transaction
                                  setModalVisible(true);
                                  showAlert("已复制", "已填入历史数据，金额日期可修改。");
                                }}
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
                                <Text style={{
                                  fontSize: 16, fontWeight: 'bold',
                                  color: item.type === 'expense' ? '#FF6B6B' : (item.type === 'income' ? '#4CAF50' : '#4A90E2')
                                }}>
                                  {item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '')} RM {Math.abs(item.amount).toFixed(2)}
                                </Text>
                              </TouchableOpacity>
                            </FadeInView>
                          ))}
                        </View>
                      );
                    })
                  )}
                </View>
                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Floating Action Button (FAB) */}
              <ScaleButton
                style={styles.fab}
                onPress={() => {
                  setModalVisible(true);
                  // Initialize Date/Time to now (Local Time)
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  setTransactionDate(`${year}-${month}-${day}`);
                  setTransactionTime(now.toTimeString().split(' ')[0].substring(0, 5));
                }}
              >
                <Text style={styles.fabText}>+</Text>
              </ScaleButton>
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
                <ScaleButton style={[styles.modalButton, styles.cancelButton]} onPress={() => setAssetModalVisible(false)}><Text style={styles.cancelButtonText}>取消</Text></ScaleButton>
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
            <View style={[styles.modalContent, { height: '98%', paddingBottom: 20 }]}>

              {/* Header with Clear Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{editingId ? '✏️ 修改账单' : '记一笔'}</Text>
                <TouchableOpacity onPress={() => {
                  setAmount(''); setNote('');
                }} style={{ padding: 5 }}>
                  <Text style={{ color: '#FF6B6B', fontSize: 14 }}>🗑️ 清空</Text>
                </TouchableOpacity>
              </View>

              {/* Date & Time Header (New) */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 10 }}
                  onPress={() => { setCalendarCursor(new Date(transactionDate)); setCalendarVisible(true); }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>📅 {transactionDate}</Text>
                </TouchableOpacity>
                <View style={{ backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 }}>
                  <TextInput
                    style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', padding: 0 }}
                    value={transactionTime}
                    onChangeText={setTransactionTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#555"
                  />
                </View>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>

                <View style={styles.typeSelector}>
                  <TouchableOpacity style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]} onPress={() => setType('expense')}>
                    <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>支出</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeButton, type === 'income' && styles.typeButtonActive]} onPress={() => setType('income')}>
                    <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>收入</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeButton, type === 'transfer' && styles.typeButtonActive]} onPress={() => setType('transfer')}>
                    <Text style={[styles.typeText, type === 'transfer' && styles.typeTextActive]}>转账</Text>
                  </TouchableOpacity>
                </View>

                {/* Asset Selector (From) */}
                <Text style={styles.inputLabel}>{type === 'income' ? '存入账户' : (type === 'transfer' ? '转出账户 (From)' : '支付账户')}</Text>
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

                {type === 'transfer' && (
                  <View style={{ marginBottom: 5 }}>
                    <Text style={styles.inputLabel}>转入账户 (To)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 45 }}>
                      {assets.map((asset) => (
                        <TouchableOpacity
                          key={asset.id}
                          style={[styles.selectAssetChip, toAssetId === asset.id && styles.selectAssetChipActive]}
                          onPress={() => setToAssetId(asset.id)}
                        >
                          <Text style={[styles.selectAssetText, toAssetId === asset.id && styles.selectAssetTextActive]}>
                            {asset.name}
                          </Text>
                          <Text style={{ color: '#555', fontSize: 10 }}>RM {asset.balance}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Category Selector (Hide for Transfer) */}
                {type !== 'transfer' && (
                  <>
                    <Text style={styles.inputLabel}>选择分类 (Category)</Text>
                    <View style={[styles.categoryGrid, { marginBottom: 5 }]}>
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
                  </>
                )}




              </ScrollView>

              {/* Custom Calculator Keyboard (Phase 20) */}
              <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 5 }}>
                {/* Fixed Amount & Note Section */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 2 }]}>金额</Text>
                    <TouchableOpacity
                      style={[styles.input, { marginBottom: 0, justifyContent: 'center', height: 40, paddingVertical: 0, paddingHorizontal: 10 }]}
                      onPress={() => { }}
                    >
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: amount ? '#FFF' : '#555' }}>
                        {amount || '0.00'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ width: 10 }} />

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 2 }]}>备注</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 0, height: 40, paddingVertical: 0, paddingHorizontal: 10, color: '#FFF', fontSize: 14 }]}
                      placeholder="点击输入备注..."
                      placeholderTextColor="#555"
                      value={note}
                      onChangeText={setNote}
                    />
                  </View>
                </View>



                <View style={styles.calcGrid}>
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '.', '0', '⌫', '+'].map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.calcKey, ['÷', '×', '-', '+'].includes(key) && styles.calcKeyOp, key === '⌫' && styles.calcKeyDel]}
                      onPress={() => {
                        if (key === '⌫') {
                          setAmount(prev => prev.toString().slice(0, -1));
                        } else if (['÷', '×', '-', '+'].includes(key)) {
                          const op = key === '÷' ? '/' : (key === '×' ? '*' : key);
                          setAmount(prev => prev.toString() + op);
                        } else {
                          setAmount(prev => prev.toString() + key);
                        }
                      }}
                    >
                      <Text style={[styles.calcKeyText, ['÷', '×', '-', '+'].includes(key) && styles.calcKeyTextOp]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', marginTop: 20 }}>
                  <ScaleButton style={[styles.modalButton, styles.cancelButton, { flex: 1, marginRight: 5 }]} onPress={() => { setModalVisible(false); setEditingId(null); }}>
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </ScaleButton>

                  {!editingId && (
                    <ScaleButton style={[styles.modalButton, { backgroundColor: '#4CAF50', flex: 1, marginRight: 5 }]} onPress={() => handleSaveTransaction(false)}>
                      <Text style={styles.saveButtonText}>再记一笔</Text>
                    </ScaleButton>
                  )}

                  <ScaleButton style={[styles.modalButton, styles.saveButton, { flex: 1 }]} onPress={() => handleSaveTransaction(true)}>
                    <Text style={styles.saveButtonText}>{amount.match(/[+\-*/]/) ? '计算 & 保存' : '保存'}</Text>
                  </ScaleButton>
                </View>
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

        {/* Remark Input Modal (Phase 20) */}
        <Modal animationType="fade" transparent={true} visible={remarkModalVisible} onRequestClose={() => setRemarkModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalContainerCenter, { justifyContent: 'flex-start', paddingTop: 100 }]}>
            <View style={styles.modalContentCenter}>
              <Text style={styles.modalTitle}>📝 添加备注</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#333', marginTop: 10 }]}
                placeholder="例如：奶茶 (可不填)"
                placeholderTextColor="#555"
                value={note}
                onChangeText={setNote}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={() => setRemarkModalVisible(false)}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton, { width: '100%', marginTop: 10 }]} onPress={() => setRemarkModalVisible(false)}>
                  <Text style={styles.saveButtonText}>确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { padding: 24, backgroundColor: theme.colors.surface, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerTopUser: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  greeting: { color: theme.colors.textSecondary, fontSize: 14 },
  smallAddButton: { backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  smallAddButtonText: { color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  label: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  balance: { color: theme.colors.text, fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  assetScroll: { marginTop: 15 },
  assetCard: { backgroundColor: theme.colors.surface, padding: 12, borderRadius: 16, marginRight: 12, width: 130, height: 90, justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border },
  assetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  assetIcon: { backgroundColor: theme.colors.surfaceHighlight, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  assetName: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  assetBalance: { color: theme.colors.text, fontSize: 15, fontWeight: 'bold' },

  // --- Calculator Styles (Phase 20) ---
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 2 },
  calcKey: { width: '23%', height: 38, backgroundColor: '#333', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }, // Compact height (75% of 50)
  calcKeyOp: { backgroundColor: '#4A90E2' },
  calcKeyDel: { backgroundColor: '#FF6B6B' },
  calcKeyText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  calcKeyTextOp: { color: '#FFF' },

  // Goal Styles
  goalScroll: { paddingHorizontal: 24, marginBottom: 20, maxHeight: 150 },
  emptyGoalCard: { width: 160, height: 120, backgroundColor: theme.colors.surface, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.border },
  goalCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 20, marginRight: 15, width: 160, height: 130, justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalAmount: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  goalTitle: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  goalTarget: { color: theme.colors.textSecondary, fontSize: 12 },
  progressBarBg: { height: 6, backgroundColor: theme.colors.background, borderRadius: 3, marginTop: 10, width: '100%' },
  progressBarFill: { height: 6, backgroundColor: theme.colors.success, borderRadius: 3 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 10 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  linkText: { color: theme.colors.primary, fontSize: 14 },
  transactionList: { flex: 1, paddingHorizontal: 24 },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 50, fontSize: 14 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 20 },
  transactionInfo: { flex: 1 },
  transactionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  transactionDate: { color: theme.colors.textSecondary, fontSize: 12 },
  expenseAmount: { color: theme.colors.danger, fontSize: 16, fontWeight: 'bold' },
  incomeAmount: { color: theme.colors.success, fontSize: 16, fontWeight: 'bold' },
  footer: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  addButton: { backgroundColor: theme.colors.primary, width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  addButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 4, marginTop: 5 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, borderRadius: 12, padding: 16, fontSize: 18, borderWidth: 1, borderColor: theme.colors.border },

  // Chip Styles
  selectAssetChip: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  selectAssetChipActive: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
  selectAssetText: { color: theme.colors.textSecondary, fontWeight: 'bold', fontSize: 12 },
  selectAssetTextActive: { color: theme.colors.primary },

  // Category Grid Styles (New)
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5, justifyContent: 'space-between' },
  categoryItem: { width: '23%', aspectRatio: 1, backgroundColor: theme.colors.surfaceHighlight, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  categoryItemActive: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
  categoryText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  categoryTextActive: { color: theme.colors.primary, fontWeight: 'bold' },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalContainerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContentCenter: { width: '85%', backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24, paddingBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: theme.colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', marginBottom: 10, backgroundColor: theme.colors.background, borderRadius: 12, padding: 4 },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeButtonActive: { backgroundColor: theme.colors.primary },
  typeText: { color: theme.colors.textSecondary, fontWeight: '600' },
  typeTextActive: { color: '#FFF', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
  modalButton: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelButton: { backgroundColor: theme.colors.surfaceHighlight, marginRight: 10 },
  saveButton: { backgroundColor: theme.colors.primary, marginLeft: 10 },
  cancelButtonText: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Stats / Overview Styles
  overviewCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderColor: theme.colors.border, borderWidth: 1 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  overviewLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 5 },
  overviewExpense: { color: theme.colors.danger, fontSize: 18, fontWeight: 'bold' },
  overviewIncome: { color: theme.colors.success, fontSize: 18, fontWeight: 'bold' },
  overviewButton: { backgroundColor: theme.colors.surfaceHighlight, padding: 12, borderRadius: 12, alignItems: 'center' },
  overviewButtonText: { color: theme.colors.primary, fontWeight: 'bold' },

  statsHeader: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 20, backgroundColor: theme.colors.surface },
  monthChangeArrow: { fontSize: 24, color: theme.colors.primary, padding: 10 },
  monthTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  chartCard: { margin: 20, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  chartTitle: { color: theme.colors.textSecondary, marginBottom: 10, alignSelf: 'flex-start', paddingLeft: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  statCatName: { color: theme.colors.text, fontSize: 16 },
  statAmount: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },

  // Bottom Navigation Styles
  bottomNav: { flexDirection: 'row', backgroundColor: theme.colors.surface, paddingVertical: 20, paddingBottom: Platform.OS === 'ios' ? 35 : 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { color: theme.colors.textSecondary, fontSize: 18, marginTop: 4 },
  navTextActive: { color: theme.colors.primary, fontWeight: 'bold' },

  // Assets Page Styles
  pageTitle: { color: theme.colors.text, fontSize: 28, fontWeight: 'bold', marginBottom: 20 },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
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
