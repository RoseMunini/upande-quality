import { useEffect, useRef } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, fontFamily, fontSize, spacing, radius } from '@/src/core/theme';
import { useAuthStore } from '@/src/core/auth/store';
import { useProfileDrawerStore } from './drawer-store';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);
const APP_VERSION = '1.0.1';

function siteLabel(url: string | null) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function ProfileDrawer() {
  const visible = useProfileDrawerStore((s) => s.visible);
  const close = useProfileDrawerStore((s) => s.close);
  const fullName = useAuthStore((s) => s.fullName);
  const email = useAuthStore((s) => s.email);
  const instanceUrl = useAuthStore((s) => s.instanceUrl);
  const forgetDevice = useAuthStore((s) => s.forgetDevice);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  const goToConfigureStation = () => {
    close();
    router.push('/configure-station');
  };

  const goToIntakeQc = () => {
    close();
    router.push('/intake-qc');
  };

  const goToGradingQc = () => {
    close();
    router.push('/grading-qc');
  };

  const goToInspectionLog = () => {
    close();
    router.push('/inspection-log');
  };

  const goToTraceability = () => {
    close();
    router.push('/traceability');
  };

  const onSettings = () => {
    close();
    router.push('/settings');
  };

  const onSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          close();
          await forgetDevice();
          router.replace('/login');
        },
      },
    ]);
  };

  const initial = (fullName || email || '?').trim().charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={s.container}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={s.flex} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[s.panel, { width: DRAWER_WIDTH, paddingTop: insets.top + spacing.lg, transform: [{ translateX }] }]}
        >
          <View style={s.profile}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <Text style={s.name} numberOfLines={1}>{fullName || 'Unknown user'}</Text>
            <Text style={s.email} numberOfLines={1}>{email}</Text>
            <Text style={s.site} numberOfLines={1}>{siteLabel(instanceUrl)}</Text>
          </View>

          <View style={s.divider} />

          <MenuRow icon="checkmark-done-outline" label="Intake Rejects" onPress={goToIntakeQc} />
          <MenuRow icon="ribbon-outline" label="Grading" onPress={goToGradingQc} />
          <MenuRow icon="checkbox-outline" label="Inspection Log" onPress={goToInspectionLog} />
          <MenuRow icon="search-outline" label="Traceability" onPress={goToTraceability} />
          <MenuRow icon="hardware-chip-outline" label="Configure Station" onPress={goToConfigureStation} />
          <MenuRow icon="settings-outline" label="Settings" onPress={onSettings} />
          <MenuRow icon="log-out-outline" label="Sign Out" onPress={onSignOut} danger />

          <View style={s.flex} />
          <Text style={s.version}>Upande Quality v{APP_VERSION}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={s.menuRow} onPress={onPress}>
      <View style={[s.menuIconWrap, danger && s.menuIconWrapDanger]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.text} />
      </View>
      <Text style={[s.menuLabel, danger && s.menuLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: spacing.lg,
  },
  profile: { alignItems: 'center', paddingBottom: spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, color: COLORS.textOnPrimary },
  name: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: COLORS.text },
  email: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
  site: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginBottom: spacing.sm },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapDanger: { backgroundColor: '#FEE2E2' },
  menuLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.md, color: COLORS.text },
  menuLabelDanger: { color: COLORS.danger },
  version: { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: COLORS.textMuted, paddingBottom: spacing.lg },
});
