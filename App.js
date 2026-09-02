import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Text,
  Platform,
  ImageBackground,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { COLORS } from './src/theme/colors';
import { AppProvider, useApp } from './src/context/AppContext';
import { NavigationProvider, useNavigation } from './src/navigation/NavigationContext';

import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import OfflineBanner from './src/components/OfflineBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import AnimatedToast from './src/components/AnimatedToast';

// Global Modals
import SearchFiltersModal from './src/screens/discovery/SearchFiltersModal';
import MerchantConflictModal from './src/screens/checkout/MerchantConflictModal';
import PaystackPaymentScreen from './src/screens/checkout/PaystackPaymentScreen';
import ProductReviewsModal from './src/components/ProductReviewsModal';
import VoucherSelectorModal from './src/components/VoucherSelectorModal';
import ImageGalleryModal from './src/components/ImageGalleryModal';
import InvoiceViewerModal from './src/components/InvoiceViewerModal';
import ProductQuickLookModal from './src/components/ProductQuickLookModal';

// Discovery Screens
import HomeScreen from './src/screens/discovery/HomeScreen';
import OnboardingScreen from './src/screens/discovery/OnboardingScreen';
import SearchScreen from './src/screens/discovery/SearchScreen';
import CategoryScreen from './src/screens/discovery/CategoryScreen';
import ProductDetailScreen from './src/screens/discovery/ProductDetailScreen';
import MerchantStoreScreen from './src/screens/discovery/MerchantStoreScreen';

// Auth Screens
import SignInScreen from './src/screens/auth/SignInScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import VerifyOTPScreen from './src/screens/auth/VerifyOTPScreen';
import PasswordRecoveryScreen from './src/screens/auth/PasswordRecoveryScreen';

// Account Screens
import AccountScreen from './src/screens/account/AccountScreen';
import AddressBookScreen from './src/screens/account/AddressBookScreen';
import NotificationsScreen from './src/screens/account/NotificationsScreen';
import PrivacyScreen from './src/screens/account/PrivacyScreen';
import SavedScreen from './src/screens/account/SavedScreen';

// Bag & Checkout Screens
import BagScreen from './src/screens/checkout/BagScreen';
import CheckoutAddressScreen from './src/screens/checkout/CheckoutAddressScreen';
import CheckoutDeliveryScreen from './src/screens/checkout/CheckoutDeliveryScreen';
import CheckoutReviewScreen from './src/screens/checkout/CheckoutReviewScreen';
import CheckoutProcessingScreen from './src/screens/checkout/CheckoutProcessingScreen';
import OrderConfirmationScreen from './src/screens/checkout/OrderConfirmationScreen';
import CheckoutFailedScreen from './src/screens/checkout/CheckoutFailedScreen';

// Orders & Support Screens
import OrdersListScreen from './src/screens/orders/OrdersListScreen';
import OrderDetailScreen from './src/screens/orders/OrderDetailScreen';
import OrderTrackingScreen from './src/screens/orders/OrderTrackingScreen';
import ReturnRequestScreen from './src/screens/orders/ReturnRequestScreen';
import ReturnStatusScreen from './src/screens/orders/ReturnStatusScreen';
import CancelOrderScreen from './src/screens/orders/CancelOrderScreen';
import RefundStatusScreen from './src/screens/orders/RefundStatusScreen';
import CreateSupportTicketScreen from './src/screens/orders/CreateSupportTicketScreen';
import SupportTicketScreen from './src/screens/orders/SupportTicketScreen';
import CreateDisputeScreen from './src/screens/orders/CreateDisputeScreen';

