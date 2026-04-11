import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/constants/colors';

interface ReplaySession {
  id: string;
  title: string;
  date: string;
  duration: string;
  alertsCount: number;
  avgEar: number;
}

const sessions: ReplaySession[] = [
  { id: '1', title: 'Night Drive to Baltimore', date: '2026-04-10', duration: '45:12', alertsCount: 3, avgEar: 0.32 },
  { id: '2', title: 'Morning Commute', date: '2026-04-09', duration: '22:05', alertsCount: 0, avgEar: 0.38 },
  { id: '3', title: 'Long Haul – Interstate 95', date: '2026-04-08', duration: '135:30', alertsCount: 12, avgEar: 0.28 },
  { id: '4', title: 'Evening Trip', date: '2026-04-07', duration: '15:20', alertsCount: 1, avgEar: 0.35 },
];

function getDurationInSeconds(duration: string) {
  const parts = duration.split(':').reverse();
  return parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(60, i), 0);
}

export default function ReplaysScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'length'>('date');
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = sessions
    .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.date.includes(searchTerm))
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      return getDurationInSeconds(b.duration) - getDurationInSeconds(a.duration);
    });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Driving Replays</Text>
            <Text style={styles.subtitle}>REVIEW PAST SESSIONS AND SAFETY LOGS</Text>
          </View>
        </View>

        {/* Search + Sort */}
        <View style={styles.controls}>
          <TextInput
            style={styles.search}
            placeholder="Search replays..."
            placeholderTextColor={colors.mutedForeground}
            value={searchTerm}
            onChangeText={setSearchTerm}
            color={colors.foreground}
          />
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOpen(!sortOpen)}
          >
            <Ionicons name="filter-outline" size={16} color={colors.primary} />
            <Text style={styles.sortBtnText}>{sortBy === 'date' ? 'Newest' : 'Longest'}</Text>
          </TouchableOpacity>
        </View>

        {sortOpen && (
          <GlassCard style={styles.sortMenu}>
            {[
              { label: 'Newest First', value: 'date' as const },
              { label: 'Longest First', value: 'length' as const },
            ].map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={styles.sortOption}
                onPress={() => { setSortBy(value); setSortOpen(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === value && { color: colors.primary }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        )}

        {/* Session Cards */}
        {filtered.length > 0 ? filtered.map((session) => (
          <GlassCard key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionCardInner}>
              <View style={styles.sessionCardTop}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>
                    {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionCardBottom}>
                <View style={styles.durationRow}>
                  <View style={styles.durationIcon}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.durationText}>{session.duration}</Text>
                </View>
                <TouchableOpacity style={styles.playBtn}>
                  <Ionicons name="play" size={12} color="#fff" />
                  <Text style={styles.playBtnText}>PLAY</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        )) : (
          <View style={styles.empty}>
            <Ionicons name="videocam-off-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No sessions found</Text>
            <Text style={styles.emptyDesc}>Try a different search term or start a new drive.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 14, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  backBtn: { padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  title: { fontSize: 24, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 9, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  controls: { flexDirection: 'row', gap: 10 },
  search: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  sortBtnText: { color: colors.foreground, fontSize: 12, fontWeight: '700' },
  sortMenu: { padding: 8 },
  sortOption: { paddingVertical: 10, paddingHorizontal: 14 },
  sortOptionText: { color: colors.mutedForeground, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  sessionCard: { borderTopWidth: 4, borderTopColor: colors.primary, overflow: 'hidden' },
  sessionCardInner: { padding: 20 },
  sessionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sessionTitle: { color: colors.foreground, fontWeight: '700', fontSize: 17, flex: 1, marginRight: 10 },
  dateBadge: { backgroundColor: `${colors.primary}18`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dateBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  sessionCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationIcon: { backgroundColor: `${colors.primary}22`, padding: 6, borderRadius: 8 },
  durationText: { color: colors.mutedForeground, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
  },
  playBtnText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { color: colors.foreground, fontWeight: '700', fontSize: 18 },
  emptyDesc: { color: colors.mutedForeground, textAlign: 'center' },
});
