import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/core/ui/Screen';
import { borderRadius, COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';

type Workflow = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  href: Parameters<ReturnType<typeof useRouter>['push']>[0];
};

// More workflows (reject recording, final QC, etc.) land here as they're
// built — right now Grading QC is the only one live.
const WORKFLOWS: Workflow[] = [
  {
    icon: 'leaf-outline',
    title: 'Grading QC',
    description: 'Pass graded bunches or record grading rejects.',
    href: '/grading-detail',
  },
];

export function PackhouseQCScreen() {
  const router = useRouter();

  return (
    <Screen title="Packhouse QC">
      <Text style={s.heading}>Select Workflow</Text>
      <Text style={s.subheading}>Choose which quality check you&apos;re doing.</Text>

      {WORKFLOWS.map((w) => (
        <Pressable key={w.title} style={s.card} onPress={() => router.push(w.href)}>
          <View style={s.iconWrap}>
            <Ionicons name={w.icon} size={22} color={COLORS.text} />
          </View>
          <View style={s.flex}>
            <Text style={s.cardTitle}>{w.title}</Text>
            <Text style={s.cardDesc}>{w.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  heading: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, color: COLORS.text, marginBottom: spacing.xs },
  subheading: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.lg },
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
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: COLORS.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  cardDesc: { fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
});
