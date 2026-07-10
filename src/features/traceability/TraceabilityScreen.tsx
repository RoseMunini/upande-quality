import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { ScanField, type ScanFieldHandle } from '@/src/core/scanning/ScanField';
import { focusWhenReady } from '@/src/core/scanning/focus';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useTraceabilityStore } from './store';

function shortTime(iso: string): string {
  return iso.replace('T', ' ').slice(0, 19);
}

export function TraceabilityScreen() {
  const scanRef = useRef<ScanFieldHandle>(null);
  const { showError } = useToast();

  const history = useTraceabilityStore((s) => s.history);
  const loading = useTraceabilityStore((s) => s.loading);
  const lookup = useTraceabilityStore((s) => s.lookup);
  const clear = useTraceabilityStore((s) => s.clear);

  useFocusEffect(() => {
    if (!history) focusWhenReady(scanRef);
  });

  const onScan = async (raw: string) => {
    const refId = raw.trim().toUpperCase();
    if (!refId) return;
    const outcome = await lookup(refId);
    if (!outcome.ok) {
      showError(outcome.message);
      focusWhenReady(scanRef);
    }
  };

  const resetLookup = () => {
    clear();
    focusWhenReady(scanRef);
  };

  const current = history?.current;

  return (
    <Screen title="Traceability" scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card title="Scan Bucket or Bunch">
          <ScanField
            ref={scanRef}
            onScan={onScan}
            autoFocus={!history}
            placeholder="Scan or type bucket/bunch ID"
            editable={!loading && !history}
          />
          {loading ? <Text style={s.help}>Looking up history…</Text> : null}
        </Card>

        {history && current ? (
          <>
            <Card title={history.refId}>
              <Text style={s.summaryLine}>{current.item_code || 'Unknown variety'}</Text>
              <Text style={s.summarySub}>
                {history.kind === 'bucket'
                  ? `${current.greenhouse ? `${current.greenhouse} · ` : ''}${current.status || '—'}`
                  : `${current.farm ? `${current.farm} · ` : ''}${current.bunch_size ?? '—'} stems${
                      current.stem_length ? ` · ${current.stem_length}` : ''
                    }`}
              </Text>
              <Button label="Scan different one" variant="outline" onPress={resetLookup} />
            </Card>

            <Card title={`History (${history.events.length})`}>
              {history.events.length === 0 ? (
                <Text style={s.help}>No recorded activity for this ID yet.</Text>
              ) : (
                history.events.map((e, i) => (
                  <View key={`${e.stockEntry}-${i}`} style={s.eventRow}>
                    <Text style={s.eventTitle}>{e.event}</Text>
                    <Text style={s.eventSub}>
                      {shortTime(e.eventTime)} · {e.who}
                    </Text>
                    {e.qty ? (
                      <Text style={s.eventSub}>
                        {e.qty} stems{e.itemCode ? ` · ${e.itemCode}` : ''}
                      </Text>
                    ) : null}
                    {e.fromWarehouse || e.toWarehouse ? (
                      <Text style={s.eventSub}>
                        {e.fromWarehouse || '—'} → {e.toWarehouse || '—'}
                      </Text>
                    ) : null}
                    {e.remarks ? <Text style={s.eventRemarks}>{e.remarks}</Text> : null}
                  </View>
                ))
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  help: { fontSize: 12, color: COLORS.textMuted, marginTop: spacing.xs },
  summaryLine: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  summarySub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginBottom: spacing.sm },
  eventRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  eventTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: COLORS.text },
  eventSub: { fontSize: fontSize.xs, color: COLORS.textMuted, marginTop: 2 },
  eventRemarks: { fontSize: fontSize.xs, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
});
