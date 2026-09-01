import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PRODUCTS, CATEGORIES } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { fetchLiveCategories, fetchLiveProducts } from '../services/catalogService';
import { cancelOrder as cancelOrderRequest, listOrders } from '../services/orderService';

const AppContext = createContext();
const MOCKS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true';
const GUEST_USER = {
  id: null,
  name: 'Guest',
  email: '',
  phone: '',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  memberSince: '',
  verified: false,
};

function mapAuthUser(authUser) {
  return {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Member',
    email: authUser.email || '',
    phone: authUser.phone || authUser.user_metadata?.phone || '',
    avatar: authUser.user_metadata?.avatar_url || GUEST_USER.avatar,
    memberSince: new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    verified: Boolean(authUser.email_confirmed_at || authUser.phone_confirmed_at),
  };
}

export const AppProvider = ({ children }) => {
  // Live Catalogue State
  const [liveCategories, setLiveCategories] = useState(MOCKS_ENABLED ? CATEGORIES : []);
  const [liveProducts, setLiveProducts] = useState(MOCKS_ENABLED ? PRODUCTS : []);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);

  // Authentication State
  const [user, setUser] = useState(GUEST_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Intent preservation for Auth redirect
  const [intendedRoute, setIntendedRoute] = useState(null);

  // Cart / Bag state (v1 rule: single merchant per bag)
  const [cart, setCart] = useState([]);

  // Wishlist / Saved items
  const [wishlist, setWishlist] = useState(['p1', 'p4']);

  // Saved Addresses
  const [addresses, setAddresses] = useState([
    {
      id: 'addr_1',
      title: 'Home (Primary)',
      recipient: 'Amina Bello',
      phone: '+234 803 123 4567',
      street: '14b Admiralty Way, Victoria Island',
      city: 'Lagos',
      state: 'Lagos State',
      isDefault: true,
    },
    {
      id: 'addr_2',
      title: 'Work Studio',
      recipient: 'Amina Bello',
      phone: '+234 803 123 4567',
      street: 'Plot 88, Commercial Avenue, Yaba',
      city: 'Lagos',
      state: 'Lagos State',
      isDefault: false,
    },
  ]);
  const [selectedAddressId, setSelectedAddressId] = useState('addr_1');

  // Delivery options
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('standard'); // 'standard' | 'express'

  // Orders State
  const [orders, setOrders] = useState([]);

  // Support Tickets State
  const [tickets, setTickets] = useState([
    {
      id: 'TCK-4402',
      orderId: 'ORD-2026-8891',
      subject: 'Inquire about delivery timeline',
      category: 'Delivery issue',
      status: 'In Progress', // 'Open' | 'In Progress' | 'Resolved'
      createdAt: '2026-08-09T09:00:00Z',
      messages: [
        {
          id: 'm1',
          sender: 'user',
          text: 'Hello, please can I confirm if the GIG Logistics courier will call before delivery?',
          time: '09:00 AM',
        },
        {
          id: 'm2',
          sender: 'agent',
          agentName: 'Chidi (SellFastBuyFast Care)',
          text: 'Hi Amina! Yes, the courier driver will call your registered phone number (+234 803 *** 4567) 30 minutes prior to delivery.',
          time: '09:18 AM',
        },
      ],
    },
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'Package Shipped! 🚚',
      body: 'Your Smart Watch Series 9 order ORD-2026-8891 has been dispatched with GIG Logistics.',
      time: '2 hours ago',
      read: false,
      targetRoute: 'order-detail',
      targetParams: { orderId: 'ORD-2026-8891' },
    },
    {
      id: 'notif_2',
      title: 'Welcome to SellFastBuyFast',
      body: 'Enjoy authentic curated Nigerian craftsmanship & pay securely with Paystack.',
      time: '3 days ago',
      read: true,
      targetRoute: 'home',
      targetParams: {},
    },
  ]);

  // Merchant Conflict Modal Trigger State
  const [pendingConflictProduct, setPendingConflictProduct] = useState(null);
  const [isMerchantConflictOpen, setIsMerchantConflictOpen] = useState(false);

  // Toast System
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Load Catalogue on Mount
  const loadCatalogueData = useCallback(async () => {
    setIsLoadingCatalogue(true);
    try {
      const [cats, prods] = await Promise.all([
        fetchLiveCategories(),
        fetchLiveProducts('all'),
      ]);
      if (cats && cats.length > 0) setLiveCategories(cats);
      if (prods && prods.length > 0) setLiveProducts(prods);
    } catch {
      // Graceful fallback to mock data
    } finally {
      setIsLoadingCatalogue(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    const data = await listOrders();
    setOrders(data);
    return data;
  }, []);

  useEffect(() => {
    loadCatalogueData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapAuthUser(session.user));
        setIsAuthenticated(true);
        void refreshOrders().catch(() => {});
      } else {
        setUser(GUEST_USER);
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    });

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapAuthUser(session.user));
        setIsAuthenticated(true);
        void refreshOrders().catch(() => {});
      } else {
        setUser(GUEST_USER);
        setIsAuthenticated(false);
        setOrders([]);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadCatalogueData, refreshOrders]);

  // Auth Methods (Supabase Powered with Local Fallback)
  const signIn = async (emailOrPhone, password) => {
    setAuthLoading(true);
    try {
      if (!emailOrPhone.includes('@')) throw new Error('Sign in with your email address.');
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrPhone, password });
      if (error) throw error;
      if (!data?.user) throw new Error('Sign in did not return a user session.');
      setUser(mapAuthUser(data.user));
      setIsAuthenticated(true);
      await refreshOrders().catch(() => []);
      showToast('Signed in successfully');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Failed to sign in');
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (name, email, phone, password = 'Password123!') => {
    setAuthLoading(true);
    try {
      if (!email.includes('@')) throw new Error('A valid email address is required.');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone } },
      });
      if (error) throw error;
      if (!data?.user) throw new Error('Account creation did not return a user.');
      setUser(mapAuthUser(data.user));
      setIsAuthenticated(Boolean(data.session));
      showToast(data.session ? 'Account created successfully' : 'Check your email to confirm your account');
      return { success: true, requiresEmailConfirmation: !data.session };
    } catch (err) {
      showToast(err.message || 'Failed to create account');
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(GUEST_USER);
    setIsAuthenticated(false);
    setOrders([]);
    showToast('Signed out of account');
  };

  // Wishlist Methods
  const toggleWishlist = (productId) => {
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter((id) => id !== productId));
      showToast('Removed from Wishlist');
    } else {
      setWishlist([...wishlist, productId]);
      showToast('Added to Wishlist');
    }
  };

  // Cart / Bag Methods with single-merchant enforcement
  const addToCart = (product, color, size, overrideConflict = false) => {
    if (cart.length > 0) {
      const currentMerchant = cart[0].product.merchant;
      if (currentMerchant !== product.merchant && !overrideConflict) {
        // Trigger single-merchant conflict modal
        setPendingConflictProduct({ product, color, size });
        setIsMerchantConflictOpen(true);
        return false;
      }
    }

    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.color === (color || product.colors?.[0]) &&
        item.size === (size || product.sizes?.[0])
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          color: color || product.colors?.[0],
          size: size || product.sizes?.[0],
        },
      ]);
    }
    showToast(`Added "${product.name}" to Bag`);
    return true;
  };

  const replaceCartWithProduct = () => {
    if (pendingConflictProduct) {
      const { product, color, size } = pendingConflictProduct;
      setCart([
        {
          product,
          quantity: 1,
          color: color || product.colors?.[0],
          size: size || product.sizes?.[0],
        },
      ]);
      setPendingConflictProduct(null);
      setIsMerchantConflictOpen(false);
      showToast(`Bag updated with items from "${product.merchant}"`);
    }
  };

  const cancelMerchantConflict = () => {
    setPendingConflictProduct(null);
    setIsMerchantConflictOpen(false);
  };

  const updateCartQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
    showToast('Item removed from Bag');
  };

  const clearCart = () => {
    setCart([]);
  };

  // Addresses Methods
  const addAddress = (newAddr) => {
    const created = {
      id: 'addr_' + Date.now(),
      ...newAddr,
      isDefault: addresses.length === 0 ? true : newAddr.isDefault || false,
    };
    if (created.isDefault) {
      setAddresses(addresses.map((a) => ({ ...a, isDefault: false })).concat(created));
      setSelectedAddressId(created.id);
    } else {
      setAddresses([...addresses, created]);
    }
    showToast('Address saved successfully');
  };

  const setDefaultAddress = (id) => {
    setAddresses(
      addresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    setSelectedAddressId(id);
    showToast('Default delivery address updated');
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      await cancelOrderRequest(orderId, reason);
      await refreshOrders();
      showToast('Order cancelled');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Unable to cancel order');
      return { success: false, error: err.message };
    }
  };

  // Support Ticket creation & message response
  const createSupportTicket = (orderId, subject, category, messageText) => {
    const newTicket = {
      id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
      orderId,
      subject,
      category,
      status: 'Open',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg_1',
          sender: 'user',
          text: messageText,
          time: 'Just now',
        },
      ],
    };
    setTickets([newTicket, ...tickets]);
    showToast('Support ticket created');
    return newTicket;
  };

  const addMessageToTicket = (ticketId, text) => {
    setTickets(
      tickets.map((t) => {
        if (t.id === ticketId) {
          const newMsg = {
            id: 'msg_' + Date.now(),
            sender: 'user',
            text,
            time: 'Just now',
          };
          setTimeout(() => {
            setTickets((prevTickets) =>
              prevTickets.map((tInner) => {
                if (tInner.id === ticketId) {
                  return {
                    ...tInner,
                    messages: [
                      ...tInner.messages,
                      {
                        id: 'msg_agent_' + Date.now(),
                        sender: 'agent',
                        agentName: 'Ayo (SellFastBuyFast Support)',
                        text: 'Thank you for reaching out! We have received your update and are reviewing your order status with our partner merchant.',
                        time: 'Just now',
                      },
                    ],
                  };
                }
                return tInner;
              })
            );
          }, 1500);

          return { ...t, messages: [...t.messages, newMsg] };
        }
        return t;
      })
    );
  };

  const markNotificationRead = (notifId) => {
    setNotifications(
      notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        authLoading,
        signIn,
        signUp,
        signOut,
        liveCategories,
        liveProducts,
        isLoadingCatalogue,
        loadCatalogueData,
        intendedRoute,
        setIntendedRoute,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        pendingConflictProduct,
        isMerchantConflictOpen,
        replaceCartWithProduct,
        cancelMerchantConflict,
        wishlist,
        toggleWishlist,
        addresses,
        selectedAddressId,
        setSelectedAddressId,
        addAddress,
        setDefaultAddress,
        selectedDeliveryMethod,
        setSelectedDeliveryMethod,
        orders,
        refreshOrders,
        cancelOrder,
        tickets,
        createSupportTicket,
        addMessageToTicket,
        notifications,
        markNotificationRead,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
