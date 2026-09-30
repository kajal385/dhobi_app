import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS, SIZES } from '../constants/theme';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; darkBg: string; darkText: string }
> = {
  placed:             { label: 'Placed',              bg: '#FEF3C7', text: '#B45309', darkBg: '#3D3020', darkText: '#FBBF24' },
  pending:            { label: 'Placed',              bg: '#FEF3C7', text: '#B45309', darkBg: '#3D3020', darkText: '#FBBF24' },
  received:           { label: 'Received',            bg: '#DBEAFE', text: '#1E40AF', darkBg: '#1E3A8A', darkText: '#93C5FD' },
  accepted:           { label: 'Received',            bg: '#DBEAFE', text: '#1E40AF', darkBg: '#1E3A8A', darkText: '#93C5FD' },
  confirmed:          { label: 'Received',            bg: '#DBEAFE', text: '#1E40AF', darkBg: '#1E3A8A', darkText: '#93C5FD' },
  picked_up:          { label: 'Picked Up',           bg: '#D7D9FC', text: '#3730A3', darkBg: '#2D2A5E', darkText: '#A5B4FC' },
  in_process:         { label: 'In-Process',          bg: '#E0E7FF', text: '#4338CA', darkBg: '#312E81', darkText: '#C7D2FE' },
  in_progress:        { label: 'In-Process',          bg: '#E0E7FF', text: '#4338CA', darkBg: '#312E81', darkText: '#C7D2FE' },
  washing:            { label: 'In-Process',          bg: '#E0E7FF', text: '#4338CA', darkBg: '#312E81', darkText: '#C7D2FE' },
  ironing:            { label: 'In-Process',          bg: '#F3DDF0', text: '#701A75', darkBg: '#3A2040', darkText: '#E879F9' },
  ready_for_delivery: { label: 'Ready',               bg: '#FEF3C7', text: '#B45309', darkBg: '#3D3020', darkText: '#FBBF24' },
  ready:              { label: 'Ready',               bg: '#FEF3C7', text: '#B45309', darkBg: '#3D3020', darkText: '#FBBF24' },
  customer_confirmed: { label: 'Customer Available',  bg: '#E0F2FE', text: '#0284C7', darkBg: '#0C4A6E', darkText: '#7DD3FC' },
  delivery_assigned:  { label: 'Delivery Assigned',   bg: '#EDE9FE', text: '#6D28D9', darkBg: '#4C1D95', darkText: '#DDD6FE' },
  out_for_delivery:   { label: 'Out for Delivery',    bg: '#D7D9FC', text: '#3730A3', darkBg: '#2D2A5E', darkText: '#818CF8' },
  delivered:          { label: 'Delivered',           bg: '#D1FAE5', text: '#065F46', darkBg: '#064E3B', darkText: '#6EE7B7' },
  completed:          { label: 'Delivered',           bg: '#D1FAE5', text: '#065F46', darkBg: '#064E3B', darkText: '#6EE7B7' },
  cancelled:          { label: 'Cancelled',           bg: '#FEE2E2', text: '#991B1B', darkBg: '#450A0A', darkText: '#FCA5A5' },
};

const DEFAULT_CONFIG = {
  label: 'Pending',
  bg: '#FDDFC2',
  text: '#92400E',
  darkBg: '#3D3020',
  darkText: '#FBBF24',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isDark = useColorScheme() === 'dark';
  const key = String(status || '').toLowerCase().trim();
  const config = STATUS_CONFIG[key] || {
    ...DEFAULT_CONFIG,
    label: status ? String(status).replace(/_/g, ' ').toUpperCase() : 'PENDING',
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {
          backgroundColor: isDark ? config.darkBg : config.bg,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color: isDark ? config.darkText : config.text },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radius_full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
