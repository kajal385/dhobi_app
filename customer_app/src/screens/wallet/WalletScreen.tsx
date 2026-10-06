import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS, DARK_COLORS, SPACING, SIZES } from '../../constants/theme';
import AppScreen from '../../components/AppScreen';
import { RootState } from '../../store';
import { setWallet, setTransactions, addTransaction, walletLoading } from '../../store/walletSlice';
import { updateProfile } from '../../store/authSlice';
import { walletService } from '../../services/walletService';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { WalletTransaction } from '../../types';
import Toast from 'react-native-toast-message';

const ADD_AMOUNTS = [100, 250, 500, 1000];

export const WalletScreen = ({ navigation }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const dispatch = useDispatch();
  const { balance, transactions, loading } = useSelector((s: RootState) => s.wallet);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchWallet = useCallback(async () => {
    dispatch(walletLoading());
    try {
      const [wallet, txRes] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(),
      ]);
      dispatch(setWallet(wallet));
      dispatch(setTransactions(txRes.data));
      dispatch(updateProfile({ wallet_balance: String(wallet.balance) }));
    } catch (e: any) {
      console.warn('Could not load wallet', e);
    }
  }, [dispatch]);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWallet();
    setRefreshing(false);
  };

  const handleAddMoney = async (amount: number) => {
    try {
      const res = await walletService.addMoney(amount);
      if (res && res.success) {
        dispatch(setWallet({ balance: res.balance, currency: 'INR' }));
        if (res.transaction) {
          dispatch(addTransaction(res.transaction));
        }
        dispatch(updateProfile({ wallet_balance: String(res.balance) }));
        Toast.show({
          type: 'success',
          text1: 'Money Added Successfully',
          text2: `₹${amount} added to your wallet`,
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Could not add money' });
    }
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <View
        style={[
          styles.txIcon,
          { backgroundColor: item.type === 'credit' ? '#D1FAE5' : '#FEE2E2' },
        ]}
      >
        <Text style={styles.txEmoji}>{item.type === 'credit' ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: colors.text }]}>{item.description}</Text>
        <Text style={[styles.txDate, { color: colors.textLight }]}>
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          { color: item.type === 'credit' ? colors.success : colors.error },
        ]}
      >
        {item.type === 'credit' ? '+' : '−'}₹{item.amount}
      </Text>
    </View>
  );

  return (
    <AppScreen style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.lavender }]}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        {loading ? (
          <SkeletonLoader width={140} height={40} borderRadius={SIZES.radius_md} />
        ) : (
          <Text style={[styles.balanceAmount, { color: colors.primary }]}>₹{balance.toFixed(2)}</Text>
        )}
        <Text style={styles.balanceSub}>DhobiPro Wallet • Secure & Instant</Text>

        {/* Add Money Chips */}
        <View style={styles.addMoneyRow}>
          {ADD_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[styles.addChip, { backgroundColor: colors.primary }]}
              onPress={() => handleAddMoney(amt)}
            >
              <Text style={styles.addChipText}>+₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions */}
      <View style={[styles.txCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.txCardTitle, { color: colors.text }]}>Transactions</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💰</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add money or place an order to see activity here
              </Text>
            </View>
          ) : (
            <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.xl }}>
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} width="100%" height={60} borderRadius={SIZES.radius_md} />
              ))}
            </View>
          )
        }
      />
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  balanceCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: SIZES.radius_xl,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 14, color: '#6B6889', marginBottom: SPACING.sm },
  balanceAmount: { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  balanceSub: { fontSize: 12, color: '#6B6889', marginBottom: SPACING.lg },
  addMoneyRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  addChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius_full,
  },
  addChipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  txCard: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  txCardTitle: { fontSize: 18, fontWeight: '800' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radius_md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  txEmoji: { fontSize: 18, fontWeight: '800' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: SPACING.sm },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },
});

export default WalletScreen;
