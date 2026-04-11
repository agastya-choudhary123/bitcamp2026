import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/constants/colors';

export default function GuideScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Safety Reference Guide</Text>
            <Text style={styles.subtitle}>UNDERSTANDING EAR AND PERCLOS METRICS</Text>
          </View>
        </View>

        {/* EAR Section */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={26} color={colors.primary} />
            <Text style={styles.sectionTitle}>Eye Aspect Ratio (EAR)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            EAR is a real-time snapshot of how open your eyes are. It is calculated by taking the distances between the eyelids and dividing by the eye width.
          </Text>

          <View style={styles.cards}>
            {[
              { icon: 'checkmark-circle', color: colors.accentGreen, label: '> 0.30', title: 'Standard / Awake', desc: 'Eyes are fully open and alert. Your baseline state.' },
              { icon: 'warning', color: colors.accentYellow, label: '0.25 – 0.30', title: 'Warning / Droopy', desc: 'Initial signs of fatigue or heavy eyelids detected.' },
              { icon: 'warning', color: colors.accentRed, label: '< 0.25', title: 'Danger / Closed', desc: 'Eyes are effectively closed. High risk of immediate collision.' },
            ].map(({ icon, color, label, title, desc }) => (
              <GlassCard key={title} style={[styles.earCard, { borderTopColor: color }]}>
                <View style={styles.earCardLabel}>
                  <Ionicons name={icon as any} size={18} color={color} />
                  <Text style={[styles.earCardValue, { color }]}>{label}</Text>
                </View>
                <Text style={styles.earCardTitle}>{title}</Text>
                <Text style={styles.earCardDesc}>{desc}</Text>
              </GlassCard>
            ))}
          </View>
        </GlassCard>

        {/* PERCLOS Section */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={26} color={colors.primary} />
            <Text style={styles.sectionTitle}>Percentage of Eye Closure (PERCLOS)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            PERCLOS is the most reliable physiological indicator of fatigue. It measures the percentage of time your eyes are closed over a 1-minute rolling window.
          </Text>

          {/* Table */}
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHead, { flex: 1 }]}>SCORE</Text>
              <Text style={[styles.tableHead, { flex: 1.3 }]}>ALERT LEVEL</Text>
              <Text style={[styles.tableHead, { flex: 1.8 }]}>ACTION</Text>
            </View>
            {/* Rows */}
            {[
              { range: '0.00–0.08', color: colors.accentGreen, level: 'Normal / Alert', action: 'Passive monitoring.' },
              { range: '0.08–0.12', color: colors.accentYellow, level: 'Drowsy', action: 'Visual warning.' },
              { range: '> 0.12', color: colors.accentRed, level: 'Critical Risk', action: 'Emergency SMS sent.' },
            ].map(({ range, color, level, action }, i, arr) => (
              <View key={range} style={[styles.tableRow, i < arr.length - 1 && styles.tableRowBorder]}>
                <Text style={[styles.tableCell, { color, flex: 1, fontFamily: 'monospace' }]}>{range}</Text>
                <Text style={[styles.tableCell, { flex: 1.3, fontWeight: '600', color: i === 2 ? colors.accentRed : colors.foreground }]}>{level}</Text>
                <Text style={[styles.tableCell, { flex: 1.8, color: i === 2 ? colors.accentRed : colors.mutedForeground }]}>{action}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <Text style={styles.footnote}>* Metrics are based on standard NHTSA drowsiness detection research.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  backBtn: {
    padding: 10, borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 9, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, flex: 1 },
  sectionDesc: { color: colors.mutedForeground, fontSize: 13, lineHeight: 20, marginBottom: 20 },
  cards: { gap: 12 },
  earCard: {
    padding: 16, borderTopWidth: 4,
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
  },
  earCardLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  earCardValue: { fontWeight: '700', fontSize: 16 },
  earCardTitle: { color: colors.foreground, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  earCardDesc: { color: colors.mutedForeground, fontSize: 13 },
  table: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  tableHeader: {
    flexDirection: 'row', padding: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  tableHead: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', padding: 14, paddingHorizontal: 14 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  tableCell: { fontSize: 13, color: colors.foreground },
  footnote: { color: colors.mutedForeground, fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingBottom: 8 },
});
