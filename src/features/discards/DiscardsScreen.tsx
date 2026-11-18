import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Alert, Card } from '@/src/core/ui/Card';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontSize, spacing } from '@/src/core/theme';
import { useDiscardsStore } from './store';

export function DiscardsScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const discardedCount = useDiscardsStore((s) => s.discardedCount);
  const discarding = useDiscardsStore((s) => s.discarding);
  const discardBucket = useDiscardsStore((s) => s.discardBucket);

  // Last scan result stays on screen so the reason a bucket couldn't be
  // discarded (not shelved, no transfer, pre-issued…) is still readable
  // after the toast has gone.
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const onScan = async (raw: string) => {
    const bucketId = raw.trim();
    if (!bucketId) return;
    const outcome = await discardBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      setLastResult({ ok: false, message: outcome.message });
    } else {
      const message = `${bucketId} discarded — ${outcome.stems} stems (${outcome.variety}), ${outcome.hoursOnShelf}h on the shelf.`;
      showSuccess(message);
      setLastResult({ ok: true, message });
    }
    focusWhenReady(scanRef);
  };

  return (
    <Screen title="Low-Market Rejects" scroll={false}>
      <View style={{ padding: spacing.lg }}>
        <Card title="Scan Bucket To Discard">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus
            placeholder="Scan bucket QR"
            editable={!discarding}
            showSoftKeyboard
          />
          <Text style={{ fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: spacing.sm }}>
            {discardedCount} buckets discarded this session
          </Text>
          {lastResult ? (
            <View style={{ marginTop: spacing.md }}>
              <Alert tone={lastResult.ok ? 'success' : 'danger'}>{lastResult.message}</Alert>
            </View>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
