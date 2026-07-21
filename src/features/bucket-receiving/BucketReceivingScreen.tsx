import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
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

type TopMode = 'search' | 'quarantine';

export function BucketReceivingScreen() {
  const searchRef = useRef<ScanFieldHandle>(null);
  const quarantineDestRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const searching = useBucketReceivingStore((s) => s.searching);
  const found = useBucketReceivingStore((s) => s.found);
  const searchBucket = useBucketReceivingStore((s) => s.searchBucket);
  const clearFound = useBucketReceivingStore((s) => s.clearFound);
  const rejecting = useBucketReceivingStore((s) => s.rejecting);
  const submitFoundReject = useBucketReceivingStore((s) => s.submitFoundReject);
  const quarantining = useBucketReceivingStore((s) => s.quarantining);
  const quarantineFoundBucket = useBucketReceivingStore((s) => s.quarantineFoundBucket);

  const transferring = useBucketReceivingStore((s) => s.transferring);
  const quarantineList = useBucketReceivingStore((s) => s.quarantineList);
  const quarantineListLoading = useBucketReceivingStore((s) => s.quarantineListLoading);
  const loadQuarantineList = useBucketReceivingStore((s) => s.loadQuarantineList);
  const releaseAsTransfer = useBucketReceivingStore((s) => s.releaseAsTransfer);
  const releaseAsReject = useBucketReceivingStore((s) => s.releaseAsReject);

  const [topMode, setTopMode] = useState<TopMode>('search');

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectCounts, setRejectCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const [reviewingBucketId, setReviewingBucketId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'accept' | 'reject' | null>(null);
  const [reviewRejectCounts, setReviewRejectCounts] = useState<Record<string, number>>({});
  const [reviewNotes, setReviewNotes] = useState('');

  useFocusEffect(() => {
    if (topMode === 'search' && !found) focusWhenReady(searchRef);
  });

  useEffect(() => {
    if (topMode === 'quarantine') loadQuarantineList();
  }, [topMode, loadQuarantineList]);

  useEffect(() => {
    if (!found) {
      setShowRejectForm(false);
      setRejectCounts({});
      setNotes('');
    }
  }, [found]);

  const onSearch = async (raw: string) => {
    const bucketId = raw.trim();
    if (!bucketId) return;
    const outcome = await searchBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(searchRef);
    }
  };

  const onScanAnother = () => {
    clearFound();
    focusWhenReady(searchRef);
  };

  const onQuarantineFound = async () => {
    const bucketId = found?.bucketId;
    const outcome = await quarantineFoundBucket();
    if (!outcome.ok) {
      showError(outcome.message);
      return;
    }
    showSuccess(`${bucketId} sent to quarantine.`);
    focusWhenReady(searchRef);
  };

  const adjustCount = (reason: string, delta: number) => {
    setRejectCounts((c) => ({ ...c, [reason]: Math.max(0, (c[reason] ?? 0) + delta) }));
  };

  const onTypeCount = (reason: string, text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setRejectCounts((c) => ({ ...c, [reason]: digits === '' ? 0 : parseInt(digits, 10) }));
  };

  const assignedTotal = Object.values(rejectCounts).reduce((a, b) => a + b, 0);

  const onSubmitFoundReject = async () => {
    if (assignedTotal === 0) {
      showError('Add a quantity to at least one reason.');
      return;
    }
    const bucketId = found?.bucketId;
    const entries = REASONS.filter((r) => (rejectCounts[r] ?? 0) > 0).map((r) => ({ reason: r, quantity: rejectCounts[r] }));
    const outcome = await submitFoundReject(entries, notes);
    if (!outcome.ok) {
      showError(outcome.message);
      return;
    }
    showSuccess(`${assignedTotal} stems rejected from ${bucketId}.`);
    focusWhenReady(searchRef);
  };

  // Quarantine Review handlers
  const startReview = (bucketId: string) => {
    setReviewingBucketId(bucketId);
    setReviewAction(null);
    setReviewRejectCounts({});
    setReviewNotes('');
  };

  const cancelReview = () => {
    setReviewingBucketId(null);
    setReviewAction(null);
  };

  const adjustReviewCount = (reason: string, delta: number) => {
    setReviewRejectCounts((c) => ({ ...c, [reason]: Math.max(0, (c[reason] ?? 0) + delta) }));
  };

  const onTypeReviewCount = (reason: string, text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setReviewRejectCounts((c) => ({ ...c, [reason]: digits === '' ? 0 : parseInt(digits, 10) }));
  };

  const reviewAssignedTotal = Object.values(reviewRejectCounts).reduce((a, b) => a + b, 0);
  const reviewingItem = quarantineList.find((q) => q.bucketId === reviewingBucketId);

  const onReleaseAsTransfer = async (raw: string) => {
    const destinationBucketId = raw.trim().toUpperCase();
    if (!destinationBucketId || !reviewingItem) return;
    const outcome = await releaseAsTransfer(reviewingItem.bucketId, reviewingItem.qty, destinationBucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(quarantineDestRef);
      return;
    }
    showSuccess(`${reviewingItem.bucketId} released — transferred to coldroom.`);
    setReviewingBucketId(null);
    setReviewAction(null);
  };

  const onReleaseAsReject = async () => {
    if (!reviewingItem) return;
    if (reviewAssignedTotal === 0) {
      showError('Add at least one reason and quantity.');
      return;
    }
    const entries = REASONS.filter((r) => (reviewRejectCounts[r] ?? 0) > 0).map((r) => ({ reason: r, quantity: reviewRejectCounts[r] }));
    const outcome = await releaseAsReject(reviewingItem.bucketId, entries, reviewNotes);
    if (!outcome.ok) {
      showError(outcome.message);
      return;
    }
    showSuccess(`${reviewingItem.bucketId} released — rejected.`);
    setReviewingBucketId(null);
    setReviewAction(null);
  };

  return (
    <Screen title="Intake QC" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card>
          <Segmented
            value={topMode}
            options={[
              { value: 'search', label: 'Search' },
              { value: 'quarantine', label: 'Quarantine Review' },
            ]}
            onChange={setTopMode}
          />
        </Card>

        {topMode === 'search' ? (
          <>
            <Card title="Search Bucket">
              <ScanField
                ref={searchRef}
                onScan={onSearch}
                autoFocus={!found}
                placeholder="Scan or type bucket"
                editable={!searching && !found}
              />
              {searching ? <Text style={s.help}>Searching…</Text> : null}
              <Text style={s.help}>Only shows buckets received or transferred in the last 24 hours.</Text>
            </Card>

            {found ? (
              <>
                <Card title={found.bucketId}>
                  <Text style={s.summaryLine}>{found.itemCode || 'Unknown variety'}</Text>
                  <Text style={s.summarySub}>
                    Farm: {found.farm || 'Unknown'}
                    {found.greenhouse ? ` · ${found.greenhouse}` : ''}
                  </Text>
                  <Text style={s.summarySub}>
                    {found.qty} stems · {found.stockEntryType === 'Bucket Transfer' ? 'Transferred' : 'Received'}
                  </Text>
                  <Button label="Scan different bucket" variant="outline" onPress={onScanAnother} />
                </Card>

                {!showRejectForm ? (
                  <Card title="Action">
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button label="Reject" variant="outline" onPress={() => setShowRejectForm(true)} style={{ flex: 1 }} />
                      <Button
                        label={quarantining ? 'Sending…' : 'Quarantine'}
                        loading={quarantining}
                        onPress={onQuarantineFound}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </Card>
                ) : (
                  <Card title={`Reject Reasons${assignedTotal > 0 ? ` (${assignedTotal})` : ''}`}>
                    {REASONS.map((r) => (
                      <View key={r} style={s.reasonRow}>
                        <Text style={s.reasonLabel}>{r}</Text>
                        <View style={s.stepper}>
                          <Pressable onPress={() => adjustCount(r, -1)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>−</Text>
                          </Pressable>
                          <TextInput
                            value={String(rejectCounts[r] ?? 0)}
                            onChangeText={(t) => onTypeCount(r, t)}
                            keyboardType="number-pad"
                            style={s.stepInput}
                          />
                          <Pressable onPress={() => adjustCount(r, 1)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button label="Cancel" variant="outline" onPress={() => setShowRejectForm(false)} style={{ flex: 1 }} />
                      <Button
                        label={rejecting ? 'Saving…' : 'Submit Reject'}
                        loading={rejecting}
                        onPress={onSubmitFoundReject}
                        disabled={assignedTotal === 0}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </Card>
                )}
              </>
            ) : null}
          </>
        ) : (
          <>
            <Card title={`Quarantined Buckets (${quarantineList.length})`}>
              {quarantineListLoading ? <Text style={s.help}>Loading…</Text> : null}
              {!quarantineListLoading && quarantineList.length === 0 ? (
                <Text style={s.help}>Nothing currently in quarantine.</Text>
              ) : null}
              {quarantineList.map((q) => (
                <View key={q.bucketId} style={s.queueRow}>
                  <Text style={s.queueLine}>
                    {q.bucketId} — {q.itemCode || 'Unknown variety'}
                  </Text>
                  <Text style={s.summarySub}>
                    {q.greenhouse ? `${q.greenhouse} · ` : ''}
                    {q.qty} stems
                  </Text>
                  <Button
                    label={reviewingBucketId === q.bucketId ? 'Reviewing…' : 'Review'}
                    variant="outline"
                    onPress={() => startReview(q.bucketId)}
                    disabled={reviewingBucketId === q.bucketId}
                    style={{ marginTop: spacing.xs }}
                  />
                </View>
              ))}
              <Button
                label="Refresh"
                variant="outline"
                onPress={loadQuarantineList}
                style={{ marginTop: spacing.sm }}
              />
            </Card>

            {reviewingItem ? (
              <Card title={`Review ${reviewingItem.bucketId}`}>
                <Text style={s.summarySub}>
                  {reviewingItem.itemCode || 'Unknown variety'} · {reviewingItem.qty} stems
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <Button
                    label="Accept"
                    variant={reviewAction === 'accept' ? 'primary' : 'outline'}
                    onPress={() => setReviewAction('accept')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Reject"
                    variant={reviewAction === 'reject' ? 'primary' : 'outline'}
                    onPress={() => setReviewAction('reject')}
                    style={{ flex: 1 }}
                  />
                </View>

                {reviewAction === 'accept' ? (
                  <View style={{ marginTop: spacing.md }}>
                    <ScanField
                      ref={quarantineDestRef}
                      onScan={onReleaseAsTransfer}
                      autoFocus
                      placeholder="Scan or type destination bucket"
                      editable={!transferring}
                    />
                    {transferring ? <Text style={s.help}>Transferring…</Text> : null}
                  </View>
                ) : null}

                {reviewAction === 'reject' ? (
                  <View style={{ marginTop: spacing.md }}>
                    {REASONS.map((r) => (
                      <View key={r} style={s.reasonRow}>
                        <Text style={s.reasonLabel}>{r}</Text>
                        <View style={s.stepper}>
                          <Pressable onPress={() => adjustReviewCount(r, -1)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>−</Text>
                          </Pressable>
                          <TextInput
                            value={String(reviewRejectCounts[r] ?? 0)}
                            onChangeText={(t) => onTypeReviewCount(r, t)}
                            keyboardType="number-pad"
                            style={s.stepInput}
                          />
                          <Pressable onPress={() => adjustReviewCount(r, 1)} style={s.stepBtn}>
                            <Text style={s.stepBtnText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                    <LabeledInput label="Notes" value={reviewNotes} onChangeText={setReviewNotes} placeholder="Optional" multiline />
                    <Button
                      label={rejecting ? 'Saving…' : `Confirm Reject (${reviewAssignedTotal})`}
                      loading={rejecting}
                      onPress={onReleaseAsReject}
                      disabled={reviewAssignedTotal === 0}
                    />
                  </View>
                ) : null}

                <Button label="Cancel" variant="outline" onPress={cancelReview} style={{ marginTop: spacing.sm }} />
              </Card>
            ) : null}
          </>
        )}
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
