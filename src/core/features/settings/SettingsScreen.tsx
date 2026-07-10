import { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { Segmented } from '@/src/core/ui/Segmented';
import { useAuthStore } from '@/src/core/auth/store';
import { useNetworkStore } from '@/src/core/network/store';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useSettingsStore } from './store';

function siteLabel(url: string | null) {
  if (!url) return '—';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function timeAgo(ms: number | null): string {
  if (!ms) return 'Never this session';
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr} hr ago`;
}

export function SettingsScreen() {
  const router = useRouter();

  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);

  const fullName = useAuthStore((s) => s.fullName);
  const email = useAuthStore((s) => s.email);
  const instanceUrl = useAuthStore((s) => s.instanceUrl);
  const forgetDevice = useAuthStore((s) => s.forgetDevice);

  const online = useNetworkStore((s) => s.online);
  const lastSuccessAt = useNetworkStore((s) => s.lastSuccessAt);

  useEffect(() => {
    if (!settingsLoaded) hydrateSettings();
  }, [settingsLoaded, hydrateSettings]);

  const onResetData = () => {
    Alert.alert(
      'Clear local data',
      'This clears your saved station, cached roles, and login session on this device, then returns to the login screen. Use this if the app is stuck or behaving oddly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Sign Out',
          style: 'destructive',
          onPress: async () => {
            await forgetDevice();
            router.replace('/login');
          },
        },
      ],
    );
  };

  return (
    <Screen title="Settings">
      <Card title="Scanner Sound">
        <Segmented
          value={soundEnabled ? 'on' : 'off'}
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          onChange={(v) => setSoundEnabled(v === 'on')}
        />
      </Card>

      <Card title="App & Connection">
        <InfoRow label="Version" value={Constants.expoConfig?.version ?? '—'} />
        <InfoRow label="Backend" value={siteLabel(instanceUrl)} />
        <InfoRow label="Signed in as" value={fullName || '—'} />
        <InfoRow label="Email" value={email || '—'} />
        <InfoRow label="Status" value={online ? 'Online' : 'Offline'} tone={online ? 'success' : 'danger'} />
        <InfoRow label="Last synced" value={timeAgo(lastSuccessAt)} />
      </Card>

      <Card title="Reset">
        <Text style={s.help}>
          Clears everything saved on this device and returns to login. Doesn&apos;t affect any data
          already submitted to the server.
        </Text>
        <Button label="Clear local data" variant="outline" color={COLORS.danger} onPress={onResetData} />
      </Card>
    </Screen>
  );
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  const toneColor = tone === 'success' ? COLORS.success : tone === 'danger' ? COLORS.danger : COLORS.text;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, tone ? { color: toneColor } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  help: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: COLORS.textMuted },
  rowValue: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: COLORS.text, flexShrink: 1, marginLeft: spacing.md },
});
