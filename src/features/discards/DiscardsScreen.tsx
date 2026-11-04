import { useRef } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontSize, spacing } from '@/src/core/theme';
import { useDiscardsStore } from './store';

export function DiscardsScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const markedCount = useDiscardsStore((s) => s.markedCount);
  const discarding = useDiscardsStore((s) => s.discarding);
  const discardBucket = useDiscardsStore((s) => s.discardBucket);

  const onScan = async (raw: string) => {
    const bucketId = raw.trim();
    if (!bucketId) return;
    const outcome = await discardBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
    } else if (outcome.pendingApproval) {
      showSuccess(`${bucketId} sent for discard approval — ${outcome.stems} stems (${outcome.variety}).`);
    } else {
      showSuccess(
        `${bucketId} marked as a low-market reject — goes for approval once it has 72h in the coldroom (~${outcome.hoursRemaining}h).`,
      );
    }
    focusWhenReady(scanRef);
  };

  return (
    <Screen title="Low-Market Rejects" scroll={false}>
      <View style={{ padding: spacing.lg }}>
        <Card title="Scan Bucket To Reject">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus
            placeholder="Scan bucket QR"
            editable={!discarding}
            showSoftKeyboard
          />
          <Text style={{ fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: spacing.sm }}>
            {markedCount} buckets marked this session
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
