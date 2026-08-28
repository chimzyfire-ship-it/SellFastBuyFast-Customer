import React, { createContext, useContext, useState } from 'react';
import { useApp } from '../context/AppContext';

const NavigationContext = createContext();

// Protected Routes requiring Auth Guard
const PROTECTED_ROUTES = [
  'account',
  'account-addresses',
  'account-notifications',
  'account-privacy',
  'saved',
  'checkout-address',
  'checkout-delivery',
  'checkout-review',
  'checkout-paystack',
  'checkout-processing',
  'checkout-confirmation',
  'checkout-failed',
  'orders',
  'order-detail',
  'order-tracking',
  'order-cancel',
  'order-return',
  'return-status',
  'create-ticket',
  'support-ticket',
  'refund-status',
];

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
    if (PROTECTED_ROUTES.includes(routeName) && !isAuthenticated) {
      setIntendedRoute({ name: routeName, params });
      showToast('Please sign in to continue');
      setRouteHistory((prev) => [...prev, { name: 'auth-signin', params: { returnTo: routeName } }]);
      setCurrentRoute({ name: 'auth-signin', params: { returnTo: routeName } });
      return;
    }

    // Tab synchronization
    if (routeName === 'home') setActiveTab('home');
    else if (routeName === 'search') setActiveTab('search');
    else if (routeName === 'bag') setActiveTab('cart');
    else if (routeName === 'orders') setActiveTab('orders');
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

      if (['home', 'search', 'bag', 'orders', 'account'].includes(previous.name)) {
        setActiveTab(previous.name === 'bag' ? 'cart' : previous.name);
      }
    } else {
      setCurrentRoute({ name: 'home', params: {} });
      setActiveTab('home');
    }
  };

  const reset = (routeName, params = {}) => {
    setRouteHistory([{ name: routeName, params }]);
    setCurrentRoute({ name: routeName, params });
    if (['home', 'search', 'bag', 'orders', 'account'].includes(routeName)) {
      setActiveTab(routeName === 'bag' ? 'cart' : routeName);
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
    else if (tabId === 'search') navigate('search');
    else if (tabId === 'cart') navigate('bag');
    else if (tabId === 'orders') navigate('orders');
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
