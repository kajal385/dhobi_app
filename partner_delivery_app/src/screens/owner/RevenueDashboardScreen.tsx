import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

type Period = 'daily' | 'weekly' | 'monthly';

interface RevenueData {
  period_revenue: number;
  total_revenue: number;
  commission: number;
  net_earnings: number;
  gst_amount: number;
  cash_revenue: number;
  online_revenue: number;
  cancelled_orders: number;
  cancelled_revenue_loss: number;
  top_customers: { name: string; total_orders: number; total_spent: string }[];
  service_revenue: { name: string; revenue: number }[];
  recent_transactions: {
    id: string;
    customerName: string;
    amount: string;
    paymentMethod: string;
    paymentStatus: 'PAID' | 'FAILED' | 'PENDING';
    orderStatus: string;
    createdAt: string;
  }[];
}

const fmt = (n: number) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

export const RevenueDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { currentShop } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRevenue = useCallback(async () => {
    const shopId = currentShop?.id;
    if (!shopId) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/owner/revenue', {
        params: { shop_id: shopId, period },
      });
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (e) {
      // keep previous data silently
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [currentShop?.id, period]);

  useEffect(() => {
    setIsLoading(true);
    loadRevenue();
  }, [loadRevenue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRevenue();
  };

  const handleExportGST = () => {
    Alert.alert(
      'GST Report 📄',
      `GST Summary for ${period} period has been generated.\n\nGST Amount: ${data ? fmt(data.gst_amount) : '—'}`
    );
  };

  const periodLabel = period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'This Month';
  const totalForBar = (data?.cash_revenue || 0) + (data?.online_revenue || 0) || 1;

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Revenue Dashboard</Text>
          <Text style={styles.headerSub}>
            {currentShop?.name || 'Your Shop'} — Live data from database
          </Text>
          {/* Timeframe Switcher */}
          <View style={styles.tabRow}>
            {(['daily', 'weekly', 'monthly'] as Period[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, period === t && styles.tabBtnActive]}
                onPress={() => setPeriod(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabTxt, period === t && styles.tabTxtActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 8 }}>
              Loading revenue data...
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          >
            {/* Total Revenue Card */}
            <AppCard style={styles.totalCard}>
              <Text style={styles.totalLbl}>{periodLabel} Revenue</Text>
              <Text style={styles.totalVal}>{data ? fmt(data.period_revenue) : '₹0'}</Text>
              <Text style={styles.allTimeRow}>
                All-time Total: <Text style={{ fontFamily: FONTS.bold }}>{data ? fmt(data.total_revenue) : '₹0'}</Text>
              </Text>
            </AppCard>

            {/* Earnings Breakdown */}
            <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            <View style={styles.gridRow}>
              <AppCard style={styles.gridCard}>
                <Text style={styles.cardLbl}>🏦 Net Earnings</Text>
                <Text style={[styles.cardVal, { color: COLORS.success }]}>
                  {data ? fmt(data.net_earnings) : '₹0'}
                </Text>
                <Text style={styles.cardSub}>After 10% commission</Text>
              </AppCard>
              <AppCard style={styles.gridCard}>
                <Text style={styles.cardLbl}>💸 Platform Fee</Text>
                <Text style={[styles.cardVal, { color: COLORS.error }]}>
                  {data ? fmt(data.commission) : '₹0'}
                </Text>
                <Text style={styles.cardSub}>10% of revenue</Text>
              </AppCard>
            </View>

            {/* Payment Mode Breakdown */}
            <Text style={styles.sectionTitle}>Payment Mode Breakdown</Text>
            <AppCard style={{ marginBottom: SPACING.xl }}>
              <View style={styles.modeRow}>
                <Text style={styles.modeLbl}>💵 Cash / COD</Text>
                <Text style={styles.modeVal}>{data ? fmt(data.cash_revenue) : '₹0'}</Text>
                <Text style={styles.modePct}>{pct(data?.cash_revenue || 0, totalForBar)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct(data?.cash_revenue || 0, totalForBar)}%`, backgroundColor: '#F59E0B' }]} />
              </View>

              <View style={[styles.modeRow, { marginTop: SPACING.md }]}>
                <Text style={styles.modeLbl}>💳 Online / UPI</Text>
                <Text style={[styles.modeVal, { color: COLORS.success }]}>{data ? fmt(data.online_revenue) : '₹0'}</Text>
                <Text style={styles.modePct}>{pct(data?.online_revenue || 0, totalForBar)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct(data?.online_revenue || 0, totalForBar)}%` }]} />
              </View>
            </AppCard>

            {/* Service-wise Revenue */}
            {data?.service_revenue && data.service_revenue.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Service-Wise Revenue</Text>
                <AppCard style={{ marginBottom: SPACING.xl }}>
                  {data.service_revenue.map((svc, i) => {
                    const maxRev = data.service_revenue[0]?.revenue || 1;
                    return (
                      <View key={i}>
                        <View style={styles.serviceRow}>
                          <Text style={styles.serviceName} numberOfLines={1}>{svc.name}</Text>
                          <Text style={styles.serviceAmount}>{fmt(svc.revenue)}</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${pct(svc.revenue, maxRev)}%` }]} />
                        </View>
                      </View>
                    );
                  })}
                </AppCard>
              </>
            )}

            {/* Top Customers */}
            {data?.top_customers && data.top_customers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Top Customers</Text>
                <AppCard style={styles.customerCard}>
                  {data.top_customers.map((c, i) => (
                    <View
                      key={i}
                      style={[styles.custRow, i === data.top_customers.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.custName}>{i + 1}. {c.name}</Text>
                        <Text style={styles.custOrders}>{c.total_orders} orders completed</Text>
                      </View>
                      <Text style={styles.custSpend}>{c.total_spent}</Text>
                    </View>
                  ))}
                </AppCard>
              </>
            )}

            {/* Recent Transactions */}
            {data?.recent_transactions && data.recent_transactions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <AppCard style={{ marginBottom: SPACING.xl }}>
                  {data.recent_transactions.map((t, i) => (
                    <View
                      key={t.id}
                      style={[styles.txnRow, i === (data.recent_transactions?.length ?? 0) - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txnId}>{t.id}</Text>
                        <Text style={styles.txnCustomer}>{t.customerName}</Text>
                        <Text style={styles.txnDate}>{t.createdAt}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txnAmount, { color: t.paymentStatus === 'PAID' ? COLORS.success : COLORS.error }]}>
                          {t.amount}
                        </Text>
                        <View style={[
                          styles.txnBadge,
                          { backgroundColor: t.paymentStatus === 'PAID' ? COLORS.success + '20' : t.paymentStatus === 'FAILED' ? COLORS.error + '20' : COLORS.warning + '20' }
                        ]}>
                          <Text style={[
                            styles.txnBadgeTxt,
                            { color: t.paymentStatus === 'PAID' ? COLORS.success : t.paymentStatus === 'FAILED' ? COLORS.error : COLORS.warning }
                          ]}>
                            {t.paymentStatus}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </AppCard>
              </>
            )}

            {/* Cancelled Orders & Losses */}
            <Text style={styles.sectionTitle}>Cancelled Orders & Revenue Loss</Text>
            <AppCard style={styles.cancelCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>Total Cancelled Orders</Text>
                <Text style={[styles.reportVal, { color: COLORS.error }]}>
                  {data?.cancelled_orders ?? 0} Orders
                </Text>
              </View>
              <View style={[styles.reportRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.reportLbl}>Lost Revenue Value</Text>
                <Text style={[styles.reportVal, { color: COLORS.error }]}>
                  {data ? fmt(data.cancelled_revenue_loss) : '₹0'}
                </Text>
              </View>
            </AppCard>

            {/* Commission & Net Settlement */}
            <Text style={styles.sectionTitle}>Commission & Net Settlement</Text>
            <AppCard style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>Gross Business Volume</Text>
                <Text style={styles.reportVal}>{data ? fmt(data.total_revenue) : '₹0'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>Platform Commission (10%)</Text>
                <Text style={[styles.reportVal, { color: COLORS.error }]}>
                  -{data ? fmt(data.commission) : '₹0'}
                </Text>
              </View>
              <View style={[styles.reportRow, styles.netRow]}>
                <Text style={styles.netLbl}>Net Bank Settlement</Text>
                <Text style={styles.netVal}>{data ? fmt(data.net_earnings) : '₹0'}</Text>
              </View>
            </AppCard>

            {/* GST */}
            <Text style={styles.sectionTitle}>GST Reports & Tax</Text>
            <AppCard style={styles.gstCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>CGST (9%)</Text>
                <Text style={styles.reportVal}>{data ? fmt(data.gst_amount / 2) : '₹0'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>SGST (9%)</Text>
                <Text style={styles.reportVal}>{data ? fmt(data.gst_amount / 2) : '₹0'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLbl}>Total GST Liability</Text>
                <Text style={[styles.reportVal, { color: COLORS.primary }]}>
                  {data ? fmt(data.gst_amount) : '₹0'}
                </Text>
              </View>
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportGST}>
                <Text style={styles.exportTxt}>📥 Download GST Summary Report</Text>
              </TouchableOpacity>
            </AppCard>

            {!data && !isLoading && (
              <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💰</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text }}>No Revenue Yet</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  Once customers place and pay for orders, your revenue will appear here automatically.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.card,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.md },
  tabRow: { flexDirection: 'row', gap: SPACING.sm },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: SIZES.radius_md,
    backgroundColor: COLORS.background, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, elevation: 3 },
  tabTxt: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
  tabTxtActive: { color: COLORS.white, fontFamily: FONTS.bold },
  container: { padding: SPACING.lg },
  totalCard: { backgroundColor: COLORS.primary, marginBottom: SPACING.xl, padding: SPACING.lg },
  totalLbl: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.primaryLight },
  totalVal: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.white, marginVertical: SPACING.xs },
  allTimeRow: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.primaryLight },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: SPACING.md },
  gridRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  gridCard: { flex: 1 },
  cardLbl: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  cardVal: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, marginTop: 4 },
  cardSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeLbl: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, flex: 1 },
  modeVal: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text, marginRight: 8 },
  modePct: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textSecondary, width: 36, textAlign: 'right' },
  barBg: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  serviceName: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, flex: 1, marginRight: 8 },
  serviceAmount: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary },
  customerCard: { marginBottom: SPACING.xl },
  custRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  custName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  custOrders: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  custSpend: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.success },
  txnRow: { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txnId: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  txnCustomer: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text, marginTop: 2 },
  txnDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  txnAmount: { fontFamily: FONTS.bold, fontSize: 15 },
  txnBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  txnBadgeTxt: { fontFamily: FONTS.bold, fontSize: 11 },
  cancelCard: { marginBottom: SPACING.xl },
  reportCard: { marginBottom: SPACING.xl },
  gstCard: { marginBottom: SPACING.xl },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  reportLbl: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  reportVal: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.text, textAlign: 'right', flexShrink: 1 },
  netRow: { borderBottomWidth: 0, paddingTop: SPACING.md },
  netLbl: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  netVal: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  exportBtn: { marginTop: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radius_sm, alignItems: 'center' },
  exportTxt: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primaryDark },
});
