import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  Image,
  Dimensions,
  FlatList,
  Linking,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, DARK_COLORS, SPACING, SIZES, FONTS } from '../../constants/theme';
import { resolveImageUrl } from '../../constants/config';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { calculateDistance, getCurrentLocation } from '../../utils/locationUtils';
import {
  shopService,
  ShopProfileResponse,
  ShopService,
  ShopReview,
  ShopReel,
  ShopCoupon,
  MembershipPlan,
} from '../../services/shopService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Overview', 'Services', 'Reviews', 'Gallery'] as const;
type TabType = typeof TABS[number];

const STORE_COVERS = [
  require('../../../assets/myimages/shop_cover_pearl.png'),
  require('../../../assets/myimages/shop_cover_fresh.png'),
  require('../../../assets/myimages/shop_cover_quick.png'),
  require('../../../assets/myimages/shop_cover_premium.png'),
];

const STORE_LOGOS = [
  require('../../../assets/myimages/login_logo.png'),
  require('../../../assets/myimages/cat_wash_fold_icon.png'),
  require('../../../assets/myimages/cat_dry_clean.jpg'),
  require('../../../assets/myimages/cat_steam_iron.jpg'),
];

const SafeShopCoverImage = ({ shop, shopId = 1, style, resizeMode = 'cover' }: any) => {
  const id = typeof shopId === 'number' && shopId > 0 ? shopId : 1;
  const fallbackAsset = STORE_COVERS[(id - 1) % STORE_COVERS.length];

  const getSource = () => {
    const raw = shop?.cover_url || shop?.cover_image || shop?.cover;
    const url = resolveImageUrl(raw);
    if (url) {
      return { uri: url };
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [shop?.cover_url, shop?.cover_image, shop?.cover, shop?.id]);

  return (
    <Image
      source={src}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setSrc(fallbackAsset);
      }}
    />
  );
};

const SafeShopLogoImage = ({ shop, shopId = 1, style, resizeMode = 'cover' }: any) => {
  const id = typeof shopId === 'number' && shopId > 0 ? shopId : 1;
  const fallbackAsset = STORE_LOGOS[(id - 1) % STORE_LOGOS.length];

  const getSource = () => {
    const raw = shop?.logo_url || shop?.logo;
    const url = resolveImageUrl(raw);
    if (url) {
      return { uri: url };
    }
    return fallbackAsset;
  };

  const [src, setSrc] = useState(getSource);

  useEffect(() => {
    setSrc(getSource());
  }, [shop?.logo_url, shop?.logo, shop?.id]);

  return (
    <Image
      source={src}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setSrc(fallbackAsset);
      }}
    />
  );
};

const getCoverSource = (shop: any, shopId: number = 1) => {
  const url = resolveImageUrl(shop?.cover_image);
  if (url) return { uri: url };
  const id = typeof shopId === 'number' && shopId > 0 ? shopId : 1;
  return STORE_COVERS[(id - 1) % STORE_COVERS.length];
};

const getLogoSource = (shop: any, shopId: number = 1) => {
  const url = resolveImageUrl(shop?.logo);
  if (url) return { uri: url };
  const id = typeof shopId === 'number' && shopId > 0 ? shopId : 1;
  return STORE_LOGOS[(id - 1) % STORE_LOGOS.length];
};

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRow = ({ rating, size = 14, color = '#F59E0B' }: { rating: number; size?: number; color?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Text key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? color : '#D1D5DB' }}>★</Text>
    ))}
  </View>
);

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, colors }: { title: string; colors: typeof COLORS }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
  </View>
);

