import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { useBucketReceivingStore } from './store';

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

// Real standard bunch sizes registered on the backend (UOM "Bunch(N)" records).
const BUNCH_SIZES = [3, 5, 7, 9, 10, 12, 13, 20];

export function BucketReceivingScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const destRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const phase = useBucketReceivingStore((s) => s.phase);
  const queue = useBucketReceivingStore((s) => s.queue);
  const activeIndex = useBucketReceivingStore((s) => s.activeIndex);
  const lookupLoading = useBucketReceivingStore((s) => s.lookupLoading);
  const receiving = useBucketReceivingStore((s) => s.receiving);
  const rejecting = useBucketReceivingStore((s) => s.rejecting);
  const transferring = useBucketReceivingStore((s) => s.transferring);
  const scanBucket = useBucketReceivingStore((s) => s.scanBucket);
  const receive = useBucketReceivingStore((s) => s.receive);
  const enqueueInUse = useBucketReceivingStore((s) => s.enqueueInUse);
  const clearScanStatus = useBucketReceivingStore((s) => s.clearScanStatus);
  const startTransferring = useBucketReceivingStore((s) => s.startTransferring);
  const transfer = useBucketReceivingStore((s) => s.transfer);
  const submitItemRejects = useBucketReceivingStore((s) => s.submitItemRejects);
  const reset = useBucketReceivingStore((s) => s.reset);

  const [isBunched, setIsBunched] = useState(false);
  const [bunchSize, setBunchSize] = useState('');
  const [numberOfBunches, setNumberOfBunches] = useState('');

  const [heldBackInput, setHeldBackInput] = useState('0');
  const [rejectCounts, setRejectCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const activeItem = queue[activeIndex];
  const heldBack = activeItem ? Math.max(0, Math.min(parseInt(heldBackInput || '0', 10) || 0, activeItem.receivedQty)) : 0;
  const transferQty = activeItem ? activeItem.receivedQty - heldBack : 0;

  useFocusEffect(() => {
    if (phase === 'receiving') focusWhenReady(scanRef);
    if (phase === 'transferring' && transferQty > 0) focusWhenReady(destRef);
  });

  // Reset the per-item held-back qty every time a new item becomes active.
  useEffect(() => {
    if (phase === 'transferring' && activeItem) {
      setHeldBackInput('0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeIndex]);

  useEffect(() => {
    if (phase === 'rejecting') {
      setRejectCounts({});
      setNotes('');
    }
  }, [phase, activeIndex]);

  const resetReceiveForm = () => {
    setIsBunched(false);
    setBunchSize('');
    setNumberOfBunches('');
  };

  const startNewBatch = () => {
    reset();
    resetReceiveForm();
    focusWhenReady(scanRef);
  };

  const onScanSource = async (raw: string) => {
    const bucketId = raw.trim().toUpperCase();
    if (!bucketId) return;
    const outcome = await scanBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(scanRef);
      return;
    }
    const status = useBucketReceivingStore.getState().scanStatus;
    if (!status) {
      focusWhenReady(scanRef);
      return;
    }
    if (status.status !== 'Available') {
      enqueueInUse();
      showSuccess(`${bucketId} added to queue.`);
      focusWhenReady(scanRef);
      return;
    }
    // Available — receive immediately, no extra tap. Pre-bunched buckets need
    // the size/count set in Receiving Setup above before they can be scanned.
    if (isBunched && (!bunchSize.trim() || !numberOfBunches.trim())) {
      showError('Enter bunch size and number of bunches above before scanning a pre-bunched bucket.');
      clearScanStatus();
      focusWhenReady(scanRef);
      return;
    }
    const receiveOutcome = await receive({
      isBunched,
      bunchSize: isBunched ? parseFloat(bunchSize) : undefined,
      numberOfBunches: isBunched ? parseFloat(numberOfBunches) : undefined,
    });
    if (!receiveOutcome.ok) {
      showError(receiveOutcome.message);
      clearScanStatus();
      focusWhenReady(scanRef);
      return;
    }
    showSuccess(`${bucketId} added to queue.`);
    focusWhenReady(scanRef);
  };

  const onTransferToDestination = async (raw: string) => {
    const destinationBucketId = raw.trim().toUpperCase();
    if (!destinationBucketId) return;
    const outcome = await transfer(transferQty, destinationBucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(destRef);
      return;
    }
    showSuccess('Transferred to coldroom.');
  };

  const onRejectEntireBucket = async () => {
    const outcome = await transfer(0);
    if (!outcome.ok) showError(outcome.message);
  };

  const adjustHeldBack = (delta: number) => {
    setHeldBackInput((cur) => {
      const max = activeItem?.receivedQty ?? 0;
      const next = Math.max(0, Math.min((parseInt(cur || '0', 10) || 0) + delta, max));
      return String(next);
    });
  };

  const onTypeHeldBack = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (digits === '') {
      setHeldBackInput('');
      return;
    }
    const max = activeItem?.receivedQty ?? 0;
    setHeldBackInput(String(Math.max(0, Math.min(parseInt(digits, 10), max))));
  };

  const adjustCount = (reason: string, delta: number) => {
    setRejectCounts((c) => ({ ...c, [reason]: Math.max(0, (c[reason] ?? 0) + delta) }));
  };

  const assignedTotal = Object.values(rejectCounts).reduce((a, b) => a + b, 0);

  const onSubmitItemRejects = async () => {
    const entries = REASONS.filter((r) => (rejectCounts[r] ?? 0) > 0).map((r) => ({ reason: r, quantity: rejectCounts[r] }));
    const outcome = await submitItemRejects(entries, notes);
    if (!outcome.ok) showError(outcome.message);
  };

  return (
    <Screen title="Intake QC" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {phase === 'receiving' ? (
          <>
            <Card title="Receiving Setup">
              <Text style={s.label}>Pre-bunched?</Text>
              <Segmented
                value={isBunched ? 'yes' : 'no'}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'yes', label: 'Yes' },
                ]}
                onChange={(v) => setIsBunched(v === 'yes')}
              />
              {isBunched ? (
                <>
                  <Dropdown
                    label="Bunch size"
                    value={bunchSize || null}
                    options={BUNCH_SIZES.map((n) => ({ label: `Bunch(${n})`, value: String(n) }))}
                    placeholder="Select bunch size"
                    onChange={setBunchSize}
                  />
                  <LabeledInput
                    label="Number of bunches"
                    keyboardType="number-pad"
                    value={numberOfBunches}
                    onChangeText={setNumberOfBunches}
                  />
                </>
              ) : (
                <Text style={s.help}>Applies to every bucket scanned below until changed.</Text>
              )}
            </Card>

            <Card title="Scan Bucket">
              <ScanField
                ref={scanRef}
                onScan={onScanSource}
                autoFocus
                placeholder="Scan or type source bucket"
                editable={!lookupLoading && !receiving}
              />
              {lookupLoading ? <Text style={s.help}>Looking up bucket…</Text> : null}
              {receiving ? <Text style={s.help}>Receiving…</Text> : null}
            </Card>

            <Card title={`Receiving Queue (${queue.length})`}>
              {queue.length === 0 ? (
                <Text style={s.help}>Scan buckets to add them to the queue.</Text>
              ) : (
                queue.map((q) => (
                  <View key={q.bucketId} style={s.queueRow}>
                    <Text style={s.queueLine}>
                      {q.bucketId} — {q.itemCode || 'Unknown variety'}
                    </Text>
                    <Text style={s.summarySub}>
                      {q.greenhouse ? `${q.greenhouse} · ` : ''}
                      {q.receivedQty} stems
                    </Text>
                  </View>
                ))
              )}
              <Button
                label={`Transfer Queue (${queue.length})`}
                onPress={startTransferring}
                disabled={queue.length === 0}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          </>
        ) : null}

        {phase === 'transferring' && activeItem ? (
          <>
            <Card title={`Bucket ${activeIndex + 1} of ${queue.length}`}>
              <Text style={s.summaryLine}>
                {activeItem.bucketId} — {activeItem.itemCode || 'Unknown variety'}
              </Text>
              <Text style={s.summarySub}>
                {activeItem.greenhouse ? `${activeItem.greenhouse} · ` : ''}
                {activeItem.receivedQty} stems received
              </Text>
            </Card>

            <Card title="Transfer to Coldroom">
              <Text style={s.label}>Qty to hold back (reject)</Text>
              <View style={s.stepper}>
                <Pressable onPress={() => adjustHeldBack(-1)} style={s.stepBtn}>
                  <Text style={s.stepBtnText}>−</Text>
                </Pressable>
                <TextInput
                  value={heldBackInput}
                  onChangeText={onTypeHeldBack}
                  keyboardType="number-pad"
                  style={s.stepInput}
                />
                <Pressable onPress={() => adjustHeldBack(1)} style={s.stepBtn}>
                  <Text style={s.stepBtnText}>+</Text>
                </Pressable>
              </View>
              <Text style={s.summarySub}>
                {transferQty} of {activeItem.receivedQty} will be transferred.
              </Text>

              {transferQty > 0 ? (
                <>
                  <ScanField
                    ref={destRef}
                    onScan={onTransferToDestination}
                    autoFocus
                    placeholder="Scan or type destination bucket"
                    editable={!transferring}
                  />
                  {transferring ? <Text style={s.help}>Transferring…</Text> : null}
                </>
              ) : (
                <Button label="Reject entire bucket" variant="outline" onPress={onRejectEntireBucket} />
              )}
            </Card>
          </>
        ) : null}

        {phase === 'rejecting' && activeItem ? (
          <>
            <Card title={`Bucket ${activeIndex + 1} of ${queue.length}`}>
              <Text style={s.summaryLine}>
                {activeItem.bucketId} — {activeItem.itemCode || 'Unknown variety'}
              </Text>
              <Text style={s.summarySub}>
                {activeItem.transferQty} transferred
                {activeItem.rejectQty > 0 ? `, ${activeItem.rejectQty} held back at transfer` : ''}
              </Text>
            </Card>

            <Card title={`Reject Reasons${assignedTotal > 0 ? ` (${assignedTotal})` : ''}`}>
              {activeItem.rejectQty > 0 ? (
                <Text style={s.help}>
                  {activeItem.rejectQty} stem(s) were held back at transfer — assign reasons below, or leave as-is
                  if you&apos;ll cover it separately.
                </Text>
              ) : (
                <Text style={s.help}>Nothing was held back. Add a reason only if you spotted an issue afterward.</Text>
              )}
              {REASONS.map((r) => (
                <View key={r} style={s.reasonRow}>
                  <Text style={s.reasonLabel}>{r}</Text>
                  <View style={s.stepper}>
                    <Pressable onPress={() => adjustCount(r, -1)} style={s.stepBtn}>
                      <Text style={s.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={s.stepCount}>{rejectCounts[r] ?? 0}</Text>
                    <Pressable onPress={() => adjustCount(r, 1)} style={s.stepBtn}>
                      <Text style={s.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
              <Button
                label={rejecting ? 'Saving…' : assignedTotal > 0 ? 'Submit & Continue' : 'Continue'}
                loading={rejecting}
                onPress={onSubmitItemRejects}
              />
            </Card>
          </>
        ) : null}

        {phase === 'done' ? (
          <Card title="Batch Complete">
            <Alert tone="success">{queue.length} bucket(s) processed.</Alert>
            <Button label="Start new batch" onPress={startNewBatch} style={{ marginTop: spacing.sm }} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: COLORS.text, marginBottom: spacing.xs },
  summaryLine: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  summarySub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.sm },
  queueRow: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  queueLine: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: COLORS.text },
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
  stepInput: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 4,
  },
});
