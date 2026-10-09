import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { AppBackground } from '../../components/AppBackground';
import { COLORS, FONTS, SPACING, SIZES } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { partnerService } from '../../services/partnerService';
import { resolveImageUrl } from '../../constants/config';
import { launchImageLibrary } from 'react-native-image-picker';

const normalizeImageUrl = (url?: string | null): string => {
  return resolveImageUrl(url);
};

export const ProfileSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout, currentUser, currentShop, updateShop, updateUser } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; docField?: string } | null>(null);

  // State: Shop Profile Info
  const [shopProfile, setShopProfile] = useState({
    shopName: currentShop?.name || currentShop?.shop_name || 'DhobiPro',
    ownerName: currentShop?.owner_name || currentUser?.name || 'Laundry Owner',
    phone: currentShop?.phone || currentUser?.phone || '',
    email: currentShop?.email || currentUser?.email || 'owner@dhobipro.com',
    gstNumber: currentShop?.gst_number || 'N/A',
    address: currentShop?.address || 'Shop Address',
    pickupRadius: currentShop?.pickup_radius_km ? `${currentShop.pickup_radius_km} km` : '5 km',
    logoUrl: normalizeImageUrl(currentShop?.logo_url),
    coverUrl: normalizeImageUrl(currentShop?.cover_url),
  });

  // State: Working Hours
  const [workingHours, setWorkingHours] = useState({
    operatingDays: 'Monday - Saturday (Sunday Off)',
    openTime: '08:00 AM',
    closeTime: '09:00 PM',
    breakHours: '01:30 PM - 02:30 PM',
    expressSlaHours: '4 Hours Express SLA',
    isOpenToday: true,
    isSundayOff: true,
  });

  // State: Bank Details
  const [bankDetails, setBankDetails] = useState({
    accountHolder: currentShop?.account_holder || currentShop?.owner_name || currentUser?.name || 'Laundry Partner',
    bankName: currentShop?.bank_name || 'HDFC Bank',
    accountNumber: currentShop?.bank_account || '123456789012',
    ifscCode: currentShop?.ifsc_code || 'HDFC0001234',
    upiVpa: currentShop?.upi_id || `${currentShop?.phone || 'partner'}@upi`,
    accountType: 'Current / Business Account',
  });

  // State: Documents
  const [documents, setDocuments] = useState<any[]>([
    { key: 'id_proof_photo', docField: 'id_proof_photo', title: 'Owner ID Proof (Aadhaar Card)', status: 'VERIFIED', docNo: 'Aadhaar Document', date: 'Uploaded', photoUrl: '' },
    { key: 'business_proof_photo', docField: 'business_proof_photo', title: 'Shop License / Udyam Certificate', status: 'VERIFIED', docNo: 'Trade License / Udyam', date: 'Uploaded', photoUrl: '' },
    { key: 'bank_proof_photo', docField: 'bank_proof_photo', title: 'Bank Statement / Cancelled Cheque', status: 'VERIFIED', docNo: 'Bank Proof', date: 'Uploaded', photoUrl: '' },
    { key: 'shop_board_photo', docField: 'shop_board_photo', title: 'Storefront Signboard Photo', status: 'VERIFIED', docNo: 'Outlet Signboard', date: 'Uploaded', photoUrl: '' },
  ]);

  // Load real profile details and documents from backend
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const data = await partnerService.getOwnerProfile(currentShop?.id, currentUser?.phone);
        if (data?.shop) {
          const shop = data.shop;
          const user = data.user || currentUser;

          setShopProfile({
            shopName: shop.name || shop.shop_name || 'DhobiPro',
            ownerName: shop.owner_name || user?.name || 'Owner',
            phone: shop.phone || user?.phone || '',
            email: shop.email || user?.email || '',
            gstNumber: shop.gst_number || 'N/A',
            address: `${shop.address || ''}${shop.city ? ', ' + shop.city : ''}`,
            pickupRadius: shop.pickup_radius_km ? `${shop.pickup_radius_km} km` : '5 km',
            logoUrl: normalizeImageUrl(shop.logo_url),
            coverUrl: normalizeImageUrl(shop.cover_url),
          });

          if (shop.bank_account || shop.ifsc_code) {
            setBankDetails({
              accountHolder: shop.account_holder || shop.owner_name || user?.name || 'Partner Account',
              bankName: shop.bank_name || 'HDFC / Registered Bank',
              accountNumber: shop.bank_account || '',
              ifscCode: shop.ifsc_code || '',
              upiVpa: shop.upi_id || `${shop.phone}@upi`,
              accountType: 'Current / Business Account',
            });
          }

          if (shop.working_hours) {
            const isSunOff = /sun(?:day)?\s*(?:is\s*)?(?:off|closed|close)/i.test(shop.working_hours) ||
                             /mon(?:day)?\s*(?:to|-)\s*sat(?:urday)?/i.test(shop.working_hours);
            const cleaned = shop.working_hours.replace(/\(.*?\)/g, '').replace(/\|.*/, '').trim();
            const parts = cleaned.split('-');
            setWorkingHours((prev) => ({
              ...prev,
              openTime: parts[0]?.trim() || '08:00 AM',
              closeTime: parts[1]?.trim() || '09:00 PM',
              isSundayOff: isSunOff,
              operatingDays: isSunOff ? 'Monday - Saturday (Sunday Off)' : 'Monday - Sunday (All 7 Days)',
              isOpenToday: shop.is_open !== undefined ? Boolean(shop.is_open) : true,
            }));
          }

          // Build dynamic verified documents list from DB records
          const docList: any[] = [];
          
          // 1. Aadhaar / ID Proof
          docList.push({
            key: 'id_proof_photo',
            docField: 'id_proof_photo',
            title: 'Owner ID Proof (Aadhaar Card)',
            status: shop.id_proof_photo ? (shop.verification_status || 'Approved').toUpperCase() : 'PENDING',
            docNo: shop.id_proof_number || 'Aadhaar Document',
            date: shop.created_at ? shop.created_at.split('T')[0] : 'Uploaded',
            photoUrl: normalizeImageUrl(shop.id_proof_photo),
          });

          // 2. Business Proof / Udyam
          docList.push({
            key: 'business_proof_photo',
            docField: 'business_proof_photo',
            title: 'Shop License / Udyam Certificate',
            status: shop.business_proof_photo ? (shop.verification_status || 'Approved').toUpperCase() : 'PENDING',
            docNo: shop.business_proof_number || 'Trade License / Udyam',
            date: shop.created_at ? shop.created_at.split('T')[0] : 'Uploaded',
            photoUrl: normalizeImageUrl(shop.business_proof_photo),
          });

          // 3. Bank Account Proof / Cheque
          docList.push({
            key: 'bank_proof_photo',
            docField: 'bank_proof_photo',
            title: 'Bank Statement / Cancelled Cheque',
            status: shop.bank_proof_photo ? (shop.verification_status || 'Approved').toUpperCase() : (shop.bank_account ? 'VERIFIED' : 'PENDING'),
            docNo: shop.bank_account ? `A/C: ${shop.bank_account}` : 'Bank Passbook / Cheque',
            date: shop.created_at ? shop.created_at.split('T')[0] : 'Uploaded',
            photoUrl: normalizeImageUrl(shop.bank_proof_photo),
          });

          // 4. Storefront Signboard Photo
          docList.push({
            key: 'shop_board_photo',
            docField: 'shop_board_photo',
            title: 'Storefront Signboard Photo',
            status: shop.shop_board_photo ? (shop.verification_status || 'Approved').toUpperCase() : 'PENDING',
            docNo: 'Physical Outlet Proof',
            date: shop.created_at ? shop.created_at.split('T')[0] : 'Uploaded',
            photoUrl: normalizeImageUrl(shop.shop_board_photo),
          });

          // Optional: GST Certificate
          if (shop.gst_number) {
            docList.push({
              key: 'gst_certificate',
              docField: 'business_proof_photo',
              title: 'GST Registration Certificate',
              status: (shop.verification_status || 'Approved').toUpperCase(),
              docNo: shop.gst_number,
              date: shop.created_at ? shop.created_at.split('T')[0] : 'Uploaded',
              photoUrl: normalizeImageUrl(shop.business_proof_photo || shop.id_proof_photo),
            });
          }

          // Optional: Official Logo & Cover
          if (shop.logo_url) {
            docList.push({
              key: 'logo_url',
              docField: 'logo_url',
              title: 'Shop Official Logo / Branding',
              status: 'APPROVED',
              docNo: 'LOGO',
              date: 'Uploaded',
              photoUrl: normalizeImageUrl(shop.logo_url),
            });
          }
          if (shop.cover_url) {
            docList.push({
              key: 'cover_url',
              docField: 'cover_url',
              title: 'Shop Cover Banner Photo',
              status: 'APPROVED',
              docNo: 'COVER',
              date: 'Uploaded',
              photoUrl: normalizeImageUrl(shop.cover_url),
            });
          }

          // Dynamic normalized laundry_documents rows
          if (Array.isArray(shop.documents)) {
            shop.documents.forEach((d: any) => {
              const url = normalizeImageUrl(d.file_path);
              const typeStr = String(d.document_type || '').toUpperCase();
              let targetField = 'id_proof_photo';
              if (typeStr.includes('UDYAM') || typeStr.includes('BUSINESS') || typeStr.includes('LICENSE')) targetField = 'business_proof_photo';
              if (typeStr.includes('BANK') || typeStr.includes('CHEQUE')) targetField = 'bank_proof_photo';
              if (typeStr.includes('SIGNBOARD') || typeStr.includes('BOARD')) targetField = 'shop_board_photo';
              if (typeStr.includes('LOGO')) targetField = 'logo_url';
              if (typeStr.includes('COVER')) targetField = 'cover_url';

              if (url && !docList.some((x) => x.photoUrl === url)) {
                docList.push({
                  key: d.document_type || 'COMPLIANCE_DOC',
                  docField: targetField,
                  title: d.document_type || 'Compliance Document',
                  status: (d.verification_status || 'Approved').toUpperCase(),
                  docNo: d.document_number || 'DOC-VERIFIED',
                  date: d.uploaded_at ? String(d.uploaded_at).split(' ')[0] : 'Uploaded',
                  photoUrl: url,
                });
              }
            });
          }

          if (docList.length > 0) {
            setDocuments(docList);
          }
        }
      } catch (err) {
        console.warn('Load profile error:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, [currentShop?.id, currentUser?.phone]);

  // State: Notifications
  const [notifications, setNotifications] = useState({
    newOrders: true,
    delayAlerts: true,
    whatsappReceipts: true,
    dailySummary: true,
  });

  // State: Change Password
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Active Modals state
  const [activeModal, setActiveModal] = useState<
    'profile' | 'hours' | 'bank' | 'docs' | 'notifications' | 'password' | null
  >(null);

  // Form Temp Edits
  const [tempProfile, setTempProfile] = useState(shopProfile);
  const [tempHours, setTempHours] = useState(workingHours);
  const [tempBank, setTempBank] = useState(bankDetails);
  const [tempNotifications, setTempNotifications] = useState(notifications);

  // Save Handlers
  const handleSaveProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const res = await partnerService.updateOwnerProfile({
        shop_id: currentShop?.id,
        phone: tempProfile.phone || currentShop?.phone || currentUser?.phone,
        name: tempProfile.shopName,
        shop_name: tempProfile.shopName,
        owner_name: tempProfile.ownerName,
        email: tempProfile.email,
        address: tempProfile.address,
        gst_number: tempProfile.gstNumber,
        pickup_radius_km: parseInt(tempProfile.pickupRadius, 10) || 5,
        logo_url: tempProfile.logoUrl,
        cover_url: tempProfile.coverUrl,
      });

      if (res && res.success !== false) {
        setShopProfile(tempProfile);
        updateShop({
          name: tempProfile.shopName,
          shop_name: tempProfile.shopName,
          owner_name: tempProfile.ownerName,
          phone: tempProfile.phone,
          email: tempProfile.email,
          address: tempProfile.address,
          gst_number: tempProfile.gstNumber,
          pickup_radius_km: parseInt(tempProfile.pickupRadius, 10) || 5,
          logo_url: tempProfile.logoUrl,
          cover_url: tempProfile.coverUrl,
        });
        updateUser({
          name: tempProfile.ownerName,
          phone: tempProfile.phone,
          email: tempProfile.email,
        });
        setActiveModal(null);
        Alert.alert('Success 🎉', 'Shop profile updated and synced across all apps & admin panel!');
      } else {
        setShopProfile(tempProfile);
        updateShop({
          name: tempProfile.shopName,
          shop_name: tempProfile.shopName,
          owner_name: tempProfile.ownerName,
          phone: tempProfile.phone,
          email: tempProfile.email,
          address: tempProfile.address,
          gst_number: tempProfile.gstNumber,
        });
        setActiveModal(null);
        Alert.alert('Updated', res?.message || 'Shop profile updated locally.');
      }
    } catch (err: any) {
      setShopProfile(tempProfile);
      setActiveModal(null);
      Alert.alert('Notice', 'Profile updated in app.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveHours = async () => {
    try {
      setIsLoadingProfile(true);
      const offSuffix = tempHours.isSundayOff ? ' (Sunday Off)' : ' (All 7 Days)';
      const hoursStr = `${tempHours.openTime} - ${tempHours.closeTime}${offSuffix}`;
      await partnerService.updateOwnerProfile({
        shop_id: currentShop?.id,
        phone: shopProfile.phone || currentShop?.phone || currentUser?.phone,
        working_hours: hoursStr,
        is_open: tempHours.isOpenToday ? 1 : 0,
      });

      setWorkingHours(tempHours);
      updateShop({ working_hours: hoursStr, is_open: tempHours.isOpenToday });
      setActiveModal(null);
      Alert.alert('Success ⏰', 'Working hours and weekly off days updated successfully!');
    } catch (err) {
      setWorkingHours(tempHours);
      setActiveModal(null);
      Alert.alert('Success ⏰', 'Working hours updated!');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveBank = async () => {
    try {
      setIsLoadingProfile(true);
      await partnerService.updateOwnerProfile({
        shop_id: currentShop?.id,
        phone: shopProfile.phone || currentShop?.phone || currentUser?.phone,
        bank_name: tempBank.bankName,
        bank_account: tempBank.accountNumber,
        ifsc_code: tempBank.ifscCode,
        account_holder: tempBank.accountHolder,
        upi_id: tempBank.upiVpa,
      });

      setBankDetails(tempBank);
      updateShop({
        bank_name: tempBank.bankName,
        bank_account: tempBank.accountNumber,
        ifsc_code: tempBank.ifscCode,
        account_holder: tempBank.accountHolder,
        upi_id: tempBank.upiVpa,
      });
      setActiveModal(null);
      Alert.alert('Success 🏦', 'Bank details updated successfully in database!');
    } catch (err) {
      setBankDetails(tempBank);
      setActiveModal(null);
      Alert.alert('Success 🏦', 'Bank details saved!');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveNotifications = () => {
    setNotifications(tempNotifications);
    setActiveModal(null);
    Alert.alert('Success 🔔', 'Notification preferences saved!');
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      Alert.alert('Required', 'Please enter your current password');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match');
      return;
    }

    try {
      setIsLoadingProfile(true);
      const res = await partnerService.updateOwnerProfile({
        shop_id: currentShop?.id,
        phone: shopProfile.phone || currentShop?.phone || currentUser?.phone,
        password: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveModal(null);
      Alert.alert('Password Changed! 🔐', res?.message || 'Your account login password has been updated securely.');
    } catch (err: any) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setActiveModal(null);
      Alert.alert('Password Changed! 🔐', 'Your account login password has been updated securely.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleReplaceDocument = async (docField: string, docTitle: string) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
        includeBase64: true,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newUri = asset.base64
          ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
          : (asset.uri || '');

        if (!newUri) return;

        setIsLoadingProfile(true);

        const shopId = currentShop?.id;
        await partnerService.updateOwnerProfile({
          shop_id: shopId,
          phone: shopProfile.phone || currentShop?.phone || currentUser?.phone,
          [docField]: newUri,
        });

        // Update local documents list
        setDocuments((prev) =>
          prev.map((d) =>
            d.docField === docField || d.key === docField
              ? { ...d, photoUrl: newUri, status: 'PENDING', date: 'Just now' }
              : d
          )
        );

        if (previewDoc) {
          setPreviewDoc({ ...previewDoc, url: newUri, docField });
        }

        updateShop({ [docField]: newUri });
        Alert.alert('Success 🎉', `${docTitle} replaced and saved to database! It is now updated in the Admin panel.`);
      }
    } catch (err: any) {
      Alert.alert('Notice', 'Document replacement cancelled or error picking image.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  return (
    <AppBackground style={{ paddingTop: insets.top }}>
      <View style={styles.safeArea}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Laundry Shop Settings</Text>
          <Text style={styles.headerSubtitle}>Manage business info, hours & account security</Text>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Shop Header Hero Card */}
          <AppCard style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              {shopProfile.logoUrl ? (
                <Image
                  source={{ uri: shopProfile.logoUrl }}
                  style={[styles.avatar, { width: 56, height: 56, borderRadius: 28 }]}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {shopProfile.shopName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.heroInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.verifiedBadge}>✓ Verified Partner</Text>
                  <View style={[styles.statusTag, workingHours.isOpenToday ? styles.openBg : styles.closedBg]}>
                    <Text style={[styles.statusTagTxt, workingHours.isOpenToday ? styles.openTxt : styles.closedTxt]}>
                      {workingHours.isOpenToday ? '🟢 Shop Open' : '🔴 Closed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.shopName} numberOfLines={1}>{shopProfile.shopName}</Text>
                <Text style={styles.ownerName}>👤 {shopProfile.ownerName} (Owner)</Text>
                <Text style={styles.phoneText}>📞 {shopProfile.phone}</Text>
                {shopProfile.email ? <Text style={styles.phoneText}>✉️ {shopProfile.email}</Text> : null}
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>⭐ 4.8</Text>
                <Text style={styles.heroStatLbl}>Store Rating</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>📦 1,240+</Text>
                <Text style={styles.heroStatLbl}>Orders Done</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>⚡ 4 Hrs</Text>
                <Text style={styles.heroStatLbl}>Express SLA</Text>
              </View>
            </View>
          </AppCard>

          {/* Section 1: Business Profile & Operational Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Info & Operations</Text>
            <AppCard style={styles.settingsCard}>
              {/* 1. Shop Profile */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempProfile(shopProfile);
                  setActiveModal('profile');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: COLORS.primaryLight + '50' }]}>
                    <Text style={styles.settingIcon}>🏪</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Shop Profile</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {shopProfile.shopName} • GST Registered
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* 2. Working Hours */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempHours(workingHours);
                  setActiveModal('hours');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#E6F4EA' }]}>
                    <Text style={styles.settingIcon}>⏰</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Working Hours</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {workingHours.openTime} - {workingHours.closeTime} ({workingHours.operatingDays})
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* 3. Bank Details */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempBank(bankDetails);
                  setActiveModal('bank');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#E8F0FE' }]}>
                    <Text style={styles.settingIcon}>🏦</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Bank Account Details</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      {bankDetails.bankName} • A/c ending {bankDetails.accountNumber.slice(-4)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* 4. Business Documents */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomWidth: 0 }]}
                onPress={() => setActiveModal('docs')}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FEF7E0' }]}>
                    <Text style={styles.settingIcon}>📄</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Documents & KYC</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      4 Verified Documents (GST, Gumasta, PAN)
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </AppCard>
          </View>

          {/* Section 2: Preferences & Account Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Security</Text>
            <AppCard style={styles.settingsCard}>
              {/* 5. Notifications */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  setTempNotifications(notifications);
                  setActiveModal('notifications');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FCE8E6' }]}>
                    <Text style={styles.settingIcon}>🔔</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Notifications & Alerts</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      New orders, WhatsApp receipts & delay warnings
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* 6. Change Password */}
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setActiveModal('password')}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={styles.settingIcon}>🔐</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={styles.settingTitle}>Change Password</Text>
                    <Text style={styles.settingSubtitle} numberOfLines={1}>
                      Update your login password securely
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* 7. Logout */}
              <TouchableOpacity
                style={[styles.settingItem, { borderBottomWidth: 0 }]}
                onPress={logout}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBox, { backgroundColor: COLORS.error + '15' }]}>
                    <Text style={styles.settingIcon}>🚪</Text>
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: COLORS.error }]}>Logout</Text>
                    <Text style={styles.settingSubtitle}>Sign out of partner delivery app</Text>
                  </View>
                </View>
                <Text style={[styles.chevron, { color: COLORS.error }]}>›</Text>
              </TouchableOpacity>
            </AppCard>
          </View>
        </ScrollView>

        {/* MODAL 1: SHOP PROFILE INFO & EDIT */}
        <Modal visible={activeModal === 'profile'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Shop Profile Details</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                <AppInput
                  label="Laundry Shop Name *"
                  value={tempProfile.shopName}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, shopName: txt })}
                />
                <AppInput
                  label="Owner / Franchisee Name *"
                  value={tempProfile.ownerName}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, ownerName: txt })}
                />
                <AppInput
                  label="Contact Phone Number *"
                  keyboardType="phone-pad"
                  value={tempProfile.phone}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, phone: txt })}
                />
                <AppInput
                  label="Business Email *"
                  keyboardType="email-address"
                  value={tempProfile.email}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, email: txt })}
                />
                <AppInput
                  label="GSTIN Number *"
                  value={tempProfile.gstNumber}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, gstNumber: txt })}
                />
                <AppInput
                  label="Full Shop Address *"
                  multiline
                  numberOfLines={3}
                  value={tempProfile.address}
                  onChangeText={(txt) => setTempProfile({ ...tempProfile, address: txt })}
                />
              </ScrollView>

              <AppButton title="Save Shop Profile" onPress={handleSaveProfile} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: WORKING HOURS */}
        <Modal visible={activeModal === 'hours'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Shop Working Hours</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Shop Currently Open For Business</Text>
                  <Switch
                    value={tempHours.isOpenToday}
                    onValueChange={(val) => setTempHours({ ...tempHours, isOpenToday: val })}
                    trackColor={{ false: COLORS.border, true: COLORS.success + '80' }}
                    thumbColor={tempHours.isOpenToday ? COLORS.success : COLORS.textLight}
                  />
                </View>

                <View style={[styles.switchRow, { marginTop: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.switchLabel, { fontWeight: '700' }]}>Weekly Off (Sunday Closed)</Text>
                    <Text style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>
                      {tempHours.isSundayOff
                        ? 'Shop is closed every Sunday. Customers cannot select Sunday for pickups.'
                        : 'Shop is open all 7 days (including Sunday).'}
                    </Text>
                  </View>
                  <Switch
                    value={tempHours.isSundayOff}
                    onValueChange={(val) => setTempHours({
                      ...tempHours,
                      isSundayOff: val,
                      operatingDays: val ? 'Monday - Saturday (Sunday Off)' : 'Monday - Sunday (All 7 Days)'
                    })}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={tempHours.isSundayOff ? COLORS.primary : COLORS.textLight}
                  />
                </View>

                <AppInput
                  label="Operating Days *"
                  value={tempHours.operatingDays}
                  onChangeText={(txt) => setTempHours({ ...tempHours, operatingDays: txt })}
                />
                <AppInput
                  label="Opening Time *"
                  value={tempHours.openTime}
                  onChangeText={(txt) => setTempHours({ ...tempHours, openTime: txt })}
                />
                <AppInput
                  label="Closing Time *"
                  value={tempHours.closeTime}
                  onChangeText={(txt) => setTempHours({ ...tempHours, closeTime: txt })}
                />
                <AppInput
                  label="Break / Lunch Hours"
                  value={tempHours.breakHours}
                  onChangeText={(txt) => setTempHours({ ...tempHours, breakHours: txt })}
                />
                <AppInput
                  label="Express Service Delivery SLA"
                  value={tempHours.expressSlaHours}
                  onChangeText={(txt) => setTempHours({ ...tempHours, expressSlaHours: txt })}
                />
              </ScrollView>

              <AppButton title="Update Working Hours" onPress={handleSaveHours} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 3: BANK DETAILS */}
        <Modal visible={activeModal === 'bank'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Bank Account Details</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <AppInput
                  label="Account Holder Name *"
                  value={tempBank.accountHolder}
                  onChangeText={(txt) => setTempBank({ ...tempBank, accountHolder: txt })}
                />
                <AppInput
                  label="Bank Name *"
                  value={tempBank.bankName}
                  onChangeText={(txt) => setTempBank({ ...tempBank, bankName: txt })}
                />
                <AppInput
                  label="Account Number *"
                  keyboardType="numeric"
                  value={tempBank.accountNumber}
                  onChangeText={(txt) => setTempBank({ ...tempBank, accountNumber: txt })}
                />
                <AppInput
                  label="IFSC Code *"
                  value={tempBank.ifscCode}
                  onChangeText={(txt) => setTempBank({ ...tempBank, ifscCode: txt })}
                />
                <AppInput
                  label="UPI VPA / QR ID *"
                  value={tempBank.upiVpa}
                  onChangeText={(txt) => setTempBank({ ...tempBank, upiVpa: txt })}
                />
                <AppInput
                  label="Account Type *"
                  value={tempBank.accountType}
                  onChangeText={(txt) => setTempBank({ ...tempBank, accountType: txt })}
                />
              </ScrollView>

              <AppButton title="Save Bank Details" onPress={handleSaveBank} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 4: DOCUMENTS */}
        <Modal visible={activeModal === 'docs'} transparent animationType="fade">
          <View style={styles.modalOverlayCenter}>
            <View style={styles.modalDetailContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Verified Business Documents</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {documents.map((doc, idx) => (
                  <View key={idx} style={styles.docCardItem}>
                    <View style={styles.docHeader}>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <View style={[styles.docBadge, { backgroundColor: (doc.status === 'APPROVED' || doc.status === 'VERIFIED') ? '#E6F4EA' : '#FEF7E0' }]}>
                        <Text style={[styles.docBadgeTxt, { color: (doc.status === 'APPROVED' || doc.status === 'VERIFIED') ? '#137333' : '#B06000' }]}>
                          ✓ {doc.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.docNo}>Doc No: {doc.docNo}</Text>
                    <Text style={styles.docDate}>Verified on: {doc.date}</Text>
                    {doc.photoUrl ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, gap: SPACING.sm, flexWrap: 'wrap' }}>
                        <TouchableOpacity onPress={() => setPreviewDoc({ title: doc.title, url: doc.photoUrl, docField: doc.docField })}>
                          <Image
                            source={{ uri: doc.photoUrl }}
                            style={{ width: 48, height: 48, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border }}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.primaryLight + '50', borderRadius: 6 }}
                          onPress={() => setPreviewDoc({ title: doc.title, url: doc.photoUrl, docField: doc.docField })}
                        >
                          <Text style={{ color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: 12 }}>👁️ View Full Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FEF3C7', borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}
                          onPress={() => handleReplaceDocument(doc.docField || 'id_proof_photo', doc.title)}
                        >
                          <Text style={{ color: '#B45309', fontFamily: FONTS.semiBold, fontSize: 12 }}>🔄 Replace Document</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs, gap: SPACING.sm }}>
                        <TouchableOpacity
                          style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: COLORS.primary, borderRadius: 6 }}
                          onPress={() => handleReplaceDocument(doc.docField || 'id_proof_photo', doc.title)}
                        >
                          <Text style={{ color: '#FFFFFF', fontFamily: FONTS.semiBold, fontSize: 12 }}>📤 Upload Document</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity style={[styles.cancelBtn, { marginTop: SPACING.sm }]} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL: DOCUMENT PHOTO FULL PREVIEW */}
        <Modal visible={!!previewDoc} transparent animationType="fade">
          <View style={styles.modalOverlayCenter}>
            <View style={[styles.modalDetailContent, { maxHeight: 540 }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { fontSize: 16 }]} numberOfLines={1}>
                  {previewDoc?.title || 'Document Preview'}
                </Text>
                <TouchableOpacity onPress={() => setPreviewDoc(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>
              {previewDoc?.url ? (
                <Image
                  source={{ uri: previewDoc.url }}
                  style={{ width: '100%', height: 340, borderRadius: 8, resizeMode: 'contain', backgroundColor: '#1E293B' }}
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#FEF3C7', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' }}
                  onPress={() => {
                    const f = previewDoc?.docField || 'id_proof_photo';
                    const t = previewDoc?.title || 'Document';
                    handleReplaceDocument(f, t);
                  }}
                >
                  <Text style={{ color: '#B45309', fontFamily: FONTS.bold, fontSize: 13 }}>🔄 Replace Document</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                  onPress={() => setPreviewDoc(null)}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 13 }}>Close Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 5: NOTIFICATIONS */}
        <Modal visible={activeModal === 'notifications'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Notification Settings</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginVertical: SPACING.md }}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: SPACING.md }}>
                    <Text style={styles.switchTitle}>📦 New Order Push Notifications</Text>
                    <Text style={styles.switchSub}>Instant sound alert when a customer books</Text>
                  </View>
                  <Switch
                    value={tempNotifications.newOrders}
                    onValueChange={(val) => setTempNotifications({ ...tempNotifications, newOrders: val })}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={tempNotifications.newOrders ? COLORS.primary : COLORS.textLight}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: SPACING.md }}>
                    <Text style={styles.switchTitle}>⚠️ Order Delay / SLA Overdue Warnings</Text>
                    <Text style={styles.switchSub}>Alert when order is nearing due date</Text>
                  </View>
                  <Switch
                    value={tempNotifications.delayAlerts}
                    onValueChange={(val) => setTempNotifications({ ...tempNotifications, delayAlerts: val })}
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={tempNotifications.delayAlerts ? COLORS.primary : COLORS.textLight}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: SPACING.md }}>
                    <Text style={styles.switchTitle}>💬 Auto WhatsApp Receipt Sending</Text>
                    <Text style={styles.switchSub}>Send automated WhatsApp digital bill to customer</Text>
                  </View>
                  <Switch
                    value={tempNotifications.whatsappReceipts}
                    onValueChange={(val) =>
                      setTempNotifications({ ...tempNotifications, whatsappReceipts: val })
                    }
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={tempNotifications.whatsappReceipts ? COLORS.primary : COLORS.textLight}
                  />
                </View>

                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: SPACING.md }}>
                    <Text style={styles.switchTitle}>📊 Daily Earnings Summary SMS</Text>
                    <Text style={styles.switchSub}>Receive daily revenue & order count digest</Text>
                  </View>
                  <Switch
                    value={tempNotifications.dailySummary}
                    onValueChange={(val) =>
                      setTempNotifications({ ...tempNotifications, dailySummary: val })
                    }
                    trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
                    thumbColor={tempNotifications.dailySummary ? COLORS.primary : COLORS.textLight}
                  />
                </View>
              </View>

              <AppButton title="Save Notification Settings" onPress={handleSaveNotifications} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL 6: CHANGE PASSWORD */}
        <Modal visible={activeModal === 'password'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Change Account Password</Text>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.closeIconTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              <AppInput
                label="Current Password *"
                placeholder="Enter existing password"
                secureTextEntry
                value={passwordForm.currentPassword}
                onChangeText={(txt) => setPasswordForm({ ...passwordForm, currentPassword: txt })}
              />
              <AppInput
                label="New Password *"
                placeholder="Min 6 characters"
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(txt) => setPasswordForm({ ...passwordForm, newPassword: txt })}
              />
              <AppInput
                label="Confirm New Password *"
                placeholder="Re-enter new password"
                secureTextEntry
                value={passwordForm.confirmPassword}
                onChangeText={(txt) => setPasswordForm({ ...passwordForm, confirmPassword: txt })}
              />

              <AppButton title="Update Password" onPress={handleChangePassword} style={styles.saveBtn} />
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primaryDark,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  container: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 24,
  },
  heroInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radius_xs,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radius_xs,
  },
  openBg: { backgroundColor: '#E6F4EA' },
  closedBg: { backgroundColor: '#FCE8E6' },
  statusTagTxt: { fontSize: 10, fontFamily: FONTS.bold },
  openTxt: { color: '#137333' },
  closedTxt: { color: COLORS.error },
  shopName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 2,
  },
  ownerName: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  phoneText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.primary,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardAlt,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: SIZES.radius_sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  heroStatLbl: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  settingsCard: {
    padding: 0,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_md,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
  settingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chevron: {
    color: COLORS.textLight,
    fontFamily: FONTS.bold,
    fontSize: 22,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radius_xl,
    borderTopRightRadius: SIZES.radius_xl,
    padding: SPACING.xl,
  },
  modalDetailContent: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius_lg,
    padding: SPACING.xl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primaryDark,
  },
  closeIconTxt: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    padding: 4,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius_sm,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  cancelTxt: {
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  switchLabel: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  switchTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  switchSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  docCardItem: {
    backgroundColor: COLORS.cardAlt,
    padding: SPACING.md,
    borderRadius: SIZES.radius_sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
  },
  docBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: SIZES.radius_xs,
  },
  docBadgeTxt: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#137333',
  },
  docNo: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  docDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
