import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SellFast ErrorBoundary caught error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.routeKey !== this.props.routeKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.box}>
            <View style={styles.iconCircle}>
              <Ionicons name="refresh-circle-outline" size={54} color={COLORS.emeraldPrimary} />
            </View>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.sub}>
              An unexpected error occurred in this view. Tap below to reload and return home gracefully.
            </Text>

            <TouchableOpacity style={styles.reloadBtn} activeOpacity={0.85} onPress={this.handleReload}>
              <Ionicons name="reload" size={16} color={COLORS.white} />
              <Text style={styles.reloadText}>Reload & Return Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    fontFamily: 'PlayfairDisplay-Bold',
  },
  sub: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  reloadBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F382C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  reloadText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
