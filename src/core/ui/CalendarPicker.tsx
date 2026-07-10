import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';

type Props = {
  label: string;
  /** ISO date, e.g. '2026-07-10'. Empty string means "no date picked". */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function formatDisplay(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso;
  return `${parsed.d} ${MONTH_LABELS[parsed.m].slice(0, 3)} ${parsed.y}`;
}

function todayParts(): { y: number; m: number; d: number } {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

/** Pure-JS month-grid calendar — no native date-picker dependency, so it
 *  behaves identically in Expo Go and any future build regardless of SDK. */
export function CalendarPicker({ label, value, onChange, placeholder = 'Select date', disabled }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (parseIso(value) ?? todayParts()).y);
  const [viewMonth, setViewMonth] = useState(() => (parseIso(value) ?? todayParts()).m);

  const openPicker = () => {
    const base = parseIso(value) ?? todayParts();
    setViewYear(base.y);
    setViewMonth(base.m);
    setOpen(true);
  };

  const days = useMemo(() => {
    const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const selected = parseIso(value);
  const isSelected = (d: number) => !!selected && selected.y === viewYear && selected.m === viewMonth && selected.d === d;

  const pickDay = (d: number) => {
    onChange(toIso(viewYear, viewMonth, d));
    setOpen(false);
  };

  return (
    <View style={s.wrap}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable onPress={() => !disabled && openPicker()} style={[s.field, disabled && s.fieldDisabled]}>
        <MaterialCommunityIcons name="calendar-outline" size={18} color={COLORS.textMuted} style={{ marginLeft: spacing.md }} />
        <Text style={[s.value, !value && s.placeholder]} numberOfLines={1}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={s.header}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={s.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={s.headerText}>
                {MONTH_LABELS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={s.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={s.weekRow}>
              {WEEKDAY_LABELS.map((w, i) => (
                <Text key={`${w}-${i}`} style={s.weekLabel}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={s.grid}>
              {days.map((d, i) => (
                <View key={i} style={s.cell}>
                  {d ? (
                    <TouchableOpacity
                      onPress={() => pickDay(d)}
                      style={[s.day, isSelected(d) && s.daySelected]}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.dayText, isSelected(d) && s.dayTextSelected]}>{d}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn} activeOpacity={0.7}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: COLORS.text, marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
  },
  fieldDisabled: { opacity: 0.55 },
  value: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: COLORS.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  placeholder: { color: COLORS.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerText: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: COLORS.text },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: COLORS.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: COLORS.text },
  dayText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: COLORS.text },
  dayTextSelected: { fontFamily: fontFamily.semiBold, color: '#FFFFFF' },
  closeBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  closeBtnText: { fontFamily: fontFamily.medium, fontSize: fontSize.md, color: COLORS.textMuted },
});