function AppContent() {
  const { currentRoute, navigate } = useNavigation();
  const { cart, activeOrdersCount, unreadNotifsCount, toastMessage, showToast, isOffline } = useApp();

  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (['home'].includes(currentRoute.name)) setActiveTab('home');
    else if (['search', 'category'].includes(currentRoute.name)) setActiveTab('search');
    else if (['bag', 'checkout-address', 'checkout-delivery', 'checkout-review'].includes(currentRoute.name)) setActiveTab('cart');
    else if (['orders-list', 'orders', 'order-detail', 'order-tracking', 'return-request', 'order-return', 'return-status', 'order-cancel', 'refund-status', 'create-ticket', 'support-ticket', 'create-dispute'].includes(currentRoute.name)) setActiveTab('orders');
    else if (['account', 'account-addresses', 'account-notifications', 'account-privacy', 'account-saved', 'saved'].includes(currentRoute.name)) setActiveTab('account');
  }, [currentRoute.name]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case 'home':
        navigate('home');
        break;
      case 'search':
        navigate('search');
        break;
      case 'cart':
        navigate('bag');
        break;
      case 'orders':
        navigate('orders-list');
        break;
      case 'account':
        navigate('account');
        break;
      default:
        navigate('home');
    }
  };

  const renderScreen = () => {
    switch (currentRoute.name) {
      case 'onboarding':
        return <OnboardingScreen />;

      // Auth Routes
      case 'auth-signin':
        return <SignInScreen />;
      case 'auth-signup':
        return <SignUpScreen />;
      case 'auth-verify':
        return <VerifyOTPScreen />;
      case 'auth-recover':
        return <PasswordRecoveryScreen />;

      // Discovery Routes
      case 'home':
        return <HomeScreen />;
      case 'search':
        return <SearchScreen />;
      case 'category':
        return <CategoryScreen />;
      case 'product-detail':
        return <ProductDetailScreen />;
      case 'merchant-store':
        return <MerchantStoreScreen />;

      // Checkout Routes
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

      // Orders & Support Routes
      case 'orders':
      case 'orders-list':
        return <OrdersListScreen />;
      case 'order-detail':
        return <OrderDetailScreen />;
      case 'order-tracking':
        return <OrderTrackingScreen />;
      case 'order-return':
      case 'return-request':
        return <ReturnRequestScreen />;
      case 'return-status':
        return <ReturnStatusScreen />;
      case 'order-cancel':
        return <CancelOrderScreen />;
      case 'refund-status':
        return <RefundStatusScreen />;
      case 'create-ticket':
        return <CreateSupportTicketScreen />;
      case 'support-ticket':
        return <SupportTicketScreen />;
      case 'create-dispute':
        return <CreateDisputeScreen />;

      // Account Routes
      case 'account':
        return <AccountScreen />;
      case 'account-addresses':
        return <AddressBookScreen />;
      case 'account-notifications':
        return <NotificationsScreen />;
      case 'account-privacy':
        return <PrivacyScreen />;
      case 'saved':
      case 'account-saved':
        return <SavedScreen />;

      default:
        return <HomeScreen />;
    }
  };

  const isStandalone = ['onboarding', 'auth-signin', 'auth-signup', 'auth-verify', 'auth-recover'].includes(currentRoute.name);

  // For true full-bleed edge-to-edge screens (Onboarding and Auth)
  if (isStandalone) {
    return (
      <View style={styles.fullScreenEdgeToEdge}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ErrorBoundary key={currentRoute.name} routeKey={currentRoute.name} onReset={() => navigate('home')}>
          {renderScreen()}
        </ErrorBoundary>
        <AnimatedToast message={toastMessage} onDismiss={() => showToast && showToast(null)} />
      </View>
    );
  }

  const showTopHeader = ['home'].includes(currentRoute.name);
  const showBottomNav = [
    'home',
    'search',
    'orders-list',
    'orders',
    'account',
    'account-saved',
    'saved',
  ].includes(currentRoute.name);

  const mainContent = (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      {/* Offline Banner */}
      <OfflineBanner isOffline={isOffline} />

      {/* Main Top Header */}
      {showTopHeader && (
        <Header
          notificationCount={unreadNotifsCount}
          onNotificationPress={() => navigate('account-notifications')}
        />
      )}

      {/* Active Screen View wrapped in isolated ErrorBoundary */}
      <View style={styles.screenWrapper}>
        <ErrorBoundary key={currentRoute.name} routeKey={currentRoute.name} onReset={() => navigate('home')}>
          {renderScreen()}
        </ErrorBoundary>
      </View>

      {/* Animated Spring Toast Feedback */}
      <AnimatedToast message={toastMessage} onDismiss={() => showToast && showToast(null)} />

      {/* Global Modals */}
      <SearchFiltersModal />
      <MerchantConflictModal />
      <PaystackPaymentScreen />
      <ProductReviewsModal />
      <VoucherSelectorModal />
      <ImageGalleryModal />
      <InvoiceViewerModal />
      <ProductQuickLookModal />

      {/* Fixed Bottom Navigation */}
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

  return (
    <ImageBackground
      source={require('./assets/app-bg.jpg')}
      style={styles.fullAppBackground}
      resizeMode="cover"
    >
      {mainContent}
    </ImageBackground>
  );
}

export default function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    async function preloadAssets() {
      try {
        await Asset.loadAsync([
          require('./assets/sellfastbuyfast-logo.png'),
          require('./assets/onboarding-slide1.png'),
          require('./assets/onboarding-slide2.png'),
          require('./assets/onboarding-slide3.jpg'),
          require('./assets/app-bg.jpg'),
          require('./assets/auth-bg.jpg'),
          require('./assets/product-smartwatch-arch.jpg'),
          require('./assets/product-sneakers-arch.jpg'),
          require('./assets/product-perfume-arch.jpg'),
          require('./assets/product-handbag-arch.jpg'),
        ]);
      } catch (e) {
        console.warn('Asset preloading:', e);
      } finally {
        setAssetsLoaded(true);
      }
    }
    preloadAssets();
  }, []);

  if (!fontsLoaded || !assetsLoaded) {
    return null;
  }

  return (
    <AppProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  fullScreenEdgeToEdge: {
    flex: 1,
    backgroundColor: '#072019',
    width: '100%',
    height: '100%',
  },
  fullAppBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F2EB',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenWrapper: {
    flex: 1,
  },
});
