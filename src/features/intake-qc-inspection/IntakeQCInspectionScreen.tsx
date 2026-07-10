import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card, Alert } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { Segmented } from '@/src/core/ui/Segmented';
import { DecisionChip } from '@/src/core/ui/DecisionChip';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { useAuthStore } from '@/src/core/auth/store';
import { COLORS, borderRadius, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { emptyInspectionForm, useIntakeQcInspectionStore, type InspectionForm } from './store';
import { suggestDecision, type Decision, type Sibling } from './repository';

function CounterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const count = parseInt(value || '0', 10) || 0;
  const adjust = (delta: number) => onChange(String(Math.max(0, count + delta)));
  return (
    <View style={s.counterRow}>
      <Text style={s.counterLabel}>{label}</Text>
      <View style={s.stepper}>
        <Pressable onPress={() => adjust(-1)} style={s.stepBtn}>
          <Text style={s.stepBtnText}>−</Text>
        </Pressable>
        <Text style={s.stepCount}>{count}</Text>
        <Pressable onPress={() => adjust(1)} style={s.stepBtn}>
          <Text style={s.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function IntakeQCInspectionScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const lot = useIntakeQcInspectionStore((s) => s.lot);
  const lotLoading = useIntakeQcInspectionStore((s) => s.lotLoading);
  const submitting = useIntakeQcInspectionStore((s) => s.submitting);
  const siblingsLoading = useIntakeQcInspectionStore((s) => s.siblingsLoading);
  const loadLot = useIntakeQcInspectionStore((s) => s.loadLot);
  const clearLot = useIntakeQcInspectionStore((s) => s.clearLot);
  const findSiblingsForReject = useIntakeQcInspectionStore((s) => s.findSiblingsForReject);
  const submitInspection = useIntakeQcInspectionStore((s) => s.submitInspection);
  const requestIsolationCascade = useIntakeQcInspectionStore((s) => s.requestIsolationCascade);

  const fullName = useAuthStore((s) => s.fullName);
  const email = useAuthStore((s) => s.email);

  const [form, setForm] = useState<InspectionForm>(emptyInspectionForm);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [cascadeSiblings, setCascadeSiblings] = useState<Sibling[] | null>(null);
  const [pendingSubmitName, setPendingSubmitName] = useState('');

  useFocusEffect(() => {
    if (!lot) focusWhenReady(scanRef);
  });

  const field = <K extends keyof InspectionForm>(key: K) => (value: InspectionForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyInspectionForm);
    setDecision(null);
    setOverrideReason('');
    clearLot();
  };

  const onScan = async (raw: string) => {
    const bucketId = raw.trim().toUpperCase();
    if (!bucketId) return;
    const result = await loadLot(bucketId);
    if (!result.ok) showError(result.message ?? 'Failed to load bucket.');
    focusWhenReady(scanRef);
  };

  const fcm = parseInt(form.fcm || '0', 10) || 0;
  const suggested = suggestDecision(fcm);
  const chosen = decision ?? suggested;
  const overridden = suggested !== null && chosen !== null && chosen !== suggested;

  const canSubmit = !!lot && chosen !== null && (!overridden || overrideReason.trim().length > 0);

  const doSubmit = async (siblingsToCascade: Sibling[]) => {
    if (!chosen) return;
    const outcome = await submitInspection(form, chosen, overridden ? overrideReason.trim() : undefined);
    if (outcome.kind === 'error') {
      showError(outcome.message);
      return;
    }
    if (chosen === 'reject' && siblingsToCascade.length > 0) {
      const cascadeOutcome = await requestIsolationCascade(
        outcome.name,
        siblingsToCascade.map((s) => s.name),
      );
      if (cascadeOutcome.kind === 'error') {
        showError('Inspection saved, but isolation request failed: ' + cascadeOutcome.message);
        resetForm();
        return;
      }
      showSuccess(`Saved. ${siblingsToCascade.length} other lot(s) flagged for supervisor review.`);
    } else {
      showSuccess('Inspection saved.');
    }
    resetForm();
  };

  const onSubmit = async () => {
    if (!lot || !chosen) return;
    if (overridden && !overrideReason.trim()) {
      showError('An override reason is required.');
      return;
    }
    if (chosen === 'reject') {
      const siblings = await findSiblingsForReject();
      if (siblings.length > 0) {
        setCascadeSiblings(siblings);
        setPendingSubmitName(lot.bucketId);
        return;
      }
    }
    await doSubmit([]);
  };

  const confirmCascade = async () => {
    const siblings = cascadeSiblings ?? [];
    setCascadeSiblings(null);
    await doSubmit(siblings);
  };

  return (
    <Screen title="Intake QC Inspection" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card title="Inspector">
          <Text style={s.lotLine}>{fullName || email || 'Unknown user'}</Text>
          <Text style={s.lotSub}>This inspection will be recorded under your account.</Text>
        </Card>

        <Card title="Scan Bucket QR">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus={!lot}
            placeholder="Scan or type bucket"
            editable={!lotLoading && !lot}
          />
          {lotLoading ? <Text style={s.help}>Loading bucket…</Text> : null}
          {lot ? (
            <View style={s.lotSummary}>
              <Text style={s.lotLine}>
                {lot.bucketId} — {lot.variety || 'Unknown variety'}
              </Text>
              <Text style={s.lotSub}>
                {lot.farm || '—'}
                {lot.greenhouse ? ` · ${lot.greenhouse}` : ''}
              </Text>
              <Button label="Scan different bucket" variant="outline" onPress={resetForm} />
            </View>
          ) : null}
        </Card>

        {lot ? (
          <>
            <Card title="Sampling Guidance">
              <Segmented
                value={form.isHighRisk ? 'high' : 'standard'}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'high', label: 'High Risk' },
                ]}
                onChange={(v) => field('isHighRisk')(v === 'high')}
              />
              <Alert tone="info">
                {form.isHighRisk
                  ? 'High-risk: sample 30% of the lot and inspect 100% of each sample.'
                  : 'Sample ≥30% of the lot, examine 100% of the stems in the sample.'}
              </Alert>
            </Card>

            <Card title="Pest Counts">
              <CounterField label="Duponchela" value={form.duponchela} onChange={field('duponchela')} />
              <CounterField label="Helicoverpa" value={form.helicoverpa} onChange={field('helicoverpa')} />
              <CounterField label="Spodoptera" value={form.spodoptera} onChange={field('spodoptera')} />
              <CounterField label="FCM" value={form.fcm} onChange={field('fcm')} />
            </Card>

            <Card title="Physical Checks">
              <CounterField label="Blackening" value={form.blackening} onChange={field('blackening')} />
              <CounterField label="Damages" value={form.damages} onChange={field('damages')} />
              <CounterField label="Bent Stems" value={form.bentStems} onChange={field('bentStems')} />
              <CounterField label="Broken Stems" value={form.brokenStems} onChange={field('brokenStems')} />
            </Card>

            <Card title="Residue & Maturity">
              <Text style={s.label}>Chemical Residue</Text>
              <Segmented
                value={form.chemicalResidueStatus || 'Pass'}
                options={[
                  { value: 'Pass', label: 'Pass' },
                  { value: 'Fail', label: 'Fail' },
                ]}
                onChange={field('chemicalResidueStatus')}
              />
              {form.chemicalResidueStatus === 'Fail' ? (
                <LabeledInput label="Residue Notes" value={form.chemicalResidueNotes} onChangeText={field('chemicalResidueNotes')} multiline />
              ) : null}
              <Text style={s.label}>Maturity Stage</Text>
              <Segmented
                value={form.maturityStage || 'Tight Bud'}
                options={[
                  { value: 'Tight Bud', label: 'Tight Bud' },
                  { value: 'Half Open', label: 'Half Open' },
                  { value: 'Full Open', label: 'Full Open' },
                ]}
                onChange={field('maturityStage')}
              />
            </Card>

            <Card title="Other">
              <Text style={s.label}>Live Pest or Disease</Text>
              <Segmented
                value={form.livePestOrDisease ? 'yes' : 'no'}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
                onChange={(v) => field('livePestOrDisease')(v === 'yes')}
              />
              {form.livePestOrDisease ? (
                <LabeledInput label="Notes" value={form.livePestOrDiseaseNotes} onChangeText={field('livePestOrDiseaseNotes')} multiline />
              ) : null}
              <Text style={s.label}>Leaf Chlorosis</Text>
              <Segmented
                value={form.leafChlorosis ? 'yes' : 'no'}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
                onChange={(v) => field('leafChlorosis')(v === 'yes')}
              />
              {form.leafChlorosis ? (
                <LabeledInput label="Notes" value={form.leafChlorosisNotes} onChangeText={field('leafChlorosisNotes')} multiline />
              ) : null}
            </Card>

            <Card title="Decision">
              <Text style={s.help}>
                {suggested === null
                  ? 'FCM = 1 — no automatic suggestion, pick manually.'
                  : `Suggested: ${suggested === 'approve' ? 'Approve' : 'Reject'} (based on FCM = ${fcm}).`}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <DecisionChip label="Approve" selected={chosen === 'approve'} onPress={() => setDecision('approve')} />
                <DecisionChip label="Reject" selected={chosen === 'reject'} onPress={() => setDecision('reject')} />
              </View>
              {overridden ? (
                <LabeledInput
                  label="Override Reason (required)"
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  multiline
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
            </Card>

            <Button
              label={submitting || siblingsLoading ? 'Saving…' : 'Save inspection'}
              onPress={onSubmit}
              loading={submitting || siblingsLoading}
              disabled={!canSubmit}
            />
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!cascadeSiblings} transparent animationType="fade" onRequestClose={() => setCascadeSiblings(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Isolate other lots?</Text>
            <Text style={s.modalBody}>
              Rejecting {pendingSubmitName} will flag the following {cascadeSiblings?.length ?? 0} lot(s) from the
              same farm/greenhouse/variety/date for supervisor review — they won&apos;t be isolated until a
              supervisor approves.
            </Text>
            <ScrollView style={s.modalList}>
              {(cascadeSiblings ?? []).map((sib) => (
                <Text key={sib.name} style={s.modalListItem}>
                  • {sib.bucketId}
                </Text>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button label="Cancel" variant="outline" onPress={() => setCascadeSiblings(null)} style={{ flex: 1 }} />
              <Button label="Confirm" onPress={confirmCascade} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: COLORS.text, marginBottom: spacing.xs },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  counterLabel: { fontSize: fontSize.sm, color: COLORS.text, flex: 1 },
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
  lotSummary: { marginTop: spacing.md, gap: spacing.xs },
  lotLine: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  lotSub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: borderRadius.lg, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: COLORS.text, marginBottom: spacing.sm },
  modalBody: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.sm },
  modalList: { maxHeight: 160 },
  modalListItem: { fontSize: fontSize.sm, color: COLORS.text, paddingVertical: 2 },
});
