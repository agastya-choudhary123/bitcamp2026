import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import WaveformChart from '@/components/WaveformChart';
import { colors } from '@/constants/colors';

// Camera is only available on native
let CameraView: any = null;
let useCameraPermissions: any = () => [null, () => Promise.resolve()];
if (Platform.OS !== 'web') {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;

export default function DashboardScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [earScore, setEarScore] = useState(0.35);
  const [history, setHistory] = useState<number[]>(new Array(40).fill(0.35));
  const [showDrowsinessAlert, setShowDrowsinessAlert] = useState(false);
  const [drowsinessAcknowledged, setDrowsinessAcknowledged] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Simulate EAR fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setEarScore(prev => {
        const next = Math.max(0.15, Math.min(0.45, prev + (Math.random() - 0.5) * 0.08));
        setHistory(h => [...h.slice(1), next]);
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Drowsiness alert logic
  useEffect(() => {
    if (earScore < 0.25 && !drowsinessAcknowledged) {
      setShowDrowsinessAlert(true);
    }
    if (earScore >= 0.25) {
      setDrowsinessAcknowledged(false);
    }
  }, [earScore, drowsinessAcknowledged]);

  const getStatusColor = () => {
    if (earScore < 0.25) return colors.accentRed;
    if (earScore < 0.3) return colors.accentYellow;
    return colors.accentGreen;
  };

  const getStatusLabel = () => {
    if (earScore < 0.25) return 'DANGER';
    if (earScore < 0.3) return 'WARNING';
    return 'ALERT';
  };

  // Request camera on mount
  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Driver Dashboard</Text>
            <Text style={styles.subtitle}>REAL-TIME EYE MONITORING SYSTEM</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/replays')}
            >
              <Ionicons name="play-circle-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/guide')}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/emergency-contacts')}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
            >
              <Ionicons name="person-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile menu */}
        {showProfileMenu && (
          <GlassCard style={styles.profileMenu}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.accentRed} />
              <Text style={styles.logoutText}>LOG OUT</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Camera Feed */}
        <GlassCard style={styles.cameraCard}>
          <View style={styles.sectionLabel}>
            <Ionicons name="camera-outline" size={14} color={colors.primary} />
            <Text style={styles.sectionLabelText}>LIVE VISUAL MONITORING</Text>
          </View>
          <View style={styles.cameraContainer}>
            {permission?.granted ? (
              <CameraView
                style={styles.camera}
                facing="front"
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera-off-outline" size={40} color={colors.mutedForeground} />
                <Text style={styles.cameraPlaceholderText}>Camera permission required</Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Grant Access</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GlassCard>

        {/* EAR Score Gauge */}
        <GlassCard style={styles.gaugeCard}>
          <View style={styles.sectionLabel}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
            <Text style={styles.sectionLabelText}>CURRENT EAR LEVEL</Text>
          </View>
          <View style={styles.gaugeRow}>
            <View>
              <Text style={[styles.earScore, { color: getStatusColor() }]}>
                {earScore.toFixed(3)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}22` }]}>
                <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
                  {getStatusLabel()}
                </Text>
              </View>
            </View>
            <View style={styles.metricsCol}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>PERCLOS (1 min)</Text>
                <Text style={[styles.metricValue, { color: colors.primary }]}>0.05</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Head Pose</Text>
                <Text style={[styles.metricValue, { color: colors.accentGreen }]}>Stable</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>System</Text>
                <View style={[styles.activeBadge]}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Waveform */}
        <GlassCard style={styles.waveCard}>
          <View style={styles.sectionLabel}>
            <Ionicons name="pulse-outline" size={14} color={colors.primary} />
            <Text style={styles.sectionLabelText}>EAR WAVEFORM HISTORY</Text>
          </View>
          <WaveformChart dataPoints={history} width={CHART_WIDTH} height={120} />
        </GlassCard>
      </ScrollView>

      {/* Drowsiness Alert Modal */}
      <Modal visible={showDrowsinessAlert} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Ionicons name="warning" size={40} color={colors.accentRed} />
            </View>
            <Text style={styles.alertTitle}>Drowsiness Detected!</Text>
            <Text style={styles.alertBody}>
              Your eye closure ratio has dropped to dangerous levels. Please pull over safely if you feel fatigued.
            </Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => {
                setShowDrowsinessAlert(false);
                setDrowsinessAcknowledged(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.alertBtnText}>I'm Awake — Dismiss</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 10, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    padding: 10, borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  profileMenu: {
    padding: 8, marginBottom: 4,
    alignSelf: 'flex-end', minWidth: 140,
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  logoutText: { color: colors.accentRed, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  cameraCard: { padding: 16 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 1.5 },
  cameraContainer: { borderRadius: 16, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: '#08060f' },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  cameraPlaceholderText: { color: colors.mutedForeground, fontSize: 14 },
  permissionBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  permissionBtnText: { color: '#fff', fontWeight: '700' },
  gaugeCard: { padding: 20 },
  gaugeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earScore: { fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start' },
  statusBadgeText: { fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  metricsCol: { gap: 10, flex: 1, marginLeft: 24 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.cardBorder, paddingBottom: 8 },
  metricLabel: { color: colors.mutedForeground, fontSize: 12 },
  metricValue: { fontWeight: '700', fontSize: 13, fontFamily: 'monospace' },
  activeBadge: { backgroundColor: `${colors.accentGreen}22`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  activeBadgeText: { color: colors.accentGreen, fontWeight: '800', fontSize: 10 },
  waveCard: { padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  alertCard: { padding: 32, alignItems: 'center', borderWidth: 2, borderColor: `${colors.accentRed}55`, width: '100%' },
  alertIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${colors.accentRed}22`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  alertTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, marginBottom: 12, textAlign: 'center' },
  alertBody: { color: colors.mutedForeground, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  alertBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'center' },
  alertBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
