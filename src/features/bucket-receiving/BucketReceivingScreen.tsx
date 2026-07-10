import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card, Alert } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { Segmented } from '@/src/core/ui/Segmented';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useBucketReceivingStore } from './store';
import { computeRemainingQty } from './repository';

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

export function BucketReceivingScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const destRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const phase = useBucketReceivingStore((s) => s.phase);
  const queue = useBucketReceivingStore((s) => s.queue);
  const activeIndex = useBucketReceivingStore((s) => s.activeIndex);
  const scanStatus = useBucketReceivingStore((s) => s.scanStatus);
  const scannedBucketId = useBucketReceivingStore((s) => s.scannedBucketId);
  const lookupLoading = useBucketReceivingStore((s) => s.lookupLoading);
  const receiving = useBucketReceivingStore((s) => s.receiving);
  const rejecting = useBucketReceivingStore((s) => s.rejecting);
  const transferring = useBucketReceivingStore((s) => s.transferring);
  const scanBucket = useBucketReceivingStore((s) => s.scanBucket);
  const receive = useBucketReceivingStore((s) => s.receive);
  const enqueueInUse = useBucketReceivingStore((s) => s.enqueueInUse);
  const startRejecting = useBucketReceivingStore((s) => s.startRejecting);
  const reject = useBucketReceivingStore((s) => s.reject);
  const advanceReject = useBucketReceivingStore((s) => s.advanceReject);
  const transfer = useBucketReceivingStore((s) => s.transfer);
  const reset = useBucketReceivingStore((s) => s.reset);

  const [isBunched, setIsBunched] = useState(false);
  const [bunchSize, setBunchSize] = useState('');
  const [numberOfBunches, setNumberOfBunches] = useState('');

  const [rejectQtyInput, setRejectQtyInput] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useFocusEffect(() => {
    if (phase === 'receiving' && !scanStatus) focusWhenReady(scanRef);
    if (phase === 'transferring') focusWhenReady(destRef);
  });

  const resetReceiveForm = () => {
    setIsBunched(false);
    setBunchSize('');
    setNumberOfBunches('');
  };

  const resetRejectForm = () => {
    setRejectQtyInput('');
    setSelectedReasons([]);
    setNotes('');
  };

  const startNewBatch = () => {
    reset();
    resetReceiveForm();
    resetRejectForm();
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
    if (status && status.status !== 'Available') {
      enqueueInUse();
      showSuccess(`${bucketId} added to queue.`);
      focusWhenReady(scanRef);
    }
    // else: status is 'Available' — the Receive card below takes over.
  };

  const onReceive = async () => {
    if (isBunched && (!bunchSize.trim() || !numberOfBunches.trim())) {
      showError('Enter bunch size and number of bunches.');
      return;
    }
    const outcome = await receive({
      isBunched,
      bunchSize: isBunched ? parseFloat(bunchSize) : undefined,
      numberOfBunches: isBunched ? parseFloat(numberOfBunches) : undefined,
    });
    if (!outcome.ok) {
      showError(outcome.message);
      return;
    }
    showSuccess(`${scannedBucketId || 'Bucket'} added to queue.`);
    resetReceiveForm();
    focusWhenReady(scanRef);
  };

  const toggleReason = (r: string) => {
    setSelectedReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const onStartRejecting = () => {
    resetRejectForm();
    startRejecting();
  };

  const onRejectContinue = async () => {
    const qty = parseInt(rejectQtyInput || '0', 10) || 0;
    if (qty > 0) {
      if (selectedReasons.length === 0) {
        showError('Select at least one reason for the reject.');
        return;
      }
      const outcome = await reject({ quantity: qty, reason: selectedReasons.join(', '), notes });
      if (!outcome.ok) {
        showError(outcome.message);
        return;
      }
    }
    resetRejectForm();
    advanceReject();
    if (useBucketReceivingStore.getState().phase === 'transferring') focusWhenReady(destRef);
  };

  const onTransfer = async (raw: string) => {
    const destinationBucketId = raw.trim().toUpperCase();
    if (!destinationBucketId) return;
    const outcome = await transfer(destinationBucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(destRef);
      return;
    }
    showSuccess('Transferred to coldroom.');
    focusWhenReady(destRef);
  };

  const activeItem = queue[activeIndex];

  return (
    <Screen title="Intake QC" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {phase === 'receiving' ? (
          <>
            <Card title="Scan Bucket">
              <ScanField
                ref={scanRef}
                onScan={onScanSource}
                autoFocus={!scanStatus}
                placeholder="Scan or type source bucket"
                editable={!lookupLoading && !scanStatus}
              />
              {lookupLoading ? <Text style={s.help}>Looking up bucket…</Text> : null}
            </Card>

            {scanStatus && scanStatus.status === 'Available' ? (
              <Card title={`Receive ${scannedBucketId}`}>
                <Text style={s.summarySub}>
                  {scanStatus.itemCode || 'Unknown variety'}
                  {scanStatus.greenhouse ? ` · ${scanStatus.greenhouse}` : ''}
                </Text>
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
                    <LabeledInput
                      label="Bunch size (stems)"
                      keyboardType="number-pad"
                      value={bunchSize}
                      onChangeText={setBunchSize}
                    />
                    <LabeledInput
                      label="Number of bunches"
                      keyboardType="number-pad"
                      value={numberOfBunches}
                      onChangeText={setNumberOfBunches}
                    />
                  </>
                ) : null}
                <Button label={receiving ? 'Receiving…' : 'Receive'} loading={receiving} onPress={onReceive} />
              </Card>
            ) : null}

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
                label={`Record Rejects (${queue.length})`}
                onPress={onStartRejecting}
                disabled={queue.length === 0}
                style={{ marginTop: spacing.sm }}
              />
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
                {activeItem.greenhouse ? `${activeItem.greenhouse} · ` : ''}
                {activeItem.receivedQty} stems received
              </Text>
            </Card>

            <Card title="Reject (optional)">
              <LabeledInput
                label="Quantity to reject"
                keyboardType="number-pad"
                value={rejectQtyInput}
                onChangeText={setRejectQtyInput}
                placeholder="0"
              />
              <Text style={s.label}>Reason(s)</Text>
              <View style={s.chipRow}>
                {REASONS.map((r) => {
                  const active = selectedReasons.includes(r);
                  return (
                    <Text key={r} onPress={() => toggleReason(r)} style={[s.chip, active && s.chipActive]}>
                      {active ? '✓ ' : ''}
                      {r}
                    </Text>
                  );
                })}
              </View>
              <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
              <Button label={rejecting ? 'Saving…' : 'Continue'} loading={rejecting} onPress={onRejectContinue} />
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
                {activeItem.receivedQty} received
                {activeItem.rejectQty > 0 ? `, ${activeItem.rejectQty} rejected` : ''}
              </Text>
            </Card>

            <Card title="Transfer to Coldroom">
              <Alert tone="info">
                {computeRemainingQty(activeItem.receivedQty, activeItem.rejectQty)} stems will be transferred.
              </Alert>
              <View style={{ height: spacing.sm }} />
              <ScanField
                ref={destRef}
                onScan={onTransfer}
                autoFocus
                placeholder="Scan or type destination bucket"
                editable={!transferring}
              />
              {transferring ? <Text style={s.help}>Transferring…</Text> : null}
            </Card>
          </>
        ) : null}

        {phase === 'done' ? (
          <Card title="Batch Complete">
            <Alert tone="success">{queue.length} bucket(s) transferred to the coldroom.</Alert>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 12,
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: COLORS.text, color: '#FFFFFF', borderColor: COLORS.text },
});
