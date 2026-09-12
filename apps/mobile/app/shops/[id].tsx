import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Database } from '@paridhan/types';

type Shop = Database['public']['Tables']['shops']['Row'] & {
  products?: Database['public']['Tables']['products']['Row'][];
};

export default function MobileShopScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchShopDetails();
    }
  }, [id]);

  const fetchShopDetails = async () => {
    setIsLoading(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

    const query = supabase.from('shops').select('*, products(*)');
    const { data } = isUuid
      ? await query.eq('id', id).maybeSingle()
      : await query.eq('slug', id).maybeSingle();

    if (data) setShop(data as any);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Shop not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}>
        {shop.banner_url ? (
          <Image source={{ uri: shop.banner_url }} style={styles.bannerImg} />
        ) : (
          <View style={styles.placeholderBanner}>
            <Text style={styles.placeholderText}>{shop.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{shop.name}</Text>
          {shop.is_bargaining_enabled && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🤝 Bargaining Enabled</Text>
            </View>
          )}
          <Text style={styles.location}>
            📍 {shop.address_line1}, {shop.city} • 📞 {shop.phone}
          </Text>
          <Text style={styles.description}>{shop.description || 'Local verified clothing shop.'}</Text>
        </View>

        <Text style={styles.sectionTitle}>In-Store Products ({shop.products?.length || 0})</Text>

        <View style={styles.productGrid}>
          {shop.products?.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.productCard}
              onPress={() => router.push(`/products/${item.slug || item.id}` as any)}
            >
              <View style={styles.productImgPlaceholder}>
                <Text style={styles.productInitial}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.productPrice}>₹{item.base_price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '700',
  },
  banner: {
    height: 160,
    backgroundColor: '#1c1917',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  placeholderBanner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#431407',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff30',
  },
  content: {
    padding: 16,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    marginBottom: 20,
  },
  shopName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1c1917',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  location: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    color: '#44403c',
    marginTop: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1c1917',
    marginBottom: 12,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
  },
  productImgPlaceholder: {
    height: 120,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#a8a29e',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1917',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ea580c',
    marginTop: 2,
  },
});
