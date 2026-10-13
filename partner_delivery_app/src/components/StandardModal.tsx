import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SPACING, SIZES } from '../theme';

const { width } = Dimensions.get('window');

export interface ModalDetailItem {
  icon?: string;
  label: string;
  value: string;
}

export interface StandardModalProps {
  visible: boolean;
  onClose: () => void;
  type?: 'success' | 'info' | 'warning' | 'error';
  icon?: string;
  badgeLabel?: string;
  title: string;
  subtitle?: string;
  details?: ModalDetailItem[];
  primaryButtonText?: string;
  primaryActionText?: string;
  onPrimaryPress?: () => void;
  onPrimaryAction?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
}

export const StandardModal: React.FC<StandardModalProps> = ({
  visible,
  onClose,
  type = 'success',
  icon,
  badgeLabel,
  title,
  subtitle,
  details,
  primaryButtonText,
  primaryActionText,
  onPrimaryPress,
  onPrimaryAction,
  secondaryButtonText,
  onSecondaryPress,
}) => {
  const getThemeMeta = () => {
    switch (type) {
      case 'error':
        return {
          badgeBg: '#FEE2E2',
          badgeBorder: '#EF4444',
          defaultIcon: '⚠️',
          gradient: ['#EF4444', '#DC2626'],
        };
      case 'warning':
        return {
          badgeBg: '#FEF3C7',
          badgeBorder: '#F59E0B',
          defaultIcon: '⚡',
          gradient: ['#F59E0B', '#D97706'],
        };
      case 'info':
        return {
          badgeBg: '#E0E7FF',
          badgeBorder: '#6366F1',
          defaultIcon: 'ℹ️',
          gradient: ['#6366F1', '#4F46E5'],
        };
      case 'success':
      default:
        return {
          badgeBg: '#EDE9FE',
          badgeBorder: '#8162EE',
          defaultIcon: '🎉',
          gradient: ['#8162EE', '#A672D6', '#E18C8E'],
        };
    }
  };

  const meta = getThemeMeta();
  const displayIcon = icon || meta.defaultIcon;
  const finalPrimaryText = primaryActionText || primaryButtonText || 'OK, Got It';

  const handlePrimary = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondary = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Badge Icon */}
          <View style={[styles.badgeOuter, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
            <Text style={styles.badgeEmoji}>{displayIcon}</Text>
          </View>

          {badgeLabel ? (
            <View style={[styles.badgePill, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
              <Text style={[styles.badgePillText, { color: meta.badgeBorder }]}>{badgeLabel}</Text>
            </View>
          ) : null}

          {/* Title & Subtitle */}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {/* Structured Details Box */}
          {details && details.length > 0 && (
            <View style={styles.detailsBox}>
              {details.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.detailRow,
                    index === details.length - 1 && styles.detailRowLast,
                  ]}
                >
                  <View style={styles.detailLabelWrap}>
                    {item.icon ? <Text style={styles.detailIcon}>{item.icon}</Text> : null}
                    <Text style={styles.detailLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handlePrimary}
              style={styles.primaryBtnWrapper}
            >
              <LinearGradient
                colors={meta.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>{finalPrimaryText}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {secondaryButtonText ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSecondary}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: Math.min(width - 36, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
  },
  badgeOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8162EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgePillText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontFamily: FONTS.bold,
    color: '#1A1830',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#6B6889',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F9F8FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE6FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECFF',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailIcon: {
    fontSize: 15,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#6B6889',
  },
  detailValue: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#1A1830',
    textAlign: 'right',
    maxWidth: '52%',
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#8162EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE8FF',
    backgroundColor: '#FAFAFF',
  },
  secondaryBtnText: {
    color: '#6B6889',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
});
