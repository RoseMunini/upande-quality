import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Alert, Card } from '@/src/core/ui/Card';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontSize, spacing } from '@/src/core/theme';
import { useDiscardsStore } from './store';
import { isBunchId } from './repository';

export function DiscardsScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const discardedCount = useDiscardsStore((s) => s.discardedCount);
  const discarding = useDiscardsStore((s) => s.discarding);
  const discardBucket = useDiscardsStore((s) => s.discardBucket);
  const discardedBunchCount = useDiscardsStore((s) => s.discardedBunchCount);
  const discardBunch = useDiscardsStore((s) => s.discardBunch);

  // Last scan result stays on screen so the reason a bucket couldn't be
  // discarded (not shelved, no transfer, pre-issued…) is still readable
  // after the toast has gone.
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const report = (ok: boolean, message: string) => {
    if (ok) showSuccess(message);
    else showError(message);
    setLastResult({ ok, message });
  };

  const onScan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (isBunchId(code)) {
      // Graded bunch in the graded coldstore.
      const outcome = await discardBunch(code);
      if (!outcome.ok) report(false, outcome.message);
      else report(true, `${code} discarded — ${outcome.stems} stems (${outcome.variety}) from the graded coldstore.`);
    } else {
      // Coldroom bucket on a shelf.
      const outcome = await discardBucket(code);
      if (!outcome.ok) report(false, outcome.message);
      else
        report(
          true,
          `${code} discarded — ${outcome.stems} stems (${outcome.variety}), ${outcome.hoursOnShelf}h on the shelf.`,
        );
    }
    focusWhenReady(scanRef);
  };

  return (
    <Screen title="Low-Market Rejects" scroll={false}>
      <View style={{ padding: spacing.lg }}>
        <Card title="Scan Bucket Or Bunch To Discard">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus
            placeholder="Scan bucket or bunch QR"
            editable={!discarding}
            showSoftKeyboard
          />
          <Text style={{ fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: spacing.sm }}>
            {discardedCount} buckets, {discardedBunchCount} bunches discarded this session
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
