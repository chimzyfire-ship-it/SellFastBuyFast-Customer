import React, { createContext, useContext, useState } from 'react';
import { PRODUCTS } from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Authentication State
  const [user, setUser] = useState({
    id: 'usr_101',
    name: 'Amina Bello',
    email: 'amina.bello@example.ng',
    phone: '+234 803 123 4567',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    memberSince: 'August 2024',
    verified: true,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // Intent preservation for Auth redirect
  const [intendedRoute, setIntendedRoute] = useState(null);

  // Cart / Bag state (v1 rule: single merchant per bag)
  const [cart, setCart] = useState([
    { product: PRODUCTS[0], quantity: 1, color: PRODUCTS[0].colors[0], size: PRODUCTS[0].sizes[0] },
  ]);

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
  const [orders, setOrders] = useState([
    {
      id: 'ORD-2026-8891',
      date: '2026-08-08T14:30:00Z',
      merchantName: 'SellFast Tech',
      merchantId: 'm1',
      status: 'Shipped', // 'Placed' | 'Accepted' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned'
      totalAmount: 154500,
      deliveryMethod: 'Standard Door Delivery',
      deliveryFee: 4500,
      trackingNumber: 'SL-NG-99824',
      carrierName: 'GIG Logistics',
      estimatedDelivery: '12 Aug 2026',
      items: [
        { product: PRODUCTS[0], quantity: 1, price: 150000, color: '#1C1C1E', size: '41mm' },
      ],
      shippingAddress: {
        recipient: 'Amina Bello',
        street: '14b Admiralty Way, Victoria Island',
        city: 'Lagos',
      },
      paymentReference: 'PSTK-889123-NG',
    },
    {
      id: 'ORD-2026-7740',
      date: '2026-07-29T10:15:00Z',
      merchantName: 'SellFast Artisans',
      merchantId: 'm4',
      status: 'Delivered',
      totalAmount: 89500,
      deliveryMethod: 'Express Delivery',
      deliveryFee: 4500,
      trackingNumber: 'SL-NG-77401',
      carrierName: 'DHL Express Nigeria',
      estimatedDelivery: '30 Jul 2026',
      items: [
        { product: PRODUCTS[3], quantity: 1, price: 85000, color: '#0F382C', size: 'One Size' },
      ],
      shippingAddress: {
        recipient: 'Amina Bello',
        street: '14b Admiralty Way, Victoria Island',
        city: 'Lagos',
      },
      paymentReference: 'PSTK-774011-NG',
    },
  ]);

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

  // Auth Methods
  const signIn = (emailOrPhone, password) => {
    setIsAuthenticated(true);
    setUser({
      id: 'usr_101',
      name: 'Amina Bello',
      email: emailOrPhone,
      phone: '+234 803 123 4567',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      memberSince: 'August 2024',
      verified: true,
    });
    showToast('Signed in successfully');
  };

  const signUp = (name, email, phone) => {
    setIsAuthenticated(true);
    setUser({
      id: 'usr_' + Date.now(),
      name,
      email,
      phone,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      memberSince: 'August 2026',
      verified: true,
    });
    showToast('Account created successfully');
  };

  const signOut = () => {
    setIsAuthenticated(false);
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

  // Order Placement
  const createOrder = (paymentRef) => {
    const selectedAddressObj = addresses.find((a) => a.id === selectedAddressId) || addresses[0];
    const merchantName = cart[0]?.product.merchant || 'SellFast Direct';
    const merchantId = cart[0]?.product.merchantId || 'm1';
    const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const deliveryFee = selectedDeliveryMethod === 'express' ? 7500 : 4500;

    const newOrder = {
      id: 'ORD-2026-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString(),
      merchantName,
      merchantId,
      status: 'Placed',
      totalAmount: subtotal + deliveryFee,
      deliveryMethod: selectedDeliveryMethod === 'express' ? 'Express Priority Delivery' : 'Standard Door Delivery',
      deliveryFee,
      trackingNumber: 'SL-NG-' + Math.floor(10000 + Math.random() * 90000),
      carrierName: selectedDeliveryMethod === 'express' ? 'DHL Express Nigeria' : 'GIG Logistics',
      estimatedDelivery: selectedDeliveryMethod === 'express' ? 'Tomorrow' : '3 Days',
      items: [...cart],
      shippingAddress: selectedAddressObj,
      paymentReference: paymentRef || 'PSTK-' + Date.now(),
    };

    setOrders([newOrder, ...orders]);
    clearCart();
    return newOrder;
  };

  const cancelOrder = (orderId, reason) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, status: 'Cancelled', cancelReason: reason } : o
      )
    );
    showToast(`Order ${orderId} cancelled`);
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
        signIn,
        signUp,
        signOut,
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
        createOrder,
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
