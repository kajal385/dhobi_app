import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';

interface LocationAccuracyModalProps {
  visible: boolean;
  onTurnOn: () => void;
  onNoThanks: () => void;
}

export const LocationAccuracyModal: React.FC<LocationAccuracyModalProps> = ({
  visible,
  onTurnOn,
  onNoThanks,
}) => {
  const isDark = useColorScheme() === 'dark';

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onNoThanks}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Header Title */}
            <Text
              style={[
                styles.title,
                { color: isDark ? '#F8FAFC' : '#1E293B' },
              ]}
            >
              For a better experience, your device will need to use Location Accuracy
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? '#CBD5E1' : '#475569' },
              ]}
            >
              The following settings should be on:
            </Text>

            {/* Item 1: Device Location */}
            <View style={styles.itemRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <View style={styles.itemTextContainer}>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: isDark ? '#F1F5F9' : '#1E293B' },
                  ]}
                >
                  Device location
                </Text>
              </View>
            </View>

            {/* Item 2: Location Accuracy */}
            <View style={styles.itemRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🎯</Text>
              </View>
              <View style={styles.itemTextContainer}>
                <Text
                  style={[
                    styles.itemBodyText,
                    { color: isDark ? '#94A3B8' : '#475569' },
                  ]}
                >
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: isDark ? '#F1F5F9' : '#1E293B' },
                    ]}
                  >
                    Location Accuracy
                  </Text>
                  , which provides more accurate location for apps and services. To
                  do this, Google periodically processes information about device
                  sensors and wireless signals from your device to crowdsource
                  wireless signal locations. These are used without identifying you to
                  improve location accuracy and location-based services and to
                  improve, provide and maintain Google's services based on Google's
                  legitimate interests to serve users' needs.
                </Text>
              </View>
            </View>

            {/* Footer Note */}
            <Text
              style={[
                styles.footerNote,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              You can change this at any time in location settings.
            </Text>
          </ScrollView>

          {/* Action Buttons Row */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNoThanks}
              style={[
                styles.btnNoThanks,
                {
                  borderColor: isDark ? '#475569' : '#64748B',
                  backgroundColor: isDark ? 'transparent' : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[
                  styles.btnNoThanksText,
                  { color: isDark ? '#E2E8F0' : '#0F766E' },
                ]}
              >
                No, thanks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onTurnOn}
              style={styles.btnTurnOn}
            >
              <Text style={styles.btnTurnOnText}>Turn on</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  iconText: {
    fontSize: 20,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  itemBodyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  footerNote: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  btnNoThanks: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNoThanksText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  btnTurnOn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 24,
    backgroundColor: '#006A6B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#006A6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  btnTurnOnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LocationAccuracyModal;