// ─── Coupon Card ───────────────────────────────────────────────────────────────
const CouponCard = ({ coupon, colors }: { coupon: ShopCoupon; colors: typeof COLORS }) => (
  <View style={[styles.couponCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
    <View style={styles.couponLeft}>
      <Text style={[styles.couponOffer, { color: colors.primary }]}>
        {coupon.discount_type === 'percentage'
          ? `${coupon.discount_value}% OFF`
          : `₹${coupon.discount_value} OFF`}
      </Text>
      <Text style={[styles.couponTitle, { color: colors.text }]}>{coupon.title}</Text>
      {coupon.description ? (
        <Text style={[styles.couponDesc, { color: colors.textSecondary }]} numberOfLines={1}>
          {coupon.description}
        </Text>
      ) : null}
      {coupon.min_order_amount > 0 ? (
        <Text style={[styles.couponMin, { color: colors.textLight }]}>
          Min order: ₹{coupon.min_order_amount}
        </Text>
      ) : null}
    </View>
    <View style={[styles.couponDivider, { borderColor: colors.primary }]} />
    <TouchableOpacity
      style={styles.couponCodeBox}
      onPress={() => Alert.alert('Coupon Code', `Use code "${coupon.code}" at checkout`)}
    >
      <Text style={[styles.couponCode, { color: colors.primary }]}>{coupon.code}</Text>
      <Text style={[styles.couponTap, { color: colors.textSecondary }]}>Tap to copy</Text>
    </TouchableOpacity>
  </View>
);

// ─── Membership Card ───────────────────────────────────────────────────────────
const MembershipCard = ({ plan, colors }: { plan: MembershipPlan; colors: typeof COLORS }) => {
  const benefits = Object.entries(plan.benefits || {}).slice(0, 3);
  return (
    <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.memberBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.memberBadgeText}>MEMBER</Text>
      </View>
      <Text style={[styles.memberName, { color: colors.text }]}>{plan.name}</Text>
      <Text style={[styles.memberPrice, { color: colors.accent }]}>
        ₹{plan.price}
        <Text style={[styles.memberDuration, { color: colors.textSecondary }]}>
          {' '}/ {plan.duration_days} days
        </Text>
      </Text>
      {benefits.map(([key, val]) => (
        <View key={key} style={styles.memberBenefit}>
          <Text style={{ color: colors.success, fontSize: 12 }}>✓</Text>
          <Text style={[styles.memberBenefitText, { color: colors.textSecondary }]}>
            {key.replace(/_/g, ' ')}: {String(val)}
          </Text>
        </View>
      ))}
      <TouchableOpacity style={[styles.memberBtn, { backgroundColor: colors.primary }]}>
        <Text style={styles.memberBtnText}>Subscribe</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Review Card ───────────────────────────────────────────────────────────────
const ReviewCard = ({ review, colors }: { review: ShopReview; colors: typeof COLORS }) => (
  <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.reviewTop}>
      <View style={[styles.reviewAvatar, { backgroundColor: colors.lavender }]}>
        <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>
          {(review.user_name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Text style={[styles.reviewerName, { color: colors.text }]}>{review.user_name || 'User'}</Text>
        <StarRow rating={review.rating} size={13} />
      </View>
      <Text style={[styles.reviewDate, { color: colors.textLight }]}>
        {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </Text>
    </View>
    {review.comment ? (
      <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>{review.comment}</Text>
    ) : null}
    {review.photos?.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
        {review.photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.reviewPhoto} />
        ))}
      </ScrollView>
    ) : null}
    {review.reply_from_shop ? (
      <View style={[styles.shopReply, { backgroundColor: colors.cardAlt }]}>
        <Text style={[styles.shopReplyLabel, { color: colors.primary }]}>🏪 Shop Reply</Text>
        <Text style={[styles.shopReplyText, { color: colors.textSecondary }]}>{review.reply_from_shop}</Text>
      </View>
    ) : null}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
export const ShopDetailScreen = ({ navigation, route }: any) => {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  const insets = useSafeAreaInsets();
  const { shopId = 1, shopName } = route.params || {};

  const user = useSelector((state: RootState) => state.auth.user);
  const [custCoords, setCustCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [data, setData] = useState<ShopProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setCustCoords({ latitude: Number(user.latitude), longitude: Number(user.longitude) });
    } else {
      getCurrentLocation().then((coords) => setCustCoords(coords));
    }
  }, [user?.latitude, user?.longitude]);

  useEffect(() => {
    loadShop();
  }, [shopId]);

  const loadShop = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await shopService.getShopProfile(shopId);
      setData(profile);
    } catch (e: any) {
      setError(e.message || 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  };

  const openMaps = () => {
    if (!data?.shop) return;
    const { latitude, longitude, name, address, city } = data.shop;
    const label = encodeURIComponent(`${name} (${address || city || 'Laundry'})`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.canOpenURL(mapsUrl).then((supported) => {
      if (supported) {
        Linking.openURL(mapsUrl);
      } else {
        Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
      }
    }).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
    });
  };

  const callShop = () => {
    if (!data?.shop?.phone) return;
    Linking.openURL(`tel:${data.shop.phone}`);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [150, 220],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading shop profile…</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40, marginBottom: SPACING.md }}>⚠️</Text>
        <Text style={[styles.errorText, { color: colors.text }]}>Could not load shop</Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity onPress={loadShop} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { shop, services, reviews, rating_breakdown, reels, coupons, memberships } = data;
  const totalRatings = Object.values(rating_breakdown).reduce((a, b) => a + b, 0);

  const userLat = Number(user?.latitude || custCoords?.latitude || 18.5204);
  const userLng = Number(user?.longitude || custCoords?.longitude || 73.8567);

  let computedDistance = '';
  if (shop?.latitude && shop?.longitude) {
    computedDistance = calculateDistance(userLat, userLng, Number(shop.latitude), Number(shop.longitude));
  } else if (shop?.distance) {
    computedDistance = String(shop.distance);
  } else {
    computedDistance = '0.8 km away (10 mins)';
  }

  // ── Tab Content ─────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Badges row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow}>
        {shop.is_verified && (
          <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.badgeText, { color: '#2563EB' }]}>✓ Verified</Text>
          </View>
        )}
        {shop.offers_free_pickup && (
          <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.badgeText, { color: '#16A34A' }]}>Free Pickup</Text>
          </View>
        )}
        {shop.offers_free_delivery && (
          <View style={[styles.badge, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.badgeText, { color: '#16A34A' }]}>Free Delivery</Text>
          </View>
        )}
        {shop.offers_express_delivery && (
          <View style={[styles.badge, { backgroundColor: '#FFF7ED' }]}>
            <Text style={[styles.badgeText, { color: '#EA580C' }]}>⚡ Express</Text>
          </View>
        )}
        {shop.offers_same_day && (
          <View style={[styles.badge, { backgroundColor: '#FFF7ED' }]}>
            <Text style={[styles.badgeText, { color: '#EA580C' }]}>Same Day</Text>
          </View>
        )}
        {shop.cod_available && (
          <View style={[styles.badge, { backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>COD Available</Text>
          </View>
        )}
      </ScrollView>

      {/* About */}
      {shop.description ? (
        <>
          <SectionHeader title="About" colors={colors} />
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>{shop.description}</Text>
        </>
      ) : null}

      {/* Charges Summary */}
      <SectionHeader title="Pricing Details" colors={colors} />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: 'Distance from you', value: `📍 ${computedDistance}` },
          { label: 'Min Order Amount', value: `₹${shop.min_order_amount}` },
          { label: 'Pickup Charge', value: shop.offers_free_pickup ? 'Free' : `₹${shop.pickup_charge}` },
          { label: 'Delivery Charge', value: shop.offers_free_delivery ? 'Free' : `₹${shop.delivery_charge}` },
          {
            label: 'Free Delivery Above',
            value: shop.free_delivery_above > 0 ? `₹${shop.free_delivery_above}` : 'N/A',
          },
          {
            label: 'Estimated Time',
            value: `${shop.estimated_delivery_hours}h`,
          },
        ].map((row, i, arr) => (
          <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Working Hours */}
      {shop.working_hours ? (
        <>
          <SectionHeader title="Working Hours" colors={colors} />
          {(() => {
            const wh = shop.working_hours;
            if (typeof wh === 'string') {
              return (
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Monday – Saturday</Text>
                    <Text style={[styles.infoValue, { color: colors.success }]}>{wh}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sunday</Text>
                    <Text style={[styles.infoValue, { color: colors.success }]}>09:00 AM – 07:00 PM</Text>
                  </View>
                </View>
              );
            }
            if (Array.isArray(wh)) {
              return (
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {wh.map((item: any, i: number) => (
                    <View
                      key={item.day || i}
                      style={[
                        styles.infoRow,
                        i < wh.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                        {DAY_LABELS[item.day?.toLowerCase()] || item.day || `Day ${i + 1}`}
                      </Text>
                      <Text style={[styles.infoValue, { color: item.closed ? colors.error : colors.success }]}>
                        {item.closed ? 'Closed' : `${item.open || '08:00 AM'} – ${item.close || '09:00 PM'}`}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }
            if (typeof wh === 'object' && wh !== null) {
              const entries = Object.entries(wh).filter(([key]) => isNaN(Number(key)));
              if (entries.length > 0) {
                return (
                  <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {entries.map(([day, hours]: [string, any], i: number) => {
                      const dayName = DAY_LABELS[day.toLowerCase()] || day;
                      const isClosed = typeof hours === 'object' && hours !== null ? hours.closed : false;
                      const openTime = typeof hours === 'object' && hours !== null ? (hours.open || '08:00 AM') : String(hours);
                      const closeTime = typeof hours === 'object' && hours !== null ? (hours.close || '09:00 PM') : '';
                      return (
                        <View
                          key={day}
                          style={[
                            styles.infoRow,
                            i < entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{dayName}</Text>
                          <Text style={[styles.infoValue, { color: isClosed ? colors.error : colors.success }]}>
                            {isClosed ? 'Closed' : closeTime ? `${openTime} – ${closeTime}` : openTime}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              }
            }
            return (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Everyday</Text>
                  <Text style={[styles.infoValue, { color: colors.success }]}>08:00 AM – 09:00 PM</Text>
                </View>
              </View>
            );
          })()}
        </>
      ) : null}

      {/* Contact Details */}
      <SectionHeader title="Contact" colors={colors} />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.contactRow} onPress={callShop}>
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={[styles.contactText, { color: colors.primary }]}>{shop.phone}</Text>
        </TouchableOpacity>
        {shop.email ? (
          <View style={[styles.contactRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>{shop.email}</Text>
          </View>
        ) : null}
        {shop.gst_number ? (
          <View style={[styles.contactRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.contactIcon}>📋</Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>GSTIN: {shop.gst_number}</Text>
          </View>
        ) : null}
      </View>

      {/* Address & Map */}
      <SectionHeader title="Location" colors={colors} />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.addressText, { color: colors.text }]}>
          {[shop.address, shop.area, shop.city, shop.state, shop.pincode].filter(Boolean).join(', ')}
        </Text>
        <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8, fontSize: 14 }}>
          📍 {computedDistance} from your location
        </Text>
        <TouchableOpacity onPress={openMaps} style={[styles.mapBtn, { borderColor: colors.primary, marginTop: 12 }]}>
          <Text style={styles.mapBtnIcon}>🗺️</Text>
          <Text style={[styles.mapBtnText, { color: colors.primary }]}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery */}
      {shop.gallery?.length > 0 && (
        <>
          <SectionHeader title="Shop Facility Photos & Gallery" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {shop.gallery.map((uriItem, i) => {
              const imageSrc = (typeof uriItem === 'string' && uriItem.startsWith('http')) ? { uri: uriItem } : (typeof uriItem === 'string' ? { uri: uriItem } : uriItem);
              return (
                <Image key={i} source={imageSrc} style={styles.galleryImage} resizeMode="cover" />
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Coupons */}
      {coupons.length > 0 && (
        <>
          <SectionHeader title="Offers & Coupons" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.couponsScroll}>
            {coupons.map((c) => <CouponCard key={c.id} coupon={c} colors={colors} />)}
          </ScrollView>
        </>
      )}

      {/* Memberships */}
      {memberships.length > 0 && (
        <>
          <SectionHeader title="Membership Plans" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membershipsScroll}>
            {memberships.map((m) => <MembershipCard key={m.id} plan={m} colors={colors} />)}
          </ScrollView>
        </>
      )}
    </View>
  );

  const renderServices = () => (
    <View style={styles.tabContent}>
      {services.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧺</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No services listed yet</Text>
        </View>
      ) : (
        services.map((service) => (
          <View key={service.id} style={styles.serviceGroup}>
            <View style={styles.serviceGroupHeader}>
              {service.icon ? <Text style={styles.serviceGroupIcon}>{service.icon}</Text> : null}
              <View>
                <Text style={[styles.serviceGroupName, { color: colors.text }]}>{service.name}</Text>
                {service.description ? (
                  <Text style={[styles.serviceGroupDesc, { color: colors.textSecondary }]}>{service.description}</Text>
                ) : null}
              </View>
            </View>
            {service.items?.map((item) => (
              <View key={item.id} style={[styles.serviceItemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  {item.description ? (
                    <Text style={[styles.itemDesc, { color: colors.textLight }]}>{item.description}</Text>
                  ) : null}
                  <Text style={[styles.itemType, { color: colors.textSecondary }]}>
                    {item.pricing_type === 'per_piece' ? 'Per Piece' : item.pricing_type === 'per_kg' ? 'Per KG' : 'Per Piece / KG'}
                  </Text>
                </View>
                <View style={styles.itemPriceCol}>
                  {item.price_per_piece != null && (
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>₹{item.price_per_piece}/pc</Text>
                  )}
                  {item.price_per_kg != null && (
                    <Text style={[styles.itemPrice, { color: colors.accent }]}>₹{item.price_per_kg}/kg</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );

  const renderReviews = () => (
    <View style={styles.tabContent}>
      {/* Rating Overview */}
      <View style={[styles.ratingOverview, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.ratingBig}>
          <Text style={[styles.ratingNumber, { color: colors.text }]}>{Number(shop.rating).toFixed(1)}</Text>
          <StarRow rating={shop.rating} size={18} />
          <Text style={[styles.ratingTotal, { color: colors.textSecondary }]}>{shop.review_count} reviews</Text>
        </View>
        <View style={styles.ratingBars}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = rating_breakdown[star] || 0;
            const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <View key={star} style={styles.ratingBarRow}>
                <Text style={[styles.ratingBarLabel, { color: colors.textSecondary }]}>{star}★</Text>
                <View style={[styles.ratingBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.ratingBarFill, { width: `${pct}%`, backgroundColor: '#F59E0B' }]} />
                </View>
                <Text style={[styles.ratingBarCount, { color: colors.textLight }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reviews yet</Text>
        </View>
      ) : (
        reviews.map((r) => <ReviewCard key={r.id} review={r} colors={colors} />)
      )}
    </View>
  );

  const renderGallery = () => {
    const rawItems: any[] = (data as any)?.gallery || (shop as any)?.gallery || (shop as any)?.shop_photos || reels || [];
    
    // Normalize gallery items
    const galleryItems = rawItems.map((item, idx) => {
      if (typeof item === 'string') {
        const clean = item.toLowerCase().split('?')[0];
        const isVideo = clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.includes('/videos/');
        return {
          id: String(idx + 1),
          url: item,
          video_url: isVideo ? item : null,
          thumbnail_url: item,
          type: isVideo ? 'video' : 'photo',
        };
      }
      const mediaUrl = item.video_url || item.url || item.thumbnail_url || item.image || '';
      const clean = String(mediaUrl).toLowerCase().split('?')[0];
      const isVideo = item.type === 'video' || Boolean(item.video_url) || clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.includes('/videos/');
      return {
        id: String(item.id || idx + 1),
        url: mediaUrl,
        video_url: isVideo ? mediaUrl : null,
        thumbnail_url: item.thumbnail_url || item.thumbnail || mediaUrl,
        type: isVideo ? 'video' : 'photo',
      };
    });

    return (
      <View style={styles.tabContent}>
        {galleryItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No photos or videos uploaded yet</Text>
          </View>
        ) : (
          <View style={styles.reelsGrid}>
            {galleryItems.map((item) => {
              const isVideo = item.type === 'video' || Boolean(item.video_url);
              const resolvedUrl = resolveImageUrl(item.thumbnail_url || item.url);
              const thumbSource = resolvedUrl ? { uri: resolvedUrl } : getCoverSource(shop, shop.id);
              const playUrl = item.video_url || item.url;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reelThumb}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (isVideo && playUrl) {
                      const fullUrl = resolveImageUrl(playUrl) || playUrl;
                      Linking.openURL(fullUrl).catch(() => {
                        Alert.alert(`🎬 ${shop.name} Video`, 'Could not open video player.');
                      });
                    } else if (resolvedUrl) {
                      setPreviewImage(resolvedUrl);
                    }
                  }}
                >
                  <Image source={thumbSource} style={styles.reelImage} resizeMode="cover" />
                  {isVideo ? (
                    <View style={styles.reelOverlay}>
                      <View style={styles.galleryPlayBtn}>
                        <Text style={styles.reelPlay}>▶</Text>
                      </View>
                      <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>VIDEO</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.photoOverlay}>
                      <View style={styles.photoZoomIcon}>
                        <Text style={{ fontSize: 13, color: '#FFF' }}>🔍</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Header (appears after scroll) */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top, opacity: headerOpacity },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.floatingTitle, { color: colors.text }]} numberOfLines={1}>{shop.name}</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* ── Hero Cover ── */}
        <View style={styles.hero}>
          <SafeShopCoverImage shop={shop} shopId={shop.id} style={styles.coverImage} resizeMode="cover" />

          {/* Gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Back button on cover */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.heroBack, { marginTop: insets.top }]}
          >
            <Text style={styles.heroBackIcon}>←</Text>
          </TouchableOpacity>

          {/* Shop logo + name badge */}
          <View style={styles.heroInfo}>
            <SafeShopLogoImage shop={shop} shopId={shop.id} style={styles.logoImage} resizeMode="cover" />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.heroShopName}>{shop.name}</Text>
                {shop.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <StarRow rating={shop.rating} size={13} color="#F59E0B" />
                <Text style={styles.heroRatingText}>
                  {' '}{Number(shop.rating).toFixed(1)} ({shop.review_count})
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <View style={[styles.openBadge, { backgroundColor: shop.is_open ? '#16A34A' : '#DC2626' }]}>
                  <Text style={styles.openBadgeText}>{shop.is_open ? '● Open' : '● Closed'}</Text>
                </View>
                <Text style={styles.heroCity}>  📍 {computedDistance}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Tab Bar ── */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Services' && renderServices()}
        {activeTab === 'Reviews' && renderReviews()}
        {activeTab === 'Gallery' && renderGallery()}

        <View style={{ height: 120 + insets.bottom }} />
      </Animated.ScrollView>

      {/* ── Book CTA ── */}
      <View
        style={[
          styles.cta,
          { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, SPACING.xl) },
        ]}
      >
        <View style={styles.ctaCharges}>
          <Text style={[styles.ctaChargeLabel, { color: colors.textSecondary }]}>Pickup ₹{shop.pickup_charge} • Delivery ₹{shop.delivery_charge}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.ctaBtnWrapper}
          onPress={() => navigation.navigate('Booking', { shopId: shop.id, shopName: shop.name })}
        >
          <LinearGradient
            colors={['#8162EE', '#A672D6', '#E18C8E', '#FE9A5D']}
            locations={[0.0127, 0.3173, 0.6734, 0.9826]}
            start={{ x: 0, y: 0.8 }}
            end={{ x: 1, y: 0.2 }}
            style={styles.ctaBtnGradient}
          >
            <Text style={styles.ctaBtnText}>Book Laundry Service</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Full Photo Preview Modal */}
      {previewImage ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: previewImage }} style={styles.modalFullImage} resizeMode="contain" />
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.md, fontSize: 14 },
  errorText: { fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm },
  errorSub: { fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  retryBtn: { paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, borderRadius: SIZES.radius_full },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  floatingTitle: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700' },

  // Hero
  hero: { width: '100%', height: 250, justifyContent: 'flex-end' },
  coverImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: 250 },
  coverPlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroBack: {
    position: 'absolute', top: 0, left: SPACING.xl,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBackIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroInfo: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: SPACING.xl, paddingBottom: SPACING.lg,
  },
  logoImage: { width: 60, height: 60, borderRadius: 14, borderWidth: 2, borderColor: '#fff' },
  logoPlaceholder: {
    width: 60, height: 60, borderRadius: 14,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  heroShopName: { color: '#fff', fontSize: 17, fontWeight: '800', flexShrink: 1 },
  verifiedBadge: {
    marginLeft: SPACING.xs, backgroundColor: '#2563EB',
    borderRadius: SIZES.radius_full, paddingHorizontal: 8, paddingVertical: 2,
  },
  verifiedText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heroRatingText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  openBadge: { borderRadius: SIZES.radius_full, paddingHorizontal: 8, paddingVertical: 2 },
  openBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroCity: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, paddingVertical: SPACING.md,
    alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  // Tab content
  tabContent: { padding: SPACING.xl },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, marginTop: SPACING.xl },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginRight: SPACING.sm },
  sectionLine: { flex: 1, height: 1 },

  // Badges
  badgesRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  badge: {
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: SIZES.radius_full, marginRight: SPACING.sm,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // About
  aboutText: { fontSize: 14, lineHeight: 22 },

  // Info card (charges, hours, contact)
  infoCard: {
    borderRadius: SIZES.radius_lg, borderWidth: 1, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '700' },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  contactIcon: { fontSize: 18, marginRight: SPACING.md },
  contactText: { fontSize: 14, fontWeight: '600' },

  // Address
  addressText: { fontSize: 13, lineHeight: 20, padding: SPACING.lg, paddingBottom: SPACING.sm },
  mapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: SPACING.lg, marginTop: SPACING.sm,
    paddingVertical: SPACING.md, borderRadius: SIZES.radius_lg, borderWidth: 1.5,
  },
  mapBtnIcon: { fontSize: 16, marginRight: SPACING.sm },
  mapBtnText: { fontSize: 14, fontWeight: '700' },

  // Gallery
  galleryScroll: { marginHorizontal: -SPACING.xl, paddingLeft: SPACING.xl },
  galleryImage: { width: 160, height: 120, borderRadius: SIZES.radius_md, marginRight: SPACING.sm },

  // Coupons
  couponsScroll: { marginHorizontal: -SPACING.xl, paddingLeft: SPACING.xl },
  couponCard: {
    width: 240, borderRadius: SIZES.radius_lg, borderWidth: 1.5,
    flexDirection: 'row', marginRight: SPACING.md, overflow: 'hidden',
  },
  couponLeft: { flex: 1, padding: SPACING.md },
  couponOffer: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  couponTitle: { fontSize: 13, fontWeight: '700' },
  couponDesc: { fontSize: 11, marginTop: 2 },
  couponMin: { fontSize: 10, marginTop: 4 },
  couponDivider: { width: 1, borderWidth: 0.5, borderStyle: 'dashed', marginVertical: SPACING.sm },
  couponCodeBox: { width: 72, alignItems: 'center', justifyContent: 'center', padding: SPACING.sm },
  couponCode: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  couponTap: { fontSize: 9, marginTop: 3 },

  // Memberships
  membershipsScroll: { marginHorizontal: -SPACING.xl, paddingLeft: SPACING.xl },
  memberCard: {
    width: 200, borderRadius: SIZES.radius_lg, borderWidth: 1,
    padding: SPACING.lg, marginRight: SPACING.md,
  },
  memberBadge: {
    alignSelf: 'flex-start', borderRadius: SIZES.radius_full,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: SPACING.sm,
  },
  memberBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  memberName: { fontSize: 15, fontWeight: '800', marginBottom: SPACING.xs },
  memberPrice: { fontSize: 22, fontWeight: '800' },
  memberDuration: { fontSize: 13 },
  memberBenefit: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  memberBenefitText: { fontSize: 12, marginLeft: 5, textTransform: 'capitalize' },
  memberBtn: {
    marginTop: SPACING.md, borderRadius: SIZES.radius_full,
    paddingVertical: SPACING.sm, alignItems: 'center',
  },
  memberBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Services
  serviceGroup: { marginBottom: SPACING.xl },
  serviceGroupHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md,
  },
  serviceGroupIcon: { fontSize: 22, marginRight: SPACING.sm },
  serviceGroupName: { fontSize: 15, fontWeight: '800' },
  serviceGroupDesc: { fontSize: 12, marginTop: 2 },
  serviceItemRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: SIZES.radius_md, borderWidth: 1,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  itemName: { fontSize: 13, fontWeight: '700' },
  itemDesc: { fontSize: 11, marginTop: 2 },
  itemType: { fontSize: 10, marginTop: 4 },
  itemPriceCol: { alignItems: 'flex-end' },
  itemPrice: { fontSize: 13, fontWeight: '800', marginBottom: 2 },

  // Reviews
  ratingOverview: {
    flexDirection: 'row', borderRadius: SIZES.radius_lg, borderWidth: 1,
    padding: SPACING.xl, marginBottom: SPACING.xl,
  },
  ratingBig: { alignItems: 'center', marginRight: SPACING.xl },
  ratingNumber: { fontSize: 40, fontWeight: '800', lineHeight: 44 },
  ratingTotal: { fontSize: 11, marginTop: 4 },
  ratingBars: { flex: 1 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  ratingBarLabel: { width: 24, fontSize: 11 },
  ratingBarTrack: { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden', marginHorizontal: SPACING.sm },
  ratingBarFill: { height: '100%', borderRadius: 4 },
  ratingBarCount: { width: 24, fontSize: 10, textAlign: 'right' },
  reviewCard: {
    borderRadius: SIZES.radius_lg, borderWidth: 1,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 18, fontWeight: '800' },
  reviewerName: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 20, marginTop: SPACING.md },
  reviewPhoto: { width: 80, height: 80, borderRadius: SIZES.radius_sm, marginRight: SPACING.sm },
  shopReply: { borderRadius: SIZES.radius_sm, padding: SPACING.md, marginTop: SPACING.md },
  shopReplyLabel: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  shopReplyText: { fontSize: 12, lineHeight: 18 },

  // Reels
  reelsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  reelThumb: {
    width: (SCREEN_WIDTH - SPACING.xl * 2 - 8) / 2,
    height: 200, borderRadius: SIZES.radius_md,
    overflow: 'hidden', margin: 4,
  },
  reelImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  reelImagePlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reelOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  reelPlay: { color: '#fff', fontSize: 28, opacity: 0.9 },
  galleryPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 8,
  },
  photoZoomIcon: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalFullImage: {
    width: '94%',
    height: '80%',
    borderRadius: 12,
  },
  reelOfferBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#EF4444', borderRadius: SIZES.radius_full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  reelOfferText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  reelMeta: {
    position: 'absolute', bottom: 6, left: 8, right: 8,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  reelViews: { color: '#fff', fontSize: 10, fontWeight: '600' },
  reelLikes: { color: '#fff', fontSize: 10, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: { fontSize: 14 },

  // CTA
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.xl, borderTopWidth: 1,
  },
  ctaCharges: { marginBottom: 8 },
  ctaChargeLabel: { fontSize: 12, textAlign: 'center' },
  ctaBtnWrapper: {
    borderRadius: SIZES.radius_full,
    shadowColor: '#8162EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaBtnGradient: {
    height: 54,
    borderRadius: SIZES.radius_full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});

export default ShopDetailScreen;
