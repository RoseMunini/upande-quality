import { useRef } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Dropdown } from '@/src/core/ui/Dropdown';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useReceivingStore } from './store';

// Real standard bunch sizes registered on the backend (UOM "Bunch(N)" records).
const BUNCH_SIZES = [3, 5, 7, 9, 10, 12, 13, 20];

export function ReceivingScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showSuccess, showError } = useToast();

  const batchMode = useReceivingStore((s) => s.batchMode);
  const setBatchMode = useReceivingStore((s) => s.setBatchMode);
  const isBunched = useReceivingStore((s) => s.isBunched);
  const setIsBunched = useReceivingStore((s) => s.setIsBunched);
  const bunchSize = useReceivingStore((s) => s.bunchSize);
  const setBunchSize = useReceivingStore((s) => s.setBunchSize);
  const numberOfBunches = useReceivingStore((s) => s.numberOfBunches);
  const setNumberOfBunches = useReceivingStore((s) => s.setNumberOfBunches);
  const receiving = useReceivingStore((s) => s.receiving);
  const receiveBucket = useReceivingStore((s) => s.receiveBucket);

  const onScan = async (raw: string) => {
    const bucketId = raw.trim();
    if (!bucketId) return;
    if (isBunched && (!bunchSize.trim() || !numberOfBunches.trim())) {
      showError('Select bunch size and enter number of bunches above before scanning a pre-bunched bucket.');
      focusWhenReady(scanRef);
      return;
    }
    const outcome = await receiveBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(scanRef);
      return;
    }
    showSuccess(`${bucketId} received — ${outcome.qty} stems (${outcome.variety}).`);
    focusWhenReady(scanRef);
  };

  return (
    <Screen title="Receiving" scroll={false}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <View style={s.toggleRow}>
            <View style={s.flex}>
              <Text style={s.toggleTitle}>Batch Receiving</Text>
              <Text style={s.toggleSub}>
                {batchMode ? 'Keeps these settings for the next scan' : 'Single bucket mode'}
              </Text>
            </View>
            <Switch value={batchMode} onValueChange={setBatchMode} />
          </View>
        </Card>

        <Card>
          <View style={s.toggleRow}>
            <View style={s.flex}>
              <Text style={s.toggleTitle}>Is Bunched</Text>
              <Text style={s.toggleSub}>{isBunched ? 'Pre-bunched' : 'Not bunched'}</Text>
            </View>
            <Switch value={isBunched} onValueChange={setIsBunched} />
          </View>
          {isBunched ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Dropdown
                label="Bunch size"
                value={bunchSize || null}
                options={BUNCH_SIZES.map((n) => ({ label: `Bunch(${n})`, value: String(n) }))}
                placeholder="Select bunch size"
                onChange={setBunchSize}
              />
              <LabeledInput
                label="Number of bunches"
                value={numberOfBunches}
                onChangeText={(t) => setNumberOfBunches(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 5"
              />
            </View>
          ) : null}
        </Card>

        <Card title="Scan Bucket QR">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus
            placeholder="Scan or type bucket"
            editable={!receiving}
            showSoftKeyboard
          />
          {receiving ? <Text style={s.help}>Receiving…</Text> : null}
        </Card>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  toggleSub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
});
