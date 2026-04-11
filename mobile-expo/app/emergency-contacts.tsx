import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/constants/colors';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    console.log('Saving emergency contact:', { name, phone, relationship });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Emergency Contact</Text>
            <Text style={styles.subtitle}>PERSON TO NOTIFY WHEN DROWSINESS IS CRITICAL</Text>
          </View>
        </View>

        {/* Info Card */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            When the system detects critical drowsiness (PERCLOS {'>'} 0.12), an emergency SMS will be sent to your designated contact with your name and live GPS location so they can check on you immediately.
          </Text>
        </GlassCard>

        {/* Form */}
        <GlassCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text style={styles.formTitle}>CONTACT DETAILS</Text>
          </View>

          {[
            { label: 'Full Name', value: name, set: setName, placeholder: 'Jane Doe', keyboard: 'default' as const },
            { label: 'Phone Number', value: phone, set: setPhone, placeholder: '+1 (555) 123-4567', keyboard: 'phone-pad' as const },
            { label: 'Relationship', value: relationship, set: setRelationship, placeholder: 'Spouse, Parent, Friend...', keyboard: 'default' as const },
          ].map(({ label, value, set, placeholder, keyboard }) => (
            <View key={label} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={value}
                onChangeText={set}
                keyboardType={keyboard}
                color={colors.foreground}
              />
            </View>
          ))}
        </GlassCard>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save Contact</Text>
        </TouchableOpacity>

        {saved && (
          <View style={styles.savedMsg}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
            <Text style={styles.savedMsgText}>Emergency contact saved successfully!</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  backBtn: { padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 9, color: colors.mutedForeground, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  infoCard: { padding: 20 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoTitle: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  infoText: { color: colors.mutedForeground, lineHeight: 21, fontSize: 13 },
  formCard: { padding: 20, gap: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  formTitle: { color: colors.mutedForeground, fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginLeft: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 14, padding: 14,
    color: colors.foreground, fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary,
    borderRadius: 14, padding: 18,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  savedMsg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savedMsgText: { color: colors.accentGreen, fontWeight: '700', fontSize: 13 },
});
