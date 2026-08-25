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

  const isBunched = useReceivingStore((s) => s.isBunched);
  const setIsBunched = useReceivingStore((s) => s.setIsBunched);
  const bunchSize = useReceivingStore((s) => s.bunchSize);
  const setBunchSize = useReceivingStore((s) => s.setBunchSize);
  const numberOfBunches = useReceivingStore((s) => s.numberOfBunches);
  const setNumberOfBunches = useReceivingStore((s) => s.setNumberOfBunches);
  const isBalance = useReceivingStore((s) => s.isBalance);
  const setIsBalance = useReceivingStore((s) => s.setIsBalance);
  const balanceQty = useReceivingStore((s) => s.balanceQty);
  const setBalanceQty = useReceivingStore((s) => s.setBalanceQty);
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
    if (isBalance && !balanceQty.trim()) {
      showError('Enter the actual stem count for this balance bucket before scanning.');
      focusWhenReady(scanRef);
      return;
    }
    const outcome = await receiveBucket(bucketId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(scanRef);
      return;
    }
    const label = outcome.overrideApplied ? 'Balance bucket received' : `${bucketId} received`;
    showSuccess(`${label} — ${outcome.qty} stems (${outcome.variety}).`);
    focusWhenReady(scanRef);
  };

  const activeSummary = isBunched
    ? bunchSize && numberOfBunches
      ? `Bunch(${bunchSize}) × ${numberOfBunches}`
      : 'Bunched — select size and count below'
    : isBalance
      ? balanceQty
        ? `Balance bucket — ${balanceQty} stems`
        : 'Balance bucket — enter stem count below'
      : 'Standard bucket';

  return (
    <Screen title="Receiving" scroll={false}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card>
          <Text style={s.toggleTitle}>Now receiving</Text>
          <Text style={s.summaryValue}>{activeSummary}</Text>
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

        {!isBunched ? (
          <Card>
            <View style={s.toggleRow}>
              <View style={s.flex}>
                <Text style={s.toggleTitle}>Balance Bucket</Text>
                <Text style={s.toggleSub}>
                  {isBalance ? 'Less than the standard bucket rate' : 'Off — receives at standard bucket rate'}
                </Text>
              </View>
              <Switch value={isBalance} onValueChange={setIsBalance} />
            </View>
            {isBalance ? (
              <View style={{ marginTop: spacing.md }}>
                <LabeledInput
                  label="Actual stem count"
                  value={balanceQty}
                  onChangeText={(t) => setBalanceQty(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="e.g. 18"
                />
              </View>
            ) : null}
          </Card>
        ) : null}

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
  summaryValue: { fontSize: fontSize.md, color: COLORS.text, marginTop: 2 },
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
});
