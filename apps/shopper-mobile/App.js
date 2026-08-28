import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Text,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../src/theme/colors';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { NavigationProvider, useNavigation } from '../../src/navigation/NavigationContext';

import Header from '../../src/components/Header';
import BottomNav from '../../src/components/BottomNav';
import OfflineBanner from '../../src/components/OfflineBanner';
import ErrorBoundary from '../../src/components/ErrorBoundary';

// Global Modals
import SearchFiltersModal from '../../src/screens/discovery/SearchFiltersModal';
import MerchantConflictModal from '../../src/screens/checkout/MerchantConflictModal';
import PaystackPaymentScreen from '../../src/screens/checkout/PaystackPaymentScreen';
import ProductReviewsModal from '../../src/components/ProductReviewsModal';
import VoucherSelectorModal from '../../src/components/VoucherSelectorModal';
import ImageGalleryModal from '../../src/components/ImageGalleryModal';
import InvoiceViewerModal from '../../src/components/InvoiceViewerModal';

// Discovery Screens
import HomeScreen from '../../src/screens/discovery/HomeScreen';
import OnboardingScreen from '../../src/screens/discovery/OnboardingScreen';
import SearchScreen from '../../src/screens/discovery/SearchScreen';
import CategoryScreen from '../../src/screens/discovery/CategoryScreen';
import ProductDetailScreen from '../../src/screens/discovery/ProductDetailScreen';
import MerchantStoreScreen from '../../src/screens/discovery/MerchantStoreScreen';

// Auth Screens
import SignInScreen from '../../src/screens/auth/SignInScreen';
import SignUpScreen from '../../src/screens/auth/SignUpScreen';
import VerifyOTPScreen from '../../src/screens/auth/VerifyOTPScreen';
import PasswordRecoveryScreen from '../../src/screens/auth/PasswordRecoveryScreen';

// Account Screens
import AccountScreen from '../../src/screens/account/AccountScreen';
import AddressBookScreen from '../../src/screens/account/AddressBookScreen';
import NotificationsScreen from '../../src/screens/account/NotificationsScreen';
import PrivacyScreen from '../../src/screens/account/PrivacyScreen';
import SavedScreen from '../../src/screens/account/SavedScreen';

// Bag & Checkout Screens
import BagScreen from '../../src/screens/checkout/BagScreen';
import CheckoutAddressScreen from '../../src/screens/checkout/CheckoutAddressScreen';
import CheckoutDeliveryScreen from '../../src/screens/checkout/CheckoutDeliveryScreen';
import CheckoutReviewScreen from '../../src/screens/checkout/CheckoutReviewScreen';
import CheckoutProcessingScreen from '../../src/screens/checkout/CheckoutProcessingScreen';
import OrderConfirmationScreen from '../../src/screens/checkout/OrderConfirmationScreen';
import CheckoutFailedScreen from '../../src/screens/checkout/CheckoutFailedScreen';

// Orders & Care Screens
import OrdersListScreen from '../../src/screens/orders/OrdersListScreen';
import OrderDetailScreen from '../../src/screens/orders/OrderDetailScreen';
import OrderTrackingScreen from '../../src/screens/orders/OrderTrackingScreen';
import CancelOrderScreen from '../../src/screens/orders/CancelOrderScreen';
import ReturnRequestScreen from '../../src/screens/orders/ReturnRequestScreen';
import ReturnStatusScreen from '../../src/screens/orders/ReturnStatusScreen';
import CreateSupportTicketScreen from '../../src/screens/orders/CreateSupportTicketScreen';
import SupportTicketScreen from '../../src/screens/orders/SupportTicketScreen';
import RefundStatusScreen from '../../src/screens/orders/RefundStatusScreen';

function AppContent() {
  const { cart, wishlist, notifications, orders, toastMessage } = useApp();
  const { currentRoute, activeTab, selectTab, navigate } = useNavigation();

  const [isOffline, setIsOffline] = useState(false);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const activeOrdersCount = orders.filter((o) => ['Placed', 'Accepted', 'Shipped', 'Out for Delivery'].includes(o.status)).length;

  const renderScreen = () => {
    switch (currentRoute.name) {
      case 'onboarding':
        return <OnboardingScreen />;
      case 'search':
        return <SearchScreen />;
      case 'category':
        return <CategoryScreen />;
      case 'product-detail':
        return <ProductDetailScreen />;
      case 'merchant-store':
        return <MerchantStoreScreen />;
      case 'auth-signin':
        return <SignInScreen />;
      case 'auth-signup':
        return <SignUpScreen />;
      case 'auth-verify':
        return <VerifyOTPScreen />;
      case 'auth-recover':
        return <PasswordRecoveryScreen />;
      case 'account':
        return <AccountScreen />;
      case 'account-addresses':
        return <AddressBookScreen />;
      case 'account-notifications':
        return <NotificationsScreen />;
      case 'account-privacy':
        return <PrivacyScreen />;
      case 'saved':
        return <SavedScreen />;
      case 'bag':
        return <BagScreen />;
      case 'checkout-address':
        return <CheckoutAddressScreen />;
      case 'checkout-delivery':
        return <CheckoutDeliveryScreen />;
      case 'checkout-review':
        return <CheckoutReviewScreen />;
      case 'checkout-processing':
        return <CheckoutProcessingScreen />;
      case 'checkout-confirmation':
        return <OrderConfirmationScreen />;
      case 'checkout-failed':
        return <CheckoutFailedScreen />;
      case 'orders':
        return <OrdersListScreen />;
      case 'order-detail':
        return <OrderDetailScreen />;
      case 'order-tracking':
        return <OrderTrackingScreen />;
      case 'order-cancel':
        return <CancelOrderScreen />;
      case 'order-return':
        return <ReturnRequestScreen />;
      case 'return-status':
        return <ReturnStatusScreen />;
      case 'create-ticket':
        return <CreateSupportTicketScreen />;
      case 'support-ticket':
        return <SupportTicketScreen />;
      case 'refund-status':
        return <RefundStatusScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  };

  const showTopHeader = ['home'].includes(currentRoute.name);
  const showBottomNav = !['onboarding', 'checkout-processing', 'checkout-paystack'].includes(currentRoute.name);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />

      <OfflineBanner isOffline={isOffline} />

      {showTopHeader && (
        <Header
          notificationCount={unreadNotifsCount}
          onNotificationPress={() => navigate('account-notifications')}
        />
      )}

      <View style={styles.screenWrapper}>
        <ErrorBoundary>{renderScreen()}</ErrorBoundary>
      </View>

      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.goldAccent} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <SearchFiltersModal />
      <MerchantConflictModal />
      <PaystackPaymentScreen />
      <ProductReviewsModal />
      <VoucherSelectorModal />
      <ImageGalleryModal />
      <InvoiceViewerModal />

      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={selectTab}
          cartCount={cart.reduce((total, i) => total + i.quantity, 0)}
          activeOrdersCount={activeOrdersCount}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenWrapper: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: COLORS.emeraldPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 999,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
