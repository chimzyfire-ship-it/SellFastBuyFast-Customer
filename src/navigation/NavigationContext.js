import React, { createContext, useContext, useState } from 'react';
import { useApp } from '../context/AppContext';

const NavigationContext = createContext();

// Protected Routes requiring Auth Guard
const PROTECTED_ROUTES = [
  'checkout-address',
  'checkout-delivery',
  'checkout-review',
  'checkout-paystack',
  'checkout-processing',
  'checkout-confirmation',
  'checkout-failed',
  'order-cancel',
  'order-return',
  'return-status',
  'create-dispute',
  'refund-status',
];

// Expo previews intentionally keep their demo checkout and concierge paths
// together, while live Paystack keeps the authenticated routes protected.
const DEMO_GUEST_ROUTES = new Set([
  'checkout-address',
  'checkout-delivery',
  'checkout-review',
  'checkout-paystack',
  'checkout-processing',
  'checkout-confirmation',
  'checkout-failed',
  'create-ticket',
  'support-ticket',
]);
const isCheckoutDemo = process.env.EXPO_PUBLIC_PAYMENT_MODE !== 'paystack';

export const NavigationProvider = ({ children }) => {
  const { isAuthenticated, setIntendedRoute, showToast } = useApp();

  // App launch default set to 'onboarding' for high-impact slider intro experience
  const [currentRoute, setCurrentRoute] = useState({ name: 'onboarding', params: {} });
  const [routeHistory, setRouteHistory] = useState([{ name: 'onboarding', params: {} }]);

  // Active overlay modal state
  const [activeModal, setActiveModal] = useState(null);

  // Bottom Navigation tab identifier synchronization
  const [activeTab, setActiveTab] = useState('home');

  const navigate = (routeName, params = {}) => {
    // Check auth guard for protected routes
    const allowsGuestDemoRoute = isCheckoutDemo && DEMO_GUEST_ROUTES.has(routeName);
    if (PROTECTED_ROUTES.includes(routeName) && !isAuthenticated && !allowsGuestDemoRoute) {
      setIntendedRoute({ name: routeName, params });
      showToast('Please sign in to continue');
      setRouteHistory((prev) => [...prev, { name: 'auth-signin', params: { returnTo: routeName } }]);
      setCurrentRoute({ name: 'auth-signin', params: { returnTo: routeName } });
      return;
    }

    // Tab synchronization
    if (routeName === 'home') setActiveTab('home');
    else if (routeName === 'category' || routeName === 'categories') setActiveTab('categories');
    else if (routeName === 'bag' || routeName === 'cart') setActiveTab('cart');
    else if (routeName === 'saved' || routeName === 'wishlist' || routeName === 'account-saved') setActiveTab('wishlist');
    else if (routeName === 'account') setActiveTab('account');

    setRouteHistory((prev) => [...prev, { name: routeName, params }]);
    setCurrentRoute({ name: routeName, params });
  };

  const goBack = () => {
    if (routeHistory.length > 1) {
      const newHistory = [...routeHistory];
      newHistory.pop();
      const previous = newHistory[newHistory.length - 1];
      setRouteHistory(newHistory);
      setCurrentRoute(previous);

      if (['home', 'category', 'categories', 'bag', 'saved', 'wishlist', 'account-saved', 'account'].includes(previous.name)) {
        if (previous.name === 'category' || previous.name === 'categories') setActiveTab('categories');
        else if (previous.name === 'bag') setActiveTab('cart');
        else if (previous.name === 'saved' || previous.name === 'wishlist' || previous.name === 'account-saved') setActiveTab('wishlist');
        else if (previous.name === 'account') setActiveTab('account');
        else setActiveTab(previous.name);
      }
    } else {
      setCurrentRoute({ name: 'home', params: {} });
      setActiveTab('home');
    }
  };

  const reset = (routeName, params = {}) => {
    setRouteHistory([{ name: routeName, params }]);
    setCurrentRoute({ name: routeName, params });
    if (['home', 'category', 'categories', 'bag', 'saved', 'wishlist', 'account'].includes(routeName)) {
      if (routeName === 'category' || routeName === 'categories') setActiveTab('categories');
      else if (routeName === 'bag') setActiveTab('cart');
      else if (routeName === 'saved' || routeName === 'wishlist') setActiveTab('wishlist');
      else setActiveTab(routeName);
    }
  };

  const openModal = (modalName, params = {}) => {
    setActiveModal({ name: modalName, params });
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'home') navigate('home');
    else if (tabId === 'categories') navigate('category');
    else if (tabId === 'cart') navigate('bag');
    else if (tabId === 'wishlist') navigate('saved');
    else if (tabId === 'account') navigate('account');
  };

  return (
    <NavigationContext.Provider
      value={{
        currentRoute,
        routeHistory,
        activeModal,
        activeTab,
        navigate,
        goBack,
        reset,
        openModal,
        closeModal,
        selectTab,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
