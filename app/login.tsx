import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { useAuthStore } from '@/src/core/auth/store';
import { authRepository } from '@/src/core/auth/repository';
import { useTenant } from '@/src/core/tenant/tenant-context';
import { COLORS } from '@/src/core/theme';

export default function Login() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const { setInstanceUrl } = useTenant();

  useEffect(() => {
    (async () => {
      const { email: e, url: u } = await authRepository.loadBackupCredentials();
      if (e) setEmail(e);
      if (u) setUrl(u.replace(/^https?:\/\//i, ''));
    })();
  }, []);

  const submit = async () => {
    if (!url.trim()) {
      setErr('Instance URL is required.');
      return;
    }
    if (!email.trim() || !password) {
      setErr('Email and password are required.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    const ok = await login(email.trim(), password, url);
    setSubmitting(false);
    if (ok) {
      const stored = useAuthStore.getState().instanceUrl;
      await setInstanceUrl(stored ?? null);
      router.replace('/intake-qc');
    } else {
      setErr(useAuthStore.getState().error ?? 'Login failed');
    }
  };

  return (
    <Screen title="Upande Quality">
      <Card>
        <Text style={s.intro}>Sign in with your Frappe user account.</Text>
      </Card>

      <Card>
        <Field
          label="Instance URL"
          value={url}
          onChange={setUrl}
          placeholder="demo.upande.com"
          keyboardType="url"
        />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          keyboardType="email-address"
        />
        <View style={s.pwWrap}>
          <Text style={s.label}>Password</Text>
          <View style={s.pwRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={s.pwInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Text style={s.pwToggle}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </View>
        {err ? <Text style={s.err}>{err}</Text> : null}
      </Card>

      <Button label="Sign in" onPress={submit} loading={submitting} />
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'url';
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  intro: { fontSize: 14, color: COLORS.text },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  pwWrap: { marginBottom: 10 },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
  },
  pwInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  pwToggle: { color: COLORS.text, fontSize: 13, fontWeight: '600', padding: 6 },
  err: { color: COLORS.danger, fontSize: 13, marginTop: 4 },
});
