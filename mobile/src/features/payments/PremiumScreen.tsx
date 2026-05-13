// src/features/payments/PremiumScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const PLANS = [
  { tier: 'Basic', price: '$4.99/mo', features: ['See who liked you', 'Unlimited swipes'] },
  { tier: 'Premium', price: '$9.99/mo', features: ['Everything in Basic', 'Rewind swipes', 'Profile Boost', 'Priority visibility'] },
  { tier: 'VIP', price: '$19.99/mo', features: ['Everything in Premium', 'Incognito mode', 'Advanced filters', 'Read receipts'] },
];

export const PremiumScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#00d4ff', '#0099cc']} style={styles.heroBadge}>
          <Icon name="crown" size={40} color="#fff" />
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock the full G88 experience</Text>
        </LinearGradient>

        {PLANS.map((plan) => (
          <View key={plan.tier} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planTier}>{plan.tier}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </View>
            {plan.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon name="check-circle" size={16} color="#00d4ff" style={styles.checkIcon} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Choose {plan.tier}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  heroBadge: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 12 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  planCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planTier: { fontSize: 18, fontWeight: '700', color: '#fff' },
  planPrice: { fontSize: 16, fontWeight: '600', color: '#00d4ff' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkIcon: { marginRight: 8 },
  featureText: { fontSize: 14, color: '#ccc' },
  selectButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  selectButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
