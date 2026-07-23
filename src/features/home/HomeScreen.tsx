import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/core/ui/Screen';
import { borderRadius, COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';

type NavCard = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  href: Parameters<ReturnType<typeof useRouter>['push']>[0];
};

const CARDS: NavCard[] = [
  {
    icon: 'cube-outline',
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
    icon: 'search-outline',
    title: 'Traceability',
    description: 'Scan a bucket or bunch to see its full stock history.',
    href: '/traceability',
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

  return (
    <Screen title="Upande Quality">
      {CARDS.map((card) => (
        <Pressable key={card.title} style={s.card} onPress={() => router.push(card.href)}>
          <View style={s.iconWrap}>
            <Ionicons name={card.icon} size={22} color={COLORS.text} />
          </View>
          <View style={s.flex}>
            <Text style={s.cardTitle}>{card.title}</Text>
            <Text style={s.cardDesc}>{card.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: COLORS.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  cardDesc: { fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
});
