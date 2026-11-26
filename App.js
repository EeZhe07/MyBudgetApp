import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, ScrollView, Platform, Modal, KeyboardAvoidingView, Alert, Image, Linking, BackHandler, AppState, Keyboard, StatusBar as NativeStatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { requireOptionalNativeModule } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import * as QuickActions from 'expo-quick-actions';
import { requestWidgetUpdate } from 'react-native-android-widget';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { InfoWidget } from './widgets/InfoWidget';
import { ActionWidget } from './widgets/ActionWidget';
import { budgetStore } from './lib/budget-db';
import { accountClosingBalance, applyLedgerChange, calculateAmount, cents, localDay, netExpense, reimbursementIssue,
  reimbursementTotals, transactionDay, widgetTotals } from './lib/budget-store';
import { postDueRules } from './lib/budget-recurring';
import { requestReminderPermission, syncBudgetReminders } from './lib/budget-reminders';
import { DEFAULT_CATEGORIES, accountAppearance, accountIconKeys, categoryAppearance, goalAppearance, goalColors,
  goalIconKeys, pastelSwatches, suggestAccountAppearance } from './lib/budget-icons';
import { iconCatalog } from './assets/lucide-icons';
import { exportBudgetBackup, restoreBudgetBackup, saveGoalPicture } from './lib/budget-backup';
import BudgetSettings from './screens/BudgetSettings';
import { Text, TextInput } from './screens/PocketText';
import BudgetAssets from './screens/BudgetAssets';
import BudgetStats from './screens/BudgetStats';
import BudgetActivity from './screens/BudgetActivity';
import BudgetPlan from './screens/BudgetPlan';
import IconPicker from './screens/IconPicker';
import PocketSheet from './screens/PocketSheet';
import ScheduledTransactions from './screens/ScheduledTransactions';
import { AccountDetail, GoalDetail, Receipt } from './screens/BudgetDetails';
import { dailyAllowances, periodTotals } from './lib/budget-insights';
import BudgetHome, { BudgetNavigation, SavingsGoals } from './screens/BudgetHome';
import TransactionEntry, { PaymentInbox } from './screens/TransactionEntry';
import { IdentityIcon, PocketIcon, TextAction, categoryLabel, dateLabel, groupTransactions, isTngAccount, money,
  pocket, pocketLayout, useReducedMotion } from './screens/budgetUi';
import { BudgetLimit, DatePicker, FilterPicker, MonthPicker, NewCategory } from './screens/BudgetPickers';

const tngCapture = Platform.OS === 'android' ? requireOptionalNativeModule('TngCapture') : null;
const canCopyTransaction = entry => !['adjustment', 'goal_deposit'].includes(entry.subType);

const theme = {
  colors: {
    background: pocket.paper, surface: pocket.white, surfaceHighlight: pocket.blush,
    primary: pocket.action, secondary: pocket.muted, success: pocket.green, danger: pocket.danger,
    text: pocket.ink, textSecondary: pocket.muted, border: pocket.line,
  },
};

