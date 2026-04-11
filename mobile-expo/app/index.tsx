import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    router.replace('/dashboard');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GlassCard style={styles.card}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>SafeDrive AI</Text>
            <Text style={styles.subtitle}>Your companion for safe, alert driving journeys.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} activeOpacity={0.85}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/signup')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              New to SafeDrive?{' '}
              <Text style={styles.link}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { padding: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    padding: 16, borderRadius: 20,
    backgroundColor: `${colors.primary}22`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.foreground, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginLeft: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: 14, padding: 14,
    color: colors.foreground, fontSize: 15,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.primary,
    borderRadius: 14, padding: 16, marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footerLink: { marginTop: 24, alignItems: 'center' },
  footerText: { color: colors.mutedForeground, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '600' },
});
