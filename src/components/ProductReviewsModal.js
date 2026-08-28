import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { useNavigation } from '../navigation/NavigationContext';

export default function ProductReviewsModal() {
  const { showToast } = useApp();
  const { activeModal, closeModal } = useNavigation();
  const visible = activeModal?.name === 'product-reviews';
  const product = activeModal?.params?.product;

  const [reviews, setReviews] = useState([
    {
      id: 'rev_1',
      name: 'Chioma N.',
      rating: 5,
      date: '2 days ago',
      text: 'Exceeded my expectations! The leather quality and stitching are magnificent. Received in 24 hours in Victoria Island.',
      verified: true,
    },
    {
      id: 'rev_2',
      name: 'Emeka K.',
      rating: 5,
      date: '1 week ago',
      text: '100% authentic product. Packaging was pristine and GIG courier called 30 mins before arrival.',
      verified: true,
    },
    {
      id: 'rev_3',
      name: 'Zainab A.',
      rating: 4,
      date: '2 weeks ago',
      text: 'Very satisfied. Color matches the photos exactly. Will buy again from this merchant.',
      verified: true,
    },
  ]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');
  const [newName, setNewName] = useState('');

  if (!visible || !product) return null;

  const handleAddReview = () => {
    if (!newText.trim()) return;
    const created = {
      id: 'rev_' + Date.now(),
      name: newName.trim() || 'Verified Buyer',
      rating: newRating,
      date: 'Just now',
      text: newText.trim(),
      verified: true,
    };
    setReviews([created, ...reviews]);
    setIsFormOpen(false);
    setNewText('');
    setNewName('');
    showToast('Thank you! Review published');
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.emeraldPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Reviews ({reviews.length})
          </Text>
          <TouchableOpacity onPress={() => setIsFormOpen(!isFormOpen)}>
            <Text style={styles.writeText}>{isFormOpen ? 'Cancel' : 'Write Review'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Rating Summary Card */}
          <View style={styles.ratingSummaryCard}>
            <View style={styles.scoreCol}>
              <Text style={styles.scoreBig}>{product.rating || '4.9'}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={14} color={COLORS.goldAccent} />
                ))}
              </View>
              <Text style={styles.scoreSub}>Based on {reviews.length} reviews</Text>
            </View>

            <View style={styles.barsCol}>
              {[
                { star: 5, pct: '85%' },
                { star: 4, pct: '12%' },
                { star: 3, pct: '3%' },
                { star: 2, pct: '0%' },
                { star: 1, pct: '0%' },
              ].map((b) => (
                <View key={b.star} style={styles.barRow}>
                  <Text style={styles.starNum}>{b.star}★</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: b.pct }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Write Review Form */}
          {isFormOpen && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Write a Verified Review</Text>

              <Text style={styles.label}>Your Rating</Text>
              <View style={styles.starSelectRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                    <Ionicons
                      name={star <= newRating ? 'star' : 'star-outline'}
                      size={28}
                      color={COLORS.goldAccent}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Amina B."
                placeholderTextColor={COLORS.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.label}>Review Feedback</Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Tell us about the quality, packaging, and merchant delivery..."
                placeholderTextColor={COLORS.textMuted}
                value={newText}
                onChangeText={setNewText}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddReview}>
                <Text style={styles.submitText}>Publish Verified Review</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews List */}
          <Text style={styles.listTitle}>Verified Customer Feedback</Text>
          {reviews.map((item) => (
            <View key={item.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View>
                  <View style={styles.nameRow}>
                    <Text style={styles.reviewerName}>{item.name}</Text>
                    {item.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.goldAccent} />
                        <Text style={styles.verifiedText}>Verified Buyer</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.reviewDate}>{item.date}</Text>
                </View>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= item.rating ? 'star' : 'star-outline'}
                      size={13}
                      color={COLORS.goldAccent}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.reviewBody}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  writeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  ratingSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  scoreCol: {
    alignItems: 'center',
  },
  scoreBig: {
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '800',
    color: COLORS.emeraldPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  scoreSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  barsCol: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starNum: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    width: 20,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.goldAccent,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  starSelectRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    height: 44,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
  },
  textArea: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.emeraldPrimary,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justify: 'center',
    marginTop: 6,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.emeraldPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198,155,86,0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  reviewBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});
