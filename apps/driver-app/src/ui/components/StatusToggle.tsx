import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { DriverStatus } from '../../store/driver.store';

interface StatusToggleProps {
  status: DriverStatus;
  isLoading: boolean;
  onToggle: (goOnline: boolean) => void;
}

export function StatusToggle({ status, isLoading, onToggle }: StatusToggleProps) {
  const isOnline = status === 'online' || status === 'busy';
  const isBusy = status === 'busy';

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online - Ready for trips';
      case 'busy':
        return 'Busy - On a trip';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#34C759';
      case 'busy':
        return '#FF9500';
      case 'offline':
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
        <Switch
          value={isOnline}
          onValueChange={(value: boolean) => onToggle(value)}
          disabled={isLoading || isBusy}
          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isBusy && (
        <Text style={styles.busyNote}>
          Complete your current trip to go offline
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#3C3C43',
  },
  busyNote: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
