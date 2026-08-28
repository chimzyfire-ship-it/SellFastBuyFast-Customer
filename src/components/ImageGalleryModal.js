import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useNavigation } from '../navigation/NavigationContext';

const { width, height } = Dimensions.get('window');

export default function ImageGalleryModal() {
  const { activeModal, closeModal } = useNavigation();
  const visible = activeModal?.name === 'image-gallery';
  const imageUrl = activeModal?.params?.imageUrl;
  const title = activeModal?.params?.title;

  if (!visible || !imageUrl) return null;

  const imageSource =
    typeof imageUrl === 'number' || (typeof imageUrl === 'object' && !imageUrl?.uri)
      ? imageUrl
      : typeof imageUrl === 'string'
      ? { uri: imageUrl }
      : imageUrl;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'High-Resolution View'}
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Fullscreen Image Container */}
        <View style={styles.imageWrapper}>
          <Image source={imageSource} style={styles.image} resizeMode="contain" />
        </View>

        {/* Caption bar */}
        <View style={styles.captionBar}>
          <Ionicons name="sparkles" size={14} color={COLORS.goldAccent} />
          <Text style={styles.captionText}>Pinch or double tap to inspect detail craftsmanship</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justify: 'center',
  },
  image: {
    width: width,
    height: height * 0.75,
  },
  captionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(20,20,20,0.8)',
  },
  captionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
});
