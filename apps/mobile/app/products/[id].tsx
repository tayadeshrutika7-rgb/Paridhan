import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Database } from '@paridhan/types';

type ProductVariant = Database['public']['Tables']['product_variants']['Row'];

type Product = Database['public']['Tables']['products']['Row'] & {
  product_variants?: ProductVariant[];
  shops?: Database['public']['Tables']['shops']['Row'];
};

export default function MobileProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setIsLoading(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

    const query = supabase.from('products').select('*, product_variants(*), shops(*)');
    const { data } = isUuid
      ? await query.eq('id', id).maybeSingle()
      : await query.eq('slug', id).maybeSingle();

    if (data) {
      const prod = data as any;
      setProduct(prod);
      if (prod.product_variants && prod.product_variants.length > 0) {
        setSelectedColor(prod.product_variants[0].color);
        setSelectedSize(prod.product_variants[0].size);
      }
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Loading item...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  const variants = product.product_variants || [];
  const colors = Array.from(new Set(variants.map((v) => v.color)));
  const sizesForColor = variants
    .filter((v) => v.color === selectedColor)
    .map((v) => v.size);

  const activeVariant = variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );

  const price = activeVariant ? activeVariant.price : product.base_price;
  const stock = activeVariant ? activeVariant.stock_quantity : 0;
  const isAvailable = !!activeVariant && activeVariant.is_active && stock > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.productInitial}>{product.name.charAt(0)}</Text>
          {product.is_bargaining_allowed && (
            <View style={styles.bargainBadge}>
              <Text style={styles.bargainText}>🤝 Bargaining Allowed</Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <Text style={styles.shopName}>🏬 {product.shops?.name || 'Local Shop'}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{price}</Text>
            {isAvailable ? (
              <View style={styles.stockBadge}>
                <Text style={styles.stockText}>✓ {stock} in stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outStock]}>
                <Text style={[styles.stockText, { color: '#dc2626' }]}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* Color Selector */}
          {colors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>COLOR</Text>
              <View style={styles.tagRow}>
                {colors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.tag, selectedColor === c && styles.tagActive]}
                    onPress={() => {
                      setSelectedColor(c);
                      const avSizes = variants.filter((v) => v.color === c).map((v) => v.size);
                      if (!avSizes.includes(selectedSize)) {
                        setSelectedSize(avSizes[0] || '');
                      }
                    }}
                  >
                    <Text style={[styles.tagText, selectedColor === c && styles.tagTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Size Selector */}
          {sizesForColor.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SIZE</Text>
              <View style={styles.tagRow}>
                {sizesForColor.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.tag, selectedSize === s && styles.tagActive]}
                    onPress={() => setSelectedSize(s)}
                  >
                    <Text style={[styles.tagText, selectedSize === s && styles.tagTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.buyBtn, !isAvailable && styles.buyBtnDisabled]}
            disabled={!isAvailable}
          >
            <Text style={styles.buyBtnText}>{isAvailable ? 'Add to Cart' : 'Unavailable'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scrollContent: {
    padding: 16,
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
  imagePlaceholder: {
    height: 240,
    backgroundColor: '#f5f5f4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  productInitial: {
    fontSize: 54,
    fontWeight: '900',
    color: '#a8a29e',
  },
  bargainBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bargainText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  details: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  shopName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1917',
  },
  description: {
    fontSize: 13,
    color: '#57534e',
    marginTop: 6,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f5f5f4',
    marginVertical: 14,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1c1917',
  },
  stockBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  outStock: {
    backgroundColor: '#fee2e2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716c',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#ffffff',
  },
  tagActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  tagText: {
    fontSize: 13,
    color: '#44403c',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  buyBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buyBtnDisabled: {
    backgroundColor: '#d6d3d1',
  },
  buyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
