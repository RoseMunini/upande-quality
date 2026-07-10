import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card, Alert } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { Dropdown } from '@/src/core/ui/Dropdown';
import { Segmented } from '@/src/core/ui/Segmented';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useGradingStore } from './store';

const REASONS = [
  'Bent Stem',
  'Disease/Pest Damage',
  'Undersized',
  'Bud Damage',
  'Bruised Petals',
  'Wrong Variety',
  'Overmature',
  'Botrytis',
  'Aphids',
  'Caterpillar',
];

type Mode = 'pass' | 'reject';

export function GradingScreen() {
  const graderRef = useRef<ScanFieldHandle>(null);
  const bunchRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const passing = useGradingStore((s) => s.passing);
  const rejecting = useGradingStore((s) => s.rejecting);
  const varieties = useGradingStore((s) => s.varieties);
  const varietiesLoading = useGradingStore((s) => s.varietiesLoading);
  const varietiesError = useGradingStore((s) => s.varietiesError);
  const loadVarieties = useGradingStore((s) => s.loadVarieties);
  const passGrading = useGradingStore((s) => s.passGrading);
  const submitRejects = useGradingStore((s) => s.submitRejects);

  const [mode, setMode] = useState<Mode>('pass');

  const [graderId, setGraderId] = useState('');

  const [variety, setVariety] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (mode === 'reject') loadVarieties();
  }, [mode, loadVarieties]);

  useFocusEffect(() => {
    if (mode !== 'pass') return;
    if (!graderId) focusWhenReady(graderRef);
    else focusWhenReady(bunchRef);
  });

  const onScanGrader = async (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    setGraderId(id);
    focusWhenReady(bunchRef);
  };

  const onScanBunch = async (raw: string) => {
    const bunchId = raw.trim().toUpperCase();
    if (!bunchId || !graderId) return;
    const outcome = await passGrading(bunchId, graderId);
    if (!outcome.ok) {
      showError(outcome.message);
    } else {
      showSuccess(`${bunchId} passed — ${outcome.qty} stems (${outcome.variety}).`);
    }
    focusWhenReady(bunchRef);
  };

  const changeGrader = () => {
    setGraderId('');
    focusWhenReady(graderRef);
  };

  const adjustCount = (reason: string, delta: number) => {
    setCounts((c) => ({ ...c, [reason]: Math.max(0, (c[reason] ?? 0) + delta) }));
  };

  const totalRejectQty = Object.values(counts).reduce((a, b) => a + b, 0);

  const onSubmitRejects = async () => {
    if (!variety.trim()) {
      showError('Select the variety.');
      return;
    }
    const entries = REASONS.filter((r) => (counts[r] ?? 0) > 0).map((r) => ({ reason: r, quantity: counts[r] }));
    if (entries.length === 0) {
      showError('Add a quantity to at least one reason.');
      return;
    }
    const results = await submitRejects(variety.trim(), entries, notes);
    const failed = results.filter((r) => r.kind === 'error');
    if (failed.length === 0) {
      showSuccess(`${totalRejectQty} stems rejected across ${entries.length} reason(s).`);
      setVariety('');
      setCounts({});
      setNotes('');
    } else {
      showError(`${failed.length} of ${entries.length} reject entries failed: ${failed.map((f) => f.reason).join(', ')}`);
    }
  };

  return (
    <Screen title="Grading" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card>
          <Segmented
            value={mode}
            options={[
              { value: 'pass', label: 'Pass' },
              { value: 'reject', label: 'Reject' },
            ]}
            onChange={setMode}
          />
        </Card>

        {mode === 'pass' ? (
          <>
            <Card title="Grader">
              {graderId ? (
                <View style={s.summary}>
                  <Text style={s.summaryLine}>Employee {graderId}</Text>
                  <Button label="Change grader" variant="outline" onPress={changeGrader} />
                </View>
              ) : (
                <ScanField
                  ref={graderRef}
                  onScan={onScanGrader}
                  autoFocus
                  placeholder="Scan or type employee ID"
                  editable
                />
              )}
            </Card>

            <Card title="Scan Bunch">
              {!graderId ? (
                <Text style={s.help}>Identify the grader above first.</Text>
              ) : (
                <>
                  <ScanField
                    ref={bunchRef}
                    onScan={onScanBunch}
                    autoFocus
                    placeholder="Scan or type bunch"
                    editable={!passing}
                  />
                  {passing ? <Text style={s.help}>Passing…</Text> : null}
                </>
              )}
            </Card>
          </>
        ) : (
          <>
            <Card title="Variety">
              <Dropdown
                label=""
                value={variety || null}
                options={varieties.map((v) => ({ label: v.itemName, value: v.name }))}
                placeholder={varietiesLoading ? 'Loading varieties…' : 'Select variety'}
                onChange={setVariety}
                disabled={varietiesLoading}
              />
              {varietiesError ? (
                <>
                  <Alert tone="danger">{varietiesError}</Alert>
                  <Button label="Retry" variant="outline" onPress={loadVarieties} />
                </>
              ) : null}
            </Card>

            <Card title="Reason(s) & Quantities">
              {REASONS.map((r) => (
                <View key={r} style={s.reasonRow}>
                  <Text style={s.reasonLabel}>{r}</Text>
                  <View style={s.stepper}>
                    <Pressable onPress={() => adjustCount(r, -1)} style={s.stepBtn}>
                      <Text style={s.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={s.stepCount}>{counts[r] ?? 0}</Text>
                    <Pressable onPress={() => adjustCount(r, 1)} style={s.stepBtn}>
                      <Text style={s.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
            </Card>

            {totalRejectQty > 0 ? <Alert tone="warn">{totalRejectQty} stems will be rejected.</Alert> : null}

            <Button
              label={rejecting ? 'Submitting…' : 'Submit Reject'}
              loading={rejecting}
              onPress={onSubmitRejects}
              disabled={totalRejectQty === 0}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  help: { fontSize: 12, color: COLORS.textMuted },
  summary: { gap: spacing.xs },
  summaryLine: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  reasonLabel: { fontSize: fontSize.sm, color: COLORS.text, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  stepCount: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text, minWidth: 24, textAlign: 'center' },
});
