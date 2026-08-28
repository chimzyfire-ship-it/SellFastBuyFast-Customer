import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';

export default function CartModal({
  visible,
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutPress,
}) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const formattedSubtotal = `₦ ${subtotal.toLocaleString()}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Shopping Bag ({cartItems.length})</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="bag-handle-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Your bag is empty</Text>
              <Text style={styles.emptySubtitle}>Explore top picks to start shopping</Text>
              <TouchableOpacity
                style={styles.continueShoppingBtn}
                onPress={onClose}
              >
                <Text style={styles.continueText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                {cartItems.map((item) => (
                  <View key={item.product.id} style={styles.cartItemRow}>
                    <View style={styles.itemImageWrapper}>
                      <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                    </View>

                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemPrice}>{item.product.formattedPrice}</Text>

                      {/* Quantity Controls */}
                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <Text style={styles.qtyText}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => onRemoveItem(item.product.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.badgeRed} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Checkout Summary Footer */}
              <View style={styles.footer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{formattedSubtotal}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Logistics & Delivery</Text>
                  <Text style={styles.freeShipping}>Calculated at checkout</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  activeOpacity={0.85}
                  onPress={onCheckoutPress}
                >
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.emeraldDark} style={{ marginRight: 8 }} />
                  <Text style={styles.checkoutText}>Proceed to Paystack Checkout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justify: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  continueShoppingBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  continueText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  itemsList: {
    paddingHorizontal: 20,
    maxHeight: 280,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.imageBg,
    alignItems: 'center',
    justify: 'center',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    marginBottom: 6,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justify: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  removeBtn: {
    padding: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
  },
  freeShipping: {
    fontSize: 12,
    color: COLORS.goldDark,
    fontWeight: '600',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.goldAccent,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 12,
    ...SHADOWS.goldGlow,
  },
  checkoutText: {
    color: COLORS.emeraldDark,
    fontSize: 15,
    fontWeight: '700',
  },
});
