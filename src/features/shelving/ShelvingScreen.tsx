import { useRef } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { useUserStation } from '@/src/core/tenant/user-station';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useShelvingStore } from './store';

export function ShelvingScreen() {
  const shelfRef = useRef<ScanFieldHandle>(null);
  const bucketRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();
  const { station } = useUserStation();

  const shelfId = useShelvingStore((s) => s.shelfId);
  const setShelf = useShelvingStore((s) => s.setShelf);
  const clearShelf = useShelvingStore((s) => s.clearShelf);
  const shelving = useShelvingStore((s) => s.shelving);
  const shelveBucket = useShelvingStore((s) => s.shelveBucket);

  const onScanShelf = (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    setShelf(id);
    focusWhenReady(bucketRef);
  };

  const onScanBucket = async (raw: string) => {
    const bucketId = raw.trim();
    if (!bucketId || !station?.userFarm) {
      if (!station?.userFarm) showError('Configure this device’s farm first.');
      return;
    }
    const outcome = await shelveBucket(bucketId, station.userFarm);
    if (!outcome.ok) {
      showError(outcome.message);
    } else {
      showSuccess(`${bucketId} shelved — ${outcome.stems} stems (${outcome.variety}).`);
    }
    focusWhenReady(bucketRef);
  };

  const changeShelf = () => {
    clearShelf();
    focusWhenReady(shelfRef);
  };

  return (
    <Screen title="Shelving" scroll={false}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card title="Shelf">
          {shelfId ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text }}>
                {shelfId}
              </Text>
              <Button label="Change shelf" variant="outline" onPress={changeShelf} />
            </View>
          ) : (
            <ScanField
              ref={shelfRef}
              onScan={onScanShelf}
              autoFocus
              placeholder="Scan shelf QR"
              showSoftKeyboard
            />
          )}
        </Card>

        <Card title="Bucket">
          {shelfId ? (
            <>
              <ScanField
                ref={bucketRef}
                onScan={onScanBucket}
                autoFocus
                placeholder="Scan bucket QR"
                editable={!shelving}
                showSoftKeyboard
              />
              {shelving ? (
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs }}>Shelving…</Text>
              ) : null}
            </>
          ) : (
            <ScanField onScan={() => {}} placeholder="Scan the shelf first" editable={false} />
          )}
        </Card>
      </View>
    </Screen>
  );
}
