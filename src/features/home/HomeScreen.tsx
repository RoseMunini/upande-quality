import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/core/ui/Screen';
import { useAuthStore } from '@/src/core/auth/store';
import { borderRadius, COLORS, fontFamily, fontSize, radius, spacing } from '@/src/core/theme';

type NavCard = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  href: Parameters<ReturnType<typeof useRouter>['push']>[0];
};

const CARDS: NavCard[] = [
  {
    icon: 'search-outline',
    title: 'Traceability',
    description: 'Scan a bucket or bunch to see its full stock history.',
    href: '/traceability',
  },
  {
    icon: 'download-outline',
    title: 'Receiving',
    description: 'Scan buckets in from the greenhouse and record what arrived.',
    href: '/receiving',
  },
  {
    icon: 'checkmark-done-outline',
    title: 'Intake QC',
    description: 'Search a received bucket to reject or quarantine it.',
    href: '/intake-qc',
  },
  {
    icon: 'ribbon-outline',
    title: 'Grading',
    description: 'Pass graded bunches or record grading rejects.',
    href: '/grading-qc',
  },
  {
    icon: 'checkbox-outline',
    title: 'Inspection Log',
    description: 'Temperature and cleaning history for the coldroom.',
    href: '/inspection-log',
  },
  {
    icon: 'hardware-chip-outline',
    title: 'Configure Station',
    description: 'Assign this device to a farm and greenhouse.',
    href: '/configure-station',
  },
];

export function HomeScreen() {
  const router = useRouter();
  const email = useAuthStore((s) => s.email);

  return (
    <Screen title="Upande Quality">
      <View style={s.welcomeCard}>
        <Text style={s.welcomeLabel}>Welcome,</Text>
        <Text style={s.welcomeEmail}>{email}</Text>
      </View>

      <View style={s.grid}>
        {CARDS.map((card) => (
          <Pressable key={card.title} style={s.gridCard} onPress={() => router.push(card.href)}>
            <View style={s.iconBadge}>
              <Ionicons name={card.icon} size={22} color={COLORS.text} />
            </View>
            <Text style={s.cardTitle}>{card.title}</Text>
            <Text style={s.cardDesc}>{card.description}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  welcomeLabel: { fontSize: fontSize.md, color: COLORS.textMuted },
  welcomeEmail: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: COLORS.text, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text, marginBottom: 2 },
  cardDesc: { fontSize: fontSize.sm, color: COLORS.textMuted },
});
