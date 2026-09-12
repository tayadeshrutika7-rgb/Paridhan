import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { APP_CONFIG } from '@paridhan/config';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>{APP_CONFIG.name}</Text>
          <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.badge}>HYPER-LOCAL FASHION</Text>
          <Text style={styles.heroTitle}>Discover Nearby Clothing Stores</Text>
          <Text style={styles.heroSub}>
            Shop directly from authentic local shopkeepers, negotiate prices, and receive same-day delivery.
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Explore Shops Near Me</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why PARIDHAN?</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>📍</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Real Local Shops</Text>
              <Text style={styles.featureSub}>Connect with genuine physical stores in your town.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>💬</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Interactive Bargaining</Text>
              <Text style={styles.featureSub}>Make structured price offers to local sellers.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureEmoji}>✨</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>AI Fashion Assistant</Text>
              <Text style={styles.featureSub}>Ask in natural language to find the perfect outfit.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  container: {
    padding: 20,
  },
  header: {
    marginTop: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 28,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1c1917',
    marginBottom: 8,
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 14,
    color: '#57534e',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1c1917',
  },
  featureSub: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
});