const CustomAlert = ({ visible, title, message, buttons, onClose, reduced }) => {
  return (
    <Modal transparent={true} visible={visible} animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '80%', backgroundColor: theme.colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10, textAlign: 'center' }}>{title}</Text>
          {message ? <Text style={{ fontSize: 16, color: pocket.muted, marginBottom: 16, lineHeight: 22 }}>{message}</Text> : null}

          <View style={{ gap: 8 }}>
            {buttons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                style={{
                  minHeight: 48,
                  backgroundColor: btn.style === 'destructive' ? 'rgba(239, 68, 68, 0.2)' : (btn.style === 'cancel' ? theme.colors.surfaceHighlight : theme.colors.primary),
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: btn.style === 'cancel' ? 1 : 0,
                  borderColor: theme.colors.border
                }}
                onPress={() => {
                  onClose();
                  btn.onPress?.();
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
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <BudgetApp />
    </SafeAreaProvider>
  );
}

function BudgetApp() {
  const insets = useSafeAreaInsets();
  const androidTopInset = Platform.OS === 'android' ? Math.max(insets.top, NativeStatusBar.currentHeight ?? 0) : undefined;
  const reduced = useReducedMotion();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', buttons: [] });

  const [storageStatus, setStorageStatus] = useState('loading');
  const [drafts, setDrafts] = useState([]);
  const [draftBusy, setDraftBusy] = useState(null);
  const resolvingDraft = useRef(false);
  const [paymentInboxVisible, setPaymentInboxVisible] = useState(false);
  const lastUsedAssetId = useRef(null);
  const [draftId, setDraftId] = useState(null);
  const [captureStatus, setCaptureStatus] = useState(null);
  const [captureError, setCaptureError] = useState(false);
  const savingTransaction = useRef(false);
  const refreshingCapture = useRef(null);

  const showAlert = (title, message, buttons) => {
    if (!buttons) { Alert.alert(title, message); return; }
    // Normalize buttons if strictly native API format was used (text, style, onPress)
    const formattedButtons = buttons.map(b => ({
      text: b.text || 'OK',
      onPress: b.onPress,
      style: b.style || 'default'
    }));
    setAlertConfig({ title, message, buttons: formattedButtons });
    setAlertVisible(true);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'stats'
  const viewingRecurring = currentPage === 'recurring';
  const openRecordSwipe = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statsDate, setStatsDate] = useState(new Date());
  const [statsRange, setStatsRange] = useState('monthly'); // 'weekly' | 'monthly' | 'yearly'

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense'); // 'expense', 'income', 'transfer'
  const [selectedAssetId, setSelectedAssetId] = useState(null); // 'From' Asset
  const [toAssetId, setToAssetId] = useState(null); // 'To' Asset
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES.expense[0]);
  const [editingId, setEditingId] = useState(null);
  const [reimbursable, setReimbursable] = useState(false);
  const [reimbursementFor, setReimbursementFor] = useState(null);
  const [reimbursementPicker, setReimbursementPicker] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(null);
  const [receiptRoute, setReceiptRoute] = useState(null);
  const [fundingGoalId, setFundingGoalId] = useState(null);
  const [transactionDate, setTransactionDate] = useState(''); // YYYY-MM-DD
  const [transactionTime, setTransactionTime] = useState(''); // HH:mm

  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetBalance, setNewAssetBalance] = useState('');
  const [newAccountType, setNewAccountType] = useState('asset');
  const [accountOverrides, setAccountOverrides] = useState({});
  const selectedAccountAppearance = { ...suggestAccountAppearance(newAssetName, newAccountType), ...accountOverrides };
  const [activeAssetId, setActiveAssetId] = useState(null);
  const [adjustingAsset, setAdjustingAsset] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null); // Asset ID being edited

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalAppearance, setNewGoalAppearance] = useState(() => goalAppearance({}));
  const [newGoalImage, setNewGoalImage] = useState(null);
  const [newGoalDate, setNewGoalDate] = useState(null);
  const [newGoalStartingBalance, setNewGoalStartingBalance] = useState('');
  const [goalDateVisible, setGoalDateVisible] = useState(false);
  const goalFormScroll = useRef(null);
  const revealGoalCover = useRef(false);
  const goalSwatch = pastelSwatches[newGoalAppearance.colorKey];
  const [editingGoalId, setEditingGoalId] = useState(null); // ID of goal being edited

  const [activeGoalId, setActiveGoalId] = useState(null);

  // Calendar Picker State (Phase 9 & 12)
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(new Date()); // Viewing Year/Month
  const [monthModalVisible, setMonthModalVisible] = useState(false); // For Month Picker
  const [activity, setActivity] = useState({ from: 'home', period: 'monthly', date: new Date(), query: '', account: null, category: null, type: null });

  const [transactions, setTransactions] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);
  const [reminderIssue, setReminderIssue] = useState('');
  const [assets, setAssets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const activeAsset = assets.find(asset => asset.id === activeAssetId);
  const activeGoal = goals.find(goal => goal.id === activeGoalId);
  const activeTransaction = transactions.find(entry => entry.id === receiptRoute?.id);
  const reimbursements = useMemo(() => reimbursementTotals(transactions), [transactions]);
  const originalExpense = transactions.find(entry => entry.id === activeTransaction?.reimbursementFor && entry.reimbursable);
  const linkedRepayments = activeTransaction?.reimbursable
    ? transactions.filter(entry => entry.reimbursementFor === activeTransaction.id) : [];
  const editedEntry = transactions.find(entry => entry.id === editingId);
  const entryAccounts = assets.filter(asset => !asset.archived || editedEntry?.assetId === asset.id || editedEntry?.toAssetId === asset.id);
  const hasAccounts = assets.some(asset => !asset.archived);
  const editingGoalDeposit = fundingGoalId != null || editingId != null &&
    transactions.some(transaction => transaction.id === editingId && transaction.subType === 'goal_deposit');
  const clearEntryExtras = () => {
    setRuleDraft(null);
    setReimbursable(false);
    setReimbursementFor(null);
    setReimbursementPicker(false);
  };

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    QuickActions.setItems([
      {
        title: "Record food expense",
        icon: "compose",
        id: "quick_food",
        params: { categoryId: 'food' },
      },
      {
        title: "Record transport expense",
        icon: "car",
        id: "quick_transport",
        params: { categoryId: 'transport' },
      },
      {
        title: "Record bubble tea",
        icon: "heart",
        id: "quick_tea",
        params: { categoryId: 'food', note: 'Bubble tea' },
      },
    ]);

    const openShortcut = action => {
      if (!action || savingTransaction.current) return;
      clearEntryExtras();
      const now = new Date();
      setDraftId(null);
      setFundingGoalId(null);
      setEditingId(null);
      setType('expense');
      setAmount('');
      setNote(action.params?.note ?? '');
      setSelectedCategory(DEFAULT_CATEGORIES.expense.find(category => category.id === action.params?.categoryId) ?? DEFAULT_CATEGORIES.expense[0]);
      setTransactionDate(localDay(now));
      setTransactionTime(now.toTimeString().slice(0, 5));
      setSelectedAssetId(lastUsedAssetId.current);
      setToAssetId(null);
      setModalVisible(true);
    };
    openShortcut(QuickActions.initial);
    const subscription = QuickActions.addListener(openShortcut);
    return () => subscription.remove();
  }, []);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAppearance, setNewCatAppearance] = useState(() => categoryAppearance());

  // Budget State (Phase 15)
  const [monthlyBudgets, setMonthlyBudgets] = useState({});
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url || event;
      if (/^mybudgetapp(?:-test)?:\/\/add\/?(?:[?#].*)?$/.test(url) && !savingTransaction.current) {
        // Auto-open Add Transaction Modal
        clearEntryExtras();
        const now = new Date();
        setTransactionDate(localDay(now));
        setTransactionTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        setType('expense');
        setSelectedCategory(DEFAULT_CATEGORIES.expense[0]);
        setSelectedAssetId(lastUsedAssetId.current);
        setToAssetId(null);
        setAmount('');
        setNote('');
        setDraftId(null);
        setFundingGoalId(null);
        setEditingId(null);
        setModalVisible(true);
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const loadData = async () => {
    try {
      const data = await budgetStore.read();
      const loadedAssets = data.assets ?? [];
      setTransactions(data.transactions ?? []);
      setRecurringRules(data.recurringRules ?? []);
      setAssets(loadedAssets);
      setGoals(data.goals ?? []);
      setCategories(data.categories ?? DEFAULT_CATEGORIES);
      setMonthlyBudgets(data.monthlyBudgets ?? {});
      const lastAsset = loadedAssets.find(asset => !asset.archived && String(asset.id) === String(data.lastAsset));
      lastUsedAssetId.current = lastAsset?.id ?? loadedAssets.find(asset => !asset.archived)?.id ?? null;
      setSelectedAssetId(lastUsedAssetId.current);
      setStorageStatus('ready');
    } catch (error) {
      setStorageStatus(error.message || 'Could not open the budget.');
    }
  };

  const persist = async (changes, paymentDraftId = null) => {
    try {
      return await budgetStore.save(changes, paymentDraftId);
    } catch (error) {
      showAlert('Could not save', error.message);
      return null;
    }
  };

  const saveAssets = data => persist({ assets: data });
  const saveGoals = data => persist({ goals: data });
  const saveCategories = data => persist({ categories: data });

  useEffect(() => {
    if (storageStatus !== 'ready' || !recurringRules.length) return;
    const post = async () => {
      if (savingTransaction.current || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      const changes = postDueRules({ recurringRules, assets, transactions, categories });
      if (!changes) return;
      savingTransaction.current = true;
      try {
        if (await persist(changes)) {
          setRecurringRules(changes.recurringRules);
          setAssets(changes.assets);
          setTransactions(changes.transactions);
        }
      } finally {
        savingTransaction.current = false;
      }
    };
    post();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') post(); });
    const timer = setInterval(post, 30000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [storageStatus, recurringRules, assets, transactions, categories]);

  useEffect(() => {
    if (storageStatus !== 'ready') return;
    let current = true;
    const sync = () => syncBudgetReminders(recurringRules, assets).then(available => {
      if (current) setReminderIssue(available === false ? 'Allow notifications in device settings to receive reminders.'
        : available === 'unavailable' ? 'This build does not have local notifications available.' : '');
    }).catch(() => { if (current) setReminderIssue('Could not schedule reminders. Open this screen again to retry.'); });
    sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { current = false; subscription.remove(); };
  }, [storageStatus, recurringRules, assets, viewingRecurring]);

  const refreshCapture = () => {
    if (!tngCapture) return;
    if (refreshingCapture.current) return refreshingCapture.current;
    const refresh = (async () => {
      try {
        const queue = Object.values(JSON.parse(await tngCapture.readQueue()));
        if (queue.length) {
          await budgetStore.importDrafts(queue);
          await tngCapture.acknowledge(queue.map(draft => draft.id));
        }
        setDrafts(await budgetStore.pendingDrafts());
        setCaptureStatus(await tngCapture.status());
        setCaptureError(false);
      } catch {
        setCaptureError(true);
      }
    })();
    refreshingCapture.current = refresh;
    refresh.finally(() => { refreshingCapture.current = null; });
    return refresh;
  };

  const captureAction = async action => {
    try {
      await action();
      await refreshingCapture.current;
      await refreshCapture();
    } catch {
      setCaptureError(true);
    }
  };

  useEffect(() => {
    if (!tngCapture || storageStatus !== 'ready') return;
    refreshCapture();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshCapture();
    });
    return () => subscription.remove();
  }, [storageStatus, currentPage]);

  const closeTransaction = () => {
    if (savingTransaction.current) return;
    Keyboard.dismiss();
    setModalVisible(false);
    setEditingId(null);
    if (draftId != null) setPaymentInboxVisible(true);
    setDraftId(null);
    setFundingGoalId(null);
    clearEntryExtras();
  };

  const wallets = assets.filter(asset => !asset.archived && isTngAccount(asset.name));
  const draftAccount = wallets.length === 1 ? wallets[0] : null;
  const draftCategory = categories.expense.find(item => item.id === 'other');
  const draftFields = draft => {
    const date = new Date(draft.postedAt);
    return {
      amount: Number.isSafeInteger(draft.amountSen) && draft.amountSen > 0 ? (draft.amountSen / 100).toFixed(2) : '',
      note: draft.merchant ?? '',
      transactionDate: Number.isFinite(date.valueOf()) ? localDay(date) : '',
      transactionTime: Number.isFinite(date.valueOf()) ? date.toTimeString().slice(0, 5) : '',
    };
  };
  const reviewDraft = draft => {
    if (resolvingDraft.current) return;
    clearEntryExtras();
    const fields = draftFields(draft);
    setPaymentInboxVisible(false);
    setDraftId(draft.id);
    setFundingGoalId(null);
    setEditingId(null);
    setType(draft.type === 'transfer' ? 'transfer' : 'expense');
    setToAssetId(null);
    setAmount(fields.amount);
    setNote(fields.note);
    setTransactionDate(fields.transactionDate);
    setTransactionTime(fields.transactionTime);
    setSelectedCategory(draftCategory ?? null);
    setSelectedAssetId(draftAccount?.id ?? null);
    setModalVisible(true);
  };

  const resolveDraft = async (draft, accept) => {
    if (resolvingDraft.current || savingTransaction.current) return;
    const fields = draftFields(draft);
    if (accept && (draft.type === 'transfer' || !draftAccount || !draftCategory || !fields.amount || !fields.transactionDate)) {
      reviewDraft(draft);
      return;
    }
    resolvingDraft.current = true;
    setDraftBusy(draft.id);
    try {
      if (accept) {
        await handleSaveTransaction(true, {
          ...fields, draftId: draft.id, selectedAssetId: draftAccount.id, selectedCategory: draftCategory,
          type: 'expense', editingId: null, fundingGoalId: null, toAssetId: null,
          capturedAt: draft.postedAt,
          reimbursable: false, reimbursementFor: null, ruleDraft: null,
        });
      } else {
        await budgetStore.dismissDraft(draft.id);
        setDrafts(current => current.filter(item => item.id !== draft.id));
      }
    } catch (error) {
      showAlert('Could not update payment', error.message);
    } finally {
      resolvingDraft.current = false;
      setDraftBusy(null);
    }
  };

  const restoreBackup = () => restoreBudgetBackup(async data => {
    if (savingTransaction.current) throw new Error('Wait for the current record to finish saving, then try again.');
    savingTransaction.current = true;
    try {
      await budgetStore.restore(data);
      setCurrentPage('home');
      await loadData();
      await refreshCapture();
    } finally {
      savingTransaction.current = false;
    }
  }, storageStatus === 'ready' ? showAlert : Alert.alert);

  useEffect(() => {
    if (Platform.OS !== 'android' || storageStatus !== 'ready') return;
    const updateWidget = async () => {
      try {
        const totals = widgetTotals({ transactions, monthlyBudgets });
        await requestWidgetUpdate({
          widgetName: 'InfoWidget',
          renderWidget: () => <InfoWidget {...totals} />,
        });
        await requestWidgetUpdate({
          widgetName: 'ActionWidget',
          renderWidget: () => <ActionWidget />,
        });
      } catch {
        // Launcher or widget may be unavailable.
      }
    };
    updateWidget();
  }, [storageStatus, transactions, monthlyBudgets]);

  const receiptBack = receiptRoute?.from ?? 'home';
  const activityBack = activity.from;
  const tabPage = currentPage === 'transaction_detail' ? receiptBack : currentPage;

  useEffect(() => { openRecordSwipe.current?.(); }, [currentPage]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentPage === 'home') return false;
      const previous = { transaction_detail: receiptBack, activity: activityBack, asset_detail: 'assets', goal_detail: 'goals', recurring: 'settings' };
      setCurrentPage(previous[currentPage] ?? 'home');
      return true;
    });
    return () => subscription.remove();
  }, [currentPage, receiptBack, activityBack]);

  const openReceipt = (entry, from = currentPage) => {
    Keyboard.dismiss();
    setReceiptRoute({ id: entry.id, from });
    setCurrentPage('transaction_detail');
  };

  const openActivity = (filters = {}) => {
    setActivity({ from: 'home', period: 'monthly', date: currentMonth, query: '', account: null, category: null, type: null, day: 'all', ...filters });
    setCurrentPage('activity');
  };

  const monthKey = localDay(currentMonth).slice(0, 7);
  const monthlyBudget = monthlyBudgets[monthKey] ?? 0;
  const homeTransactions = transactions.filter(entry => entry.subType !== 'opening' &&
    transactionDay(entry.date).slice(0, 7) === monthKey);
  const homeGroups = groupTransactions([...homeTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3));
  const homeTotals = periodTotals(transactions, 'monthly', currentMonth, reimbursements);
  const homeSpending = homeTotals.expense;
  const allowance = dailyAllowances(currentMonth, monthlyBudget, homeSpending);
  const editBudget = () => {
    setNewBudgetAmount(monthlyBudget > 0 ? String(monthlyBudget) : '');
    setBudgetModalVisible(true);
  };

  const openNewTransaction = (template, accountId, goalId = null) => {
    if (savingTransaction.current) return;
    clearEntryExtras();
    Keyboard.dismiss();
    const now = new Date();
    const nextType = goalId != null ? 'transfer' : template?.type ?? 'expense';
    const choices = categories[nextType] ?? [];
    const sourceId = accountId ?? template?.assetId ?? lastUsedAssetId.current;
    const account = assets.find(asset => !asset.archived && asset.id === sourceId);
    setDraftId(null);
    setEditingId(null);
    setFundingGoalId(goalId);
    setAmount(template ? Math.abs(template.amount).toString() : '');
    setNote(template?.title ?? '');
    setType(nextType);
    setSelectedAssetId(account?.id ?? assets.find(asset => !asset.archived)?.id ?? null);
    setToAssetId(assets.find(asset => !asset.archived && asset.id === template?.toAssetId)?.id ?? null);
    setSelectedCategory(choices.find(category => category.id === template?.categoryId) ?? choices[0] ?? null);
    setTransactionDate(localDay(now));
    setTransactionTime(now.toTimeString().slice(0, 5));
    setModalVisible(true);
  };

  const openRepayment = entry => {
    if (savingTransaction.current) return;
    openNewTransaction(null, entry.assetId);
    setType('income');
    setSelectedCategory(categories.income.find(category => category.id === 'other') ?? categories.income[0] ?? null);
    setReimbursementFor(entry.id);
    setAmount(String(netExpense(entry, reimbursements.repaid)));
  };

  const openSchedule = rule => {
    if (savingTransaction.current) return;
    openNewTransaction(rule);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTransactionDate(rule?.nextDay ?? localDay(tomorrow));
    setTransactionTime(rule?.time ?? '09:00');
    setRuleDraft({ id: rule?.id ?? null, frequency: rule?.frequency ?? 'monthly', reminderDays: rule?.reminderDays ?? null });
  };

  const openNewAccount = requestedType => {
    setNewAssetName('');
    setNewAssetBalance('');
    setNewAccountType(requestedType === 'liability' ? 'liability' : 'asset');
    setAccountOverrides({});
    setEditingAssetId(null);
    setAdjustingAsset(false);
    setAssetModalVisible(true);
  };

  const openEditAsset = (asset, adjust = false) => {
    setNewAssetName(asset.name);
    setNewAccountType(asset.accountType ?? 'asset');
    setAccountOverrides(accountAppearance(asset));
    const today = localDay(new Date());
    setNewAssetBalance(String(adjust ? accountClosingBalance(asset, transactions, today) : asset.balance));
    setEditingAssetId(asset.id);
    setAdjustingAsset(adjust);
    if (adjust) setTransactionDate(today);
    setAssetModalVisible(true);
  };

  const handleAddAsset = async () => {
    if (savingTransaction.current) return;
    const name = newAssetName.trim();
    const balance = cents(Number(newAssetBalance.trim()));
    const editing = editingAssetId != null;
    if (!name) {
      showAlert('Enter an account name', 'Choose a name such as Wallet or Cash.');
      return;
    }
    if ((!editing || adjustingAsset) && (!Number.isSafeInteger(Math.round(balance * 100)) || (adjustingAsset && !newAssetBalance.trim()))) {
      showAlert('Invalid balance', 'Enter the balance in ringgit and sen.');
      return;
    }
    savingTransaction.current = true;
    try {
      if (editing) {
        const account = assets.find(asset => asset.id === editingAssetId);
        if (!account) return;
        if (adjustingAsset) {
          if (account.openingDate && transactionDate < account.openingDate) {
            showAlert('Choose a later date', 'The adjustment date must be on or after the account was opened.');
            return;
          }
          const adjustment = {
            id: Date.now(), type: 'transfer', subType: 'adjustment', title: 'Balance adjustment',
            amount: cents(balance - accountClosingBalance(account, transactions, transactionDate)),
            date: transactionDate, assetId: account.id, assetName: account.name,
          };
          const ledger = applyLedgerChange(assets, goals, null, adjustment);
          const updated = adjustment.amount ? [adjustment, ...transactions] : transactions;
          if (!await persist({ assets: ledger.assets, transactions: updated })) return;
          setAssets(ledger.assets);
          setTransactions(updated);
        } else {
          const updated = assets.map(asset => asset.id === editingAssetId ? { ...asset, name, ...selectedAccountAppearance } : asset);
          if (!await saveAssets(updated)) return;
          setAssets(updated);
        }
      } else {
        const id = Date.now();
        const openingDate = localDay(new Date());
        const openingAmount = newAccountType === 'liability' && balance !== 0 ? -Math.abs(balance) : balance;
        const account = { id, name, accountType: newAccountType, balance: 0, ...selectedAccountAppearance, openingAmount, openingDate };
        const entry = { id, type: 'transfer', subType: 'opening', title: 'Opening balance',
          amount: openingAmount, date: openingDate, assetId: id, assetName: account.name };
        const ledger = applyLedgerChange([...assets, account], goals, null, entry);
        const updated = [entry, ...transactions];
        if (!await persist({ assets: ledger.assets, transactions: updated, lastAsset: id })) return;
        setAssets(ledger.assets);
        setTransactions(updated);
        lastUsedAssetId.current = id;
        setSelectedAssetId(id);
      }
      setAssetModalVisible(false);
    } finally {
      savingTransaction.current = false;
    }
  };

  const closeAccountSheet = () => {
    if (savingTransaction.current) return;
    Keyboard.dismiss();
    setAssetModalVisible(false);
  };

  const pickImage = async () => {
    Keyboard.dismiss();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled) {
        const { base64, uri } = result.assets[0];
        revealGoalCover.current = !newGoalImage;
        setNewGoalImage({ uri, base64, picked: true });
      }
    } catch (error) {
      showAlert('Could not open cover picker', error.message);
    }
  };

  const closeGoal = () => {
    if (savingTransaction.current) return;
    revealGoalCover.current = false;
    Keyboard.dismiss();
    setGoalModalVisible(false);
  };

  const handleAddGoal = async () => {
    if (savingTransaction.current) return;
    const title = newGoalTitle.trim();
    const targetAmount = cents(Number(newGoalTarget));
    if (!title || !Number.isSafeInteger(Math.round(targetAmount * 100)) || targetAmount <= 0) {
      showAlert('Check the goal details', 'Enter a goal name and a positive target amount.');
      return;
    }

    const previous = goals.find(goal => goal.id === editingGoalId);
    const openingInput = newGoalStartingBalance.trim();
    const startingBalance = cents(Number(openingInput));
    if (!previous && openingInput && (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(openingInput) ||
      !Number.isSafeInteger(Math.round(startingBalance * 100)))) {
      showAlert('Check the starting balance', 'Enter a non-negative amount in ringgit and sen.');
      return;
    }

    savingTransaction.current = true;
    try {
      let backgroundImage = newGoalImage?.uri ?? null;
      if (newGoalImage?.picked) {
        backgroundImage = await saveGoalPicture(newGoalImage.uri, newGoalImage.base64);
        setNewGoalImage({ uri: backgroundImage });
      }
      const goal = { ...(previous ?? { id: Date.now(), savedAmount: startingBalance }), title, targetAmount,
        ...newGoalAppearance, targetDate: newGoalDate, backgroundImage };
      const updated = previous ? goals.map(item => item.id === previous.id ? goal : item) : [...goals, goal];
      if (!await saveGoals(updated)) return;
      setGoals(updated);
      revealGoalCover.current = false;
      Keyboard.dismiss();
      setGoalModalVisible(false);
    } catch (error) {
      showAlert('Could not save cover photo', error.message);
    } finally {
      savingTransaction.current = false;
    }
  };

  const openEditGoal = (goal) => {
    setNewGoalTitle(goal.title);
    setNewGoalTarget(String(goal.targetAmount ?? goal.target_amount));
    setNewGoalAppearance(goalAppearance(goal));
    setNewGoalImage(goal.backgroundImage ? { uri: goal.backgroundImage } : null);
    setNewGoalDate(goal.targetDate ?? null);
    setEditingGoalId(goal.id);
    setGoalModalVisible(true);
  };

  const handleDeleteTransaction = async target => {
    if (savingTransaction.current) return;
    if (transactions.some(entry => entry.reimbursementFor === target.id)) {
      showAlert('This expense has repayments', 'Unlink or delete the repayments before deleting this expense.');
      return;
    }
    savingTransaction.current = true;
    try {
      const ledger = applyLedgerChange(assets, goals, target, null);
      const updated = transactions.filter(transaction => transaction.id !== target.id);
      if (!await persist({ ...ledger, transactions: updated })) return;
      setAssets(ledger.assets);
      setTransactions(updated);
      setGoals(ledger.goals);
      if (receiptRoute?.id === target.id) {
        setCurrentPage(page => page === 'transaction_detail' ? receiptBack : page);
      }
    } finally {
      savingTransaction.current = false;
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      ...newCatAppearance,
    };

    const updatedCategories = { ...categories };
    if (type === 'expense') {
      updatedCategories.expense = [...updatedCategories.expense, newCat];
    } else {
      updatedCategories.income = [...updatedCategories.income, newCat];
    }

    if (!await saveCategories(updatedCategories)) return;
    setCategories(updatedCategories);
    setSelectedCategory(newCat);
    setNewCatName('');
    setNewCatAppearance(categoryAppearance());
    setCategoryModalVisible(false);
  };

  const handleSaveTransaction = (shouldClose, quickPayment) => commitTransaction(shouldClose, {
    amount, note, transactionDate, transactionTime, selectedAssetId, selectedCategory, type,
    toAssetId, editingId, draftId, fundingGoalId, reimbursable, reimbursementFor, ruleDraft, ...quickPayment,
  }, Boolean(quickPayment));

  const commitTransaction = async (shouldClose, {
    amount, note, transactionDate, transactionTime, selectedAssetId, selectedCategory, type,
    toAssetId, editingId, draftId, fundingGoalId, capturedAt, reimbursable, reimbursementFor, ruleDraft,
  }, quickPayment) => {
    if (savingTransaction.current) return;
    if (!amount) return;
    if (selectedAssetId == null) { showAlert('Choose an account', 'Select the account for this transaction.'); return; }

    const transAmount = calculateAmount(amount);
    if (!Number.isSafeInteger(Math.round(transAmount * 100)) || transAmount <= 0) {
      showAlert('Invalid amount', 'Enter a positive amount in ringgit and sen.');
      return;
    }
    const date = new Date(capturedAt ?? `${transactionDate}T${transactionTime}:00`);
    if (!Number.isFinite(date.valueOf())) {
      showAlert('Invalid date or time', 'Enter a time in HH:MM format.');
      return;
    }
    const selectedAsset = entryAccounts.find(asset => asset.id === selectedAssetId);
    if (!selectedAsset) return;

    const oldTransaction = editingId == null ? null : transactions.find(t => t.id === editingId);
    if (editingId != null && !oldTransaction) return;

    const isTransfer = type === 'transfer';
    const goalId = fundingGoalId ?? (oldTransaction?.subType === 'goal_deposit' ? oldTransaction.goalId : null);
    const fundingGoal = goals.find(goal => goal.id === goalId);
    const destination = isTransfer && goalId == null ? entryAccounts.find(asset => asset.id === toAssetId) : null;
    if (isTransfer && goalId == null && (!destination || destination.id === selectedAssetId)) {
      showAlert('Choose a destination', 'Select a different account to receive the transfer.');
      return;
    }
    const categoryList = categories[type] ?? DEFAULT_CATEGORIES[type];
    if (draftId && !isTransfer && !categoryList.some(item => item.id === selectedCategory?.id)) {
      showAlert('Choose a category', 'Select the category for this payment.');
      return;
    }
    const category = !isTransfer ? (categoryList.find(item => item.id === selectedCategory?.id)
      ?? categoryList[0] ?? DEFAULT_CATEGORIES[type][0]) : null;
    const transaction = {
      ...oldTransaction,
      id: oldTransaction?.id ?? Date.now(),
      title: note.trim() || (fundingGoal ? 'Deposit to ' + fundingGoal.title : isTransfer ? 'Transfer' : categoryLabel(category)),
      note: note.trim() || undefined,
      merchant: draftId ? drafts.find(item => item.id === draftId)?.merchant ?? oldTransaction?.merchant : oldTransaction?.merchant,
      date: date.toISOString(),
      amount: type === 'expense' ? -transAmount : transAmount,
      ...categoryAppearance(category, { type, subType: goalId != null ? 'goal_deposit' : undefined }),
      type,
      assetName: selectedAsset.name,
      assetId: selectedAsset.id,
      categoryId: isTransfer ? 'transfer' : category.id,
      subType: goalId != null ? 'goal_deposit' : destination ? 'internal' : undefined,
      goalId: goalId ?? undefined,
      goalName: fundingGoal?.title ?? oldTransaction?.goalName,
      source: draftId ? 'tng' : oldTransaction?.source,
      paymentDraftId: draftId ?? oldTransaction?.paymentDraftId,
      toAssetId: destination?.id,
      toAssetName: destination?.name,
      reimbursable: type === 'expense' && reimbursable ? true : undefined,
      reimbursementFor: type === 'income' && reimbursementFor != null ? reimbursementFor : undefined,
    };
    if (ruleDraft) {
      await saveSchedule(ruleDraft, transaction, transactionDate, transactionTime);
      return;
    }
    const issue = reimbursementIssue(transaction, transactions);
    if (issue) { showAlert('Check the reimbursement', issue); return; }
    const ledger = applyLedgerChange(assets, goals, oldTransaction, transaction);
    const updatedTransactions = oldTransaction
      ? transactions.map(t => t.id === editingId ? transaction : t)
      : [transaction, ...transactions];
    const rememberAccount = editingId == null && draftId == null && fundingGoalId == null;

    savingTransaction.current = true;
    try {
      const saved = await persist({
        ...ledger,
        transactions: updatedTransactions,
        ...(rememberAccount ? { lastAsset: selectedAssetId } : {}),
      }, draftId);
      if (saved === false && draftId) {
        setDrafts(current => current.filter(draft => draft.id !== draftId));
        if (!quickPayment) {
          setModalVisible(false);
          setDraftId(null);
          setPaymentInboxVisible(true);
        }
        showAlert('Payment already reviewed', 'This payment is no longer pending.');
        return;
      }
      if (!saved) return;
      if (rememberAccount) lastUsedAssetId.current = selectedAssetId;
      if (draftId) setDrafts(current => current.filter(draft => draft.id !== draftId));
      setAssets(ledger.assets);
      setTransactions(updatedTransactions);
      setGoals(ledger.goals);
    } finally {
      savingTransaction.current = false;
    }

    if (quickPayment) return;
    if (shouldClose) {
      setAmount(''); setNote(''); closeTransaction();
    } else {
      // Save & Continue: Clear specific fields, keep Date/Time/Category/Asset
      setAmount('');
      setNote('');
      clearEntryExtras();
      setEditingId(null); // Switch to 'add' mode for next one if we were editing (though typically this button is for adding)
      showAlert('Transaction saved', 'You can add another entry.');
    }
  };

  const openEditTransactionModal = (transaction) => {
    clearEntryExtras();
    setReimbursable(Boolean(transaction.reimbursable));
    setReimbursementFor(transaction.reimbursementFor ?? null);
    setDraftId(null);
    setFundingGoalId(null);
    setAmount(Math.abs(transaction.amount).toString());
    setNote(transaction.title ?? '');
    setType(transaction.type);
    setSelectedAssetId(transaction.assetId ?? null);
    setToAssetId(transaction.toAssetId ?? null);
    if (transaction.categoryId) {
      const catGroup = transaction.type === 'expense' ? categories.expense : categories.income;
      const foundCat = catGroup.find(c => c.id === transaction.categoryId);
      if (foundCat) setSelectedCategory(foundCat);
    }

    // Populate Date/Time
    const tDate = new Date(transaction.date);
    setTransactionDate(transactionDay(transaction.date));
    setTransactionTime(transaction.date.includes('T') ? tDate.toTimeString().slice(0, 5) : '12:00');

    setEditingId(transaction.id);
    setModalVisible(true);
  };

  const saveSchedule = async (draft, entry, day, time) => {
    const nextDate = new Date(day + 'T' + time + ':00');
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(nextDate.valueOf()) ||
      localDay(nextDate) !== day || day < localDay(new Date())) {
      showAlert('Choose the next due date', 'Use today or a future date and enter the time in HH:MM format.');
      return;
    }
    const previous = recurringRules.find(rule => rule.id === draft.id);
    const rule = {
      id: previous?.id ?? Date.now(), type: entry.type, title: entry.title, amount: Math.abs(entry.amount),
      assetId: entry.assetId, toAssetId: entry.toAssetId, categoryId: entry.categoryId,
      frequency: draft.frequency, reminderDays: draft.reminderDays, nextDay: day, time,
      startDay: previous?.nextDay === day && previous.frequency === draft.frequency ? previous.startDay : day,
    };
    const updated = previous ? recurringRules.map(item => item.id === rule.id ? rule : item) : [...recurringRules, rule];
    savingTransaction.current = true;
    let saved = false;
    try {
      if (rule.reminderDays != null) await requestReminderPermission().catch(() => false);
      saved = await persist({ recurringRules: updated });
      if (saved) setRecurringRules(updated);
    } finally {
      savingTransaction.current = false;
    }
    if (saved) closeTransaction();
  };

  const removeSchedule = rule => showAlert('Delete this schedule?', 'Entries already recorded will stay in your ledger.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete schedule', style: 'destructive', onPress: async () => {
      if (savingTransaction.current) return;
      savingTransaction.current = true;
      try {
        const remaining = recurringRules.filter(item => item.id !== rule.id);
        if (await persist({ recurringRules: remaining })) setRecurringRules(remaining);
      } finally {
        savingTransaction.current = false;
      }
    } },
  ]);

  const remainingForRepayment = entry => cents(netExpense(entry, reimbursements.repaid) +
    (editedEntry?.reimbursementFor === entry.id ? Math.abs(editedEntry.amount) : 0));
  const reimbursementExpenses = type === 'income' && modalVisible && !ruleDraft ? transactions
    .filter(entry => entry.type === 'expense' && entry.reimbursable &&
      entry.id !== editingId && (entry.id === reimbursementFor || remainingForRepayment(entry) > 0))
    .sort((first, second) => new Date(second.date) - new Date(first.date)) : [];

  const accountMenu = account => showAlert(account.name, 'Manage this account', [
    { text: 'Edit account', onPress: () => openEditAsset(account) },
    ...(!account.archived ? [{ text: 'Adjust balance', onPress: () => openEditAsset(account, true) }] : []),
    {
      text: account.archived ? 'Unarchive account' : 'Archive account',
      onPress: async () => {
        if (savingTransaction.current) return;
        savingTransaction.current = true;
        try {
          const updated = assets.map(asset => asset.id === account.id ? { ...asset, archived: !account.archived } : asset);
          if (!await saveAssets(updated)) return;
          setAssets(updated);
          if (lastUsedAssetId.current === account.id && !account.archived) {
            lastUsedAssetId.current = updated.find(asset => !asset.archived)?.id ?? null;
          }
        } finally {
          savingTransaction.current = false;
        }
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const openNewGoal = () => {
    setEditingGoalId(null);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setNewGoalAppearance(goalAppearance({}));
    setNewGoalImage(null);
    setNewGoalDate(null);
    setNewGoalStartingBalance('');
    setGoalModalVisible(true);
  };

  const toggleGoalPin = async goal => {
    if (savingTransaction.current) return;
    savingTransaction.current = true;
    try {
      const updated = goals.map(item => item.id === goal.id ? { ...item, pinned: !item.pinned } : item);
      if (await saveGoals(updated)) setGoals(updated);
    } finally {
      savingTransaction.current = false;
    }
  };

  const goalMenu = goal => showAlert(goal.title, 'Manage this savings goal', [
    { text: 'Edit goal', onPress: () => openEditGoal(goal) },
    { text: goal.pinned ? 'Unpin goal' : 'Pin goal', onPress: () => toggleGoalPin(goal) },
    ...((goal.savedAmount ?? goal.saved_amount) === 0 ? [{
      text: 'Delete goal', style: 'destructive', onPress: () => showAlert('Delete this goal?', goal.title, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete goal', style: 'destructive', onPress: async () => {
          const updated = goals.filter(item => item.id !== goal.id);
          if (!await saveGoals(updated)) return;
          setGoals(updated);
          setCurrentPage('goals');
        } },
      ]),
    }] : []),
    { text: 'Cancel', style: 'cancel' },
  ]);

  const confirmDeleteTransaction = entry => showAlert('Delete this transaction?', 'The balances will be updated to remove this entry.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete transaction', style: 'destructive', onPress: () => handleDeleteTransaction(entry) },
  ]);

  const receiptMenu = entry => showAlert('Receipt options', '', [
    ...(canCopyTransaction(entry) ? [{ text: 'Copy transaction', onPress: () => openNewTransaction(entry) }] : []),
    { text: 'Delete transaction', style: 'destructive', onPress: () => confirmDeleteTransaction(entry) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const exportToCSV = async () => {
    if (!transactions.length) {
      showAlert('No transactions to export', 'Your activity will appear in this export after you record an entry.');
      return;
    }
    try {
      const headers = ['Date', 'Time', 'Type', 'Category', 'Amount', 'From or account', 'To', 'Note'];
      const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
      const rows = transactions.map(entry => {
        const category = categories[entry.type]?.find(item => item.id === entry.categoryId);
        const typeLabel = { opening: 'Opening balance', adjustment: 'Balance adjustment', goal_deposit: 'Goal deposit' }[entry.subType] ?? entry.type;
        const time = entry.date.includes('T') ? new Date(entry.date).toTimeString().slice(0, 5) : '';
        return [transactionDay(entry.date), time, typeLabel, categoryLabel(category, entry.categoryId), entry.amount.toFixed(2),
          entry.assetName, entry.toAssetName ?? entry.goalName, entry.title];
      });
      const uri = FileSystem.cacheDirectory + 'mybudget-transactions.csv';
      const csv = [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Share transactions' });
      } else {
        showAlert('Sharing unavailable', 'This device cannot open the share sheet.');
      }
    } catch (error) {
      showAlert('Could not export transactions', error.message);
    }
  };

  const openInbox = () => {
    refreshCapture();
    setPaymentInboxVisible(true);
  };

  const recordActions = { openSwipe: openRecordSwipe, reduced, canCopy: canCopyTransaction,
    onCopy: openNewTransaction, onDelete: confirmDeleteTransaction };

  const renderSettingsScreen = () => (
    <BudgetSettings
      capture={captureStatus}
      captureError={captureError}
      drafts={drafts}
      onToggle={enabled => captureAction(() => tngCapture.setEnabled(enabled))}
      onSettings={() => captureAction(() => tngCapture.openSettings())}
      onReplay={__DEV__ && captureStatus?.canReplay ? () => captureAction(() => tngCapture.replaySamples()) : undefined}
      onRefresh={refreshCapture}
      onInbox={openInbox}
      onBackup={async () => {
        try {
          const stored = await budgetStore.read();
          const missingImages = await exportBudgetBackup({
            transactions: [], assets: [], goals: [], categories: DEFAULT_CATEGORIES,
            monthlyBudgets: {}, recurringRules: [], lastAsset: null, ...stored,
          });
          if (missingImages) showAlert('Some goal pictures were unavailable', 'The backup file includes the goal records and any available pictures.');
        } catch (error) {
          showAlert('Could not export backup', error.message);
        }
      }}
      onRestore={restoreBackup}
      onExportCsv={exportToCSV}
      onSchedules={() => setCurrentPage('recurring')}
    />
  );

  if (storageStatus !== 'ready') {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: pocket.paper }}>
        <Text style={{ color: pocket.ink, fontSize: 18 }}>
          {storageStatus === 'loading' ? 'Opening your budget…' : storageStatus}
        </Text>
        {storageStatus !== 'loading' && (
          <>
            <TouchableOpacity onPress={() => { setStorageStatus('loading'); loadData(); }}>
              <Text style={[styles.linkText, { paddingVertical: 16 }]}>Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={restoreBackup}>
              <Text style={[styles.linkText, { paddingVertical: 16 }]}>Restore from backup</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1, paddingTop: androidTopInset }}
        edges={Platform.OS === 'android' ? ['left', 'right'] : ['top', 'left', 'right']}>
        <StatusBar style="dark" />

        <View style={{ flex: 1 }}>
          {(tabPage === 'home' || tabPage === 'budget' || tabPage === 'goals' || tabPage === 'goal_detail' || (tabPage === 'activity' && activityBack === 'home')) && (
            <View style={[styles.route, currentPage !== 'home' && styles.hiddenRoute]}>
              <BudgetHome
                month={currentMonth} spending={homeSpending} budget={monthlyBudget} allowance={allowance[0]} hasAccounts={hasAccounts}
                income={homeTotals.income} cashFlow={homeTotals.cashFlow}
                drafts={drafts.length} groups={homeGroups} categories={categories}
                onMonth={() => setMonthModalVisible(true)}
                onBudget={() => setCurrentPage('budget')}
                onActivity={() => openActivity()}
                onInbox={openInbox} onRecord={() => openNewTransaction()}
                onTransaction={openReceipt} recordActions={recordActions}
                onGoals={() => setCurrentPage('goals')}
                onAddAccount={openNewAccount} onRestore={restoreBackup}
              />
            </View>
          )}
          {(tabPage === 'budget' || (tabPage === 'activity' && activityBack === 'budget')) && (
            <View style={[styles.route, currentPage !== 'budget' && styles.hiddenRoute]}>
              <BudgetPlan month={currentMonth} budget={monthlyBudget} allowance={allowance} transactions={homeTransactions} categories={categories}
                reimbursements={reimbursements}
                onMonth={() => setMonthModalVisible(true)} onEdit={editBudget} onBack={() => setCurrentPage('home')}
                onCategory={category => openActivity({ from: 'budget', type: 'expense', category })}
                onOpen={openReceipt} recordActions={recordActions} />
            </View>
          )}
          {(tabPage === 'goals' || tabPage === 'goal_detail') && (
            <View style={[styles.route, currentPage !== 'goals' && styles.hiddenRoute]}>
              <SavingsGoals goals={goals} onBack={() => setCurrentPage('home')}
                onGoal={goal => { setActiveGoalId(goal.id); setCurrentPage('goal_detail'); }}
                onNewGoal={openNewGoal} onPinGoal={toggleGoalPin} />
            </View>
          )}
          {(currentPage === 'stats' || (currentPage === 'activity' && activityBack === 'stats') ||
            (currentPage === 'transaction_detail' && receiptBack === 'activity' && activityBack === 'stats')) && (
            <View style={[styles.route, currentPage !== 'stats' && styles.hiddenRoute]}>
              <BudgetStats transactions={transactions} categories={categories}
                period={statsRange} date={statsDate}
                onPeriod={setStatsRange} onDate={setStatsDate}
                onCategory={(type, category) => openActivity({ from: 'stats', period: statsRange, date: statsDate, type, category })}
                onPickPeriod={() => {
                  if (statsRange === 'monthly') setMonthModalVisible(true);
                  else { setCalendarCursor(new Date(statsDate)); setCalendarVisible(true); }
                }}
              />
            </View>
          )}
          {(currentPage === 'activity' || (currentPage === 'transaction_detail' && receiptBack === 'activity')) && (
            <View style={[styles.route, currentPage !== 'activity' && styles.hiddenRoute]}>
              <BudgetActivity transactions={transactions} accounts={assets} categories={categories}
                filters={activity} onChange={changes => setActivity(previous => ({ ...previous, ...changes }))}
                onMonth={() => setMonthModalVisible(true)} onBack={() => setCurrentPage(activityBack)}
                onOpen={openReceipt} recordActions={recordActions} />
            </View>
          )}
          {(tabPage === 'assets' || tabPage === 'asset_detail') && (
            <View style={[styles.route, currentPage !== 'assets' && styles.hiddenRoute]}>
              <BudgetAssets accounts={assets} goals={goals} transactions={transactions} onAdd={openNewAccount}
                onAddLiability={() => openNewAccount('liability')}
                onOpen={item => { setActiveAssetId(item.id); setCurrentPage('asset_detail'); }} />
            </View>
          )}
          {activeAsset && (currentPage === 'asset_detail' || (currentPage === 'transaction_detail' && receiptBack === 'asset_detail')) && (
            <View style={[styles.route, currentPage !== 'asset_detail' && styles.hiddenRoute]}>
              <AccountDetail account={activeAsset} transactions={transactions} categories={categories}
                onBack={() => setCurrentPage('assets')} onMenu={() => accountMenu(activeAsset)}
                onRecord={() => openNewTransaction(null, activeAsset.id)} onAdjust={() => openEditAsset(activeAsset, true)}
                onReceipt={openReceipt} recordActions={recordActions} />
            </View>
          )}
          {activeGoal && (currentPage === 'goal_detail' || (currentPage === 'transaction_detail' && receiptBack === 'goal_detail')) && (
            <View style={[styles.route, currentPage !== 'goal_detail' && styles.hiddenRoute]}>
              <GoalDetail goal={activeGoal} transactions={transactions} categories={categories}
                onBack={() => setCurrentPage('goals')} onMenu={() => goalMenu(activeGoal)}
                onDeposit={() => openNewTransaction(null, null, activeGoal.id)} onReceipt={openReceipt} recordActions={recordActions} />
            </View>
          )}
          {currentPage === 'transaction_detail' && activeTransaction && (
            <Receipt key={activeTransaction.id} entry={activeTransaction} categories={categories}
              goalName={goals.find(goal => goal.id === activeTransaction.goalId)?.title ?? activeTransaction.goalName}
              originalExpense={originalExpense} repayments={linkedRepayments}
              netCost={netExpense(activeTransaction, reimbursements.repaid)}
              onOpenRelated={entry => openReceipt(entry, receiptBack)}
              onAddRepayment={hasAccounts && activeTransaction.reimbursable && netExpense(activeTransaction, reimbursements.repaid) > 0
                ? () => openRepayment(activeTransaction) : undefined}
              backLabel={{ activity: 'Records', budget: 'Budget', asset_detail: activeAsset?.name, goal_detail: activeGoal?.title }[receiptBack] ?? 'Home'}
              onBack={() => setCurrentPage(receiptBack)} onMenu={() => receiptMenu(activeTransaction)}
              onEdit={activeTransaction.subType !== 'adjustment' ? () => openEditTransactionModal(activeTransaction) : undefined} />
          )}
          {currentPage === 'settings' && renderSettingsScreen()}
          {viewingRecurring && (
            <ScheduledTransactions rules={recurringRules} assets={assets} reminderIssue={reminderIssue}
              onBack={() => setCurrentPage('settings')} onAdd={() => openSchedule()} onEdit={openSchedule}
              onDelete={removeSchedule} onReminderSettings={Platform.OS !== 'web' ? () => Linking.openSettings() : undefined} />
          )}
        </View>

        {/* Footer Navigation */}
        <BudgetNavigation
          page={tabPage === 'activity' ? activityBack : tabPage}
          onNavigate={page => { Keyboard.dismiss(); setCurrentPage(page); }}
          inset={insets.bottom}
        />

        {/* --- Modals --- */}
        {assetModalVisible && (
          <PocketSheet compact title={adjustingAsset ? 'Adjust balance' : editingAssetId != null ? 'Edit account' : 'New account'}
            onClose={closeAccountSheet}
            footer={() => (
              <View style={styles.modalButtons}>
                <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.cancelButton]} onPress={closeAccountSheet}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.saveButton]} onPress={handleAddAsset}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}>
            <ScrollView style={styles.scrollingForm} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {editingAssetId == null && (
                <View style={styles.accountTypes}>
                  {[['asset', 'Asset'], ['liability', 'Liability']].map(([id, label]) => (
                    <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected: id === newAccountType }}
                      onPress={() => setNewAccountType(id)}
                      style={[styles.accountType, id === newAccountType && styles.accountTypeSelected]}>
                      <Text style={[styles.accountTypeLabel, id === newAccountType && styles.accountTypeLabelSelected]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!adjustingAsset && (
                <>
                  <Text style={styles.inputLabel}>Account name</Text>
                  <TextInput accessibilityLabel="Account name" style={styles.input} value={newAssetName}
                    onChangeText={setNewAssetName} returnKeyType="done" />
                </>
              )}
              {(editingAssetId == null || adjustingAsset) && (
                <>
                  <Text style={styles.inputLabel}>{adjustingAsset ? 'New recorded balance (RM)' :
                    newAccountType === 'liability' ? 'Amount owed (RM, optional)' : 'Opening balance (RM, optional)'}</Text>
                  <TextInput accessibilityLabel={adjustingAsset ? 'New recorded balance' : newAccountType === 'liability' ? 'Amount owed' : 'Opening balance'}
                    style={[styles.input, pocketLayout.figures]}
                    placeholder="0.00" placeholderTextColor={pocket.muted} keyboardType="numeric"
                    value={newAssetBalance} onChangeText={setNewAssetBalance} returnKeyType="done" />
                  {adjustingAsset && newAccountType === 'liability' && (
                    <Text style={styles.inputLabel}>Use a negative balance for money owed.</Text>
                  )}
                </>
              )}
              {!adjustingAsset && (
                <>
                  <Text style={styles.inputLabel}>Account icon and color</Text>
                  <IconPicker appearance={selectedAccountAppearance} suggestedIcons={accountIconKeys}
                    onChange={choice => setAccountOverrides(previous => ({ ...previous, ...choice }))} />
                </>
              )}
              {adjustingAsset && (
                <>
                  <Text style={styles.inputLabel}>Adjustment date</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Choose adjustment date, ' + transactionDate} style={styles.input}
                    onPress={() => { Keyboard.dismiss(); setCalendarCursor(new Date(transactionDate + 'T12:00:00')); setCalendarVisible(true); }}>
                    <Text style={styles.linkText}>{transactionDate}</Text>
                  </TouchableOpacity>
                </>
              )}

            </ScrollView>
          </PocketSheet>
        )}

        <Modal animationType={reduced ? 'none' : 'slide'} transparent visible={goalModalVisible} onRequestClose={closeGoal}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainerCenter}>
            <View style={styles.modalContentCenter}>
              <Text accessibilityRole="header" style={styles.modalTitle}>{editingGoalId != null ? 'Edit savings goal' : 'New savings goal'}</Text>
              <ScrollView ref={goalFormScroll} style={styles.scrollingForm} contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled" onContentSizeChange={() => {
                  if (!revealGoalCover.current) return;
                  revealGoalCover.current = false;
                  goalFormScroll.current?.scrollToEnd({ animated: !reduced });
                }}>
                <Text style={styles.inputLabel}>Goal name</Text>
                <TextInput accessibilityLabel="Goal name" style={styles.input} placeholder="e.g. New laptop" placeholderTextColor={pocket.muted} value={newGoalTitle} onChangeText={setNewGoalTitle} />
                <Text style={styles.inputLabel}>Target amount (RM)</Text>
                <TextInput accessibilityLabel="Target amount" style={[styles.input, pocketLayout.figures]} placeholder="0.00" placeholderTextColor={pocket.muted} keyboardType="numeric" value={newGoalTarget} onChangeText={setNewGoalTarget} />

                <Text style={styles.inputLabel}>Target date (optional)</Text>
                <View style={styles.goalDateRow}>
                  <TextAction icon="calendar" label={newGoalDate
                    ? new Date(newGoalDate + 'T12:00:00').toLocaleDateString('en-MY', { dateStyle: 'medium' })
                    : 'Choose a date'} onPress={() => {
                      Keyboard.dismiss();
                      setCalendarCursor(newGoalDate ? new Date(newGoalDate + 'T12:00:00') : new Date());
                      setGoalDateVisible(true);
                    }} />
                  {newGoalDate && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear target date"
                    onPress={() => setNewGoalDate(null)} style={styles.clearGoalOption}><PocketIcon name="close" size={18} /></TouchableOpacity>}
                </View>
                {editingGoalId == null && (
                  <>
                    <Text style={styles.inputLabel}>Starting balance (RM, optional)</Text>
                    <TextInput accessibilityLabel="Starting balance" style={[styles.input, pocketLayout.figures]}
                      placeholder="0.00" placeholderTextColor={pocket.muted} keyboardType="decimal-pad"
                      value={newGoalStartingBalance} onChangeText={setNewGoalStartingBalance} />
                  </>
                )}

                <Text style={styles.inputLabel}>Goal icon</Text>
                <View style={[styles.goalChoices, styles.goalIconGrid]}>
                  {[...new Set([...goalIconKeys, newGoalAppearance.iconKey])].map(iconKey => {
                    const active = newGoalAppearance.iconKey === iconKey;
                    return (
                      <TouchableOpacity key={iconKey} accessibilityRole="button" accessibilityLabel={iconCatalog[iconKey][0]}
                        accessibilityState={{ selected: active }}
                        onPress={() => setNewGoalAppearance(previous => ({ ...previous, iconKey }))}
                        style={[styles.goalIconTile, { backgroundColor: goalSwatch.fill }, active && styles.goalChoiceSelected]}>
                        <IdentityIcon iconKey={iconKey} color={goalSwatch.ink} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.inputLabel}>Goal colour</Text>
                <View style={styles.goalChoices}>
                  {goalColors.map(([name, colorKey]) => (
                    <TouchableOpacity key={name} accessibilityRole="button" accessibilityLabel={name}
                      accessibilityState={{ selected: newGoalAppearance.colorKey === colorKey }}
                      onPress={() => setNewGoalAppearance(previous => ({ ...previous, colorKey }))}
                      style={[styles.swatch, { backgroundColor: pastelSwatches[colorKey].fill },
                        newGoalAppearance.colorKey === colorKey && styles.goalChoiceSelected]}>
                      <Text style={styles.swatchLabel}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Cover photo (optional)</Text>
                <Text style={styles.goalHelper}>A cover photo replaces the icon on your goal card.</Text>
                {newGoalImage ? (
                  <View style={styles.goalCoverRow}>
                    <Image accessibilityLabel="Cover photo preview" source={{ uri: newGoalImage.uri }} style={styles.goalCover} resizeMode="cover" />
                    <View style={styles.goalCoverActions}>
                      <TextAction icon="edit" label="Re-crop / Change" onPress={pickImage} />
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove cover photo"
                        onPress={() => setNewGoalImage(null)} style={styles.clearGoalOption}><PocketIcon name="close" size={18} /></TouchableOpacity>
                    </View>
                  </View>
                ) : <TextAction label="Choose a square cover" onPress={pickImage} />}
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.cancelButton]} onPress={closeGoal}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={[styles.modalButton, styles.saveButton]} onPress={handleAddGoal}><Text style={styles.saveButtonText}>Save goal</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        {goalDateVisible && (
          <DatePicker title="Choose target date" date={newGoalDate} cursor={calendarCursor} onMonth={setCalendarCursor}
            onSelect={date => { setNewGoalDate(date); setGoalDateVisible(false); }} onClose={() => setGoalDateVisible(false)} />
        )}

        {paymentInboxVisible && (
          <PaymentInbox drafts={drafts} busy={draftBusy} account={draftAccount?.name}
            category={draftCategory ? categoryLabel(draftCategory) : null}
            onReview={reviewDraft} onDecline={draft => resolveDraft(draft, false)} onAccept={draft => resolveDraft(draft, true)}
            onClose={() => { if (!resolvingDraft.current) setPaymentInboxVisible(false); }} />
        )}

        {modalVisible && !assetModalVisible && (
          <TransactionEntry
            amount={amount} setAmount={setAmount} note={note} setNote={setNote} type={type} onType={setType}
            assets={entryAccounts} onAddAccount={openNewAccount} selectedAssetId={selectedAssetId} onAsset={setSelectedAssetId}
            toAssetId={toAssetId} onDestination={setToAssetId}
            categories={categories[type] ?? []} category={selectedCategory} onCategory={setSelectedCategory}
            onNewCategory={() => { Keyboard.dismiss(); setCategoryModalVisible(true); }}
            date={transactionDate} time={transactionTime} onTime={setTransactionTime}
            onDate={() => {
              Keyboard.dismiss();
              const date = new Date(transactionDate + 'T12:00:00');
              setCalendarCursor(Number.isNaN(date.valueOf()) ? new Date() : date);
              setCalendarVisible(true);
            }}
            editing={editingId != null} draft={draftId != null} goalDeposit={editingGoalDeposit} goalName={goals.find(goal => goal.id === (fundingGoalId ?? editedEntry?.goalId))?.title}
            split={reimbursable} onSplit={setReimbursable}
            linkedExpense={reimbursementExpenses.find(entry => entry.id === reimbursementFor)?.title}
            onLinkExpense={reimbursementExpenses.length ? () => { Keyboard.dismiss(); setReimbursementPicker(true); } : undefined}
            schedule={ruleDraft} onScheduleChange={setRuleDraft}
            onSave={handleSaveTransaction} onClose={closeTransaction}
          />
        )}
        {reimbursementPicker && (
          <FilterPicker title="Link repayment to expense" selected={reimbursementFor}
            options={[{ id: null, label: 'No linked expense' }, ...reimbursementExpenses.map(entry => ({
              id: entry.id,
              label: (entry.title || 'Expense') + ' · ' + dateLabel(transactionDay(entry.date)) + ' · ' + money(remainingForRepayment(entry)) + ' left',
            }))]} onClose={() => setReimbursementPicker(false)}
            onSelect={id => { setReimbursementFor(id); setReimbursementPicker(false); }} />
        )}
        {categoryModalVisible && (
          <NewCategory name={newCatName} appearance={newCatAppearance} onName={setNewCatName}
            onAppearance={choice => setNewCatAppearance(previous => ({ ...previous, ...choice }))}
            onSave={handleAddCategory} onClose={() => setCategoryModalVisible(false)} />
        )}
        {calendarVisible && (
          <DatePicker date={!modalVisible && !assetModalVisible && currentPage === 'stats' ? localDay(statsDate) : transactionDate}
            cursor={calendarCursor} onMonth={setCalendarCursor}
            onSelect={date => {
              if (!modalVisible && !assetModalVisible && currentPage === 'stats') setStatsDate(new Date(date + 'T12:00:00'));
              else {
                const account = assetModalVisible && adjustingAsset && assets.find(asset => asset.id === editingAssetId);
                if (account && newAssetBalance === String(accountClosingBalance(account, transactions, transactionDate))) {
                  setNewAssetBalance(String(accountClosingBalance(account, transactions, date)));
                }
                setTransactionDate(date);
              }
              setCalendarVisible(false);
            }}
            onClose={() => setCalendarVisible(false)} />
        )}
        {monthModalVisible && (
          <MonthPicker month={currentPage === 'stats' ? statsDate : currentPage === 'activity' ? activity.date : currentMonth} onClose={() => setMonthModalVisible(false)}
            onSelect={month => {
              if (currentPage === 'stats') setStatsDate(month);
              else if (currentPage === 'activity') setActivity(previous => ({ ...previous, date: month, day: 'all', period: 'monthly' }));
              else setCurrentMonth(month);
              setMonthModalVisible(false);
            }} />
        )}
        {budgetModalVisible && (
          <BudgetLimit value={newBudgetAmount} onChange={setNewBudgetAmount}
            onClose={() => setBudgetModalVisible(false)} onSave={async amount => {
              if (savingTransaction.current) return;
              savingTransaction.current = true;
              try {
                const budgets = { ...monthlyBudgets, [monthKey]: cents(amount) };
                if (budgets[monthKey] <= 0) delete budgets[monthKey];
                if (!await persist({ monthlyBudgets: budgets })) return;
                setMonthlyBudgets(budgets);
                setBudgetModalVisible(false);
              } finally {
                savingTransaction.current = false;
              }
            }} />
        )}

        <CustomAlert reduced={reduced} visible={alertVisible} title={alertConfig.title} message={alertConfig.message}
          buttons={alertConfig.buttons} onClose={() => setAlertVisible(false)} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  route: { flex: 1 },
  hiddenRoute: { display: 'none' },
  container: { flex: 1, backgroundColor: theme.colors.background },

  linkText: { color: theme.colors.primary, fontSize: 14 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 4, marginTop: 5 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, borderRadius: 12, padding: 16, fontSize: 18, borderWidth: 1, borderColor: theme.colors.border },
  scrollingForm: { flexGrow: 0, flexShrink: 1 },
  accountTypes: { flexDirection: 'row', gap: 4, padding: 4, marginBottom: 6, borderRadius: 14, backgroundColor: '#F0E7DF' },
  accountType: { flex: 1, minHeight: 44, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  accountTypeSelected: { backgroundColor: pocket.white },
  accountTypeLabel: { color: pocket.muted, fontWeight: '700', fontSize: 14 },
  accountTypeLabelSelected: { color: pocket.action },

  modalContainerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2F29266E' },
  form: { paddingBottom: 8 },
  goalChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalIconGrid: { justifyContent: 'space-between' },
  goalDateRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  goalIconTile: { width: '22%', minWidth: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    borderColor: 'transparent', borderRadius: 12 },
  goalChoiceSelected: { borderColor: pocket.action },
  goalHelper: { color: pocket.muted, fontSize: 13, marginBottom: 6 },
  goalCoverRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  goalCover: { width: 80, aspectRatio: 1, borderRadius: 10 },
  goalCoverActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flexShrink: 1 },
  clearGoalOption: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: pocket.paper },
  swatch: { minWidth: 48, minHeight: 48, paddingHorizontal: 8, justifyContent: 'center', borderWidth: 2,
    borderColor: 'transparent', borderRadius: 8 },
  swatchLabel: { color: pocket.ink, fontSize: 14 },
  modalContentCenter: { width: '92%', maxWidth: 420, maxHeight: '92%', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: pocket.line },
  modalTitle: { color: theme.colors.text, fontSize: 23, fontWeight: 'bold', marginBottom: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: theme.colors.surfaceHighlight, marginRight: 10 },
  saveButton: { backgroundColor: theme.colors.primary, marginLeft: 10 },
  cancelButtonText: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  saveButtonText: { color: pocket.white, fontWeight: 'bold', fontSize: 16 },

});
