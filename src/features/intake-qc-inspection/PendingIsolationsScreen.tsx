import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card, Alert } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS, fontFamily, fontSize, spacing } from '@/src/core/theme';
import { useAuthStore } from '@/src/core/auth/store';
import { useIntakeQcInspectionStore } from './store';

export function PendingIsolationsScreen() {
  const hasRole = useAuthStore((s) => s.hasRole);
  const authorized = hasRole('QC Supervisor');

  const { showSuccess, showError } = useToast();
  const rows = useIntakeQcInspectionStore((s) => s.pendingIsolations);
  const loading = useIntakeQcInspectionStore((s) => s.pendingIsolationsLoading);
  const approving = useIntakeQcInspectionStore((s) => s.approving);
  const loadPendingIsolations = useIntakeQcInspectionStore((s) => s.loadPendingIsolations);
  const approveIsolation = useIntakeQcInspectionStore((s) => s.approveIsolation);

  useEffect(() => {
    if (authorized) loadPendingIsolations();
  }, [authorized, loadPendingIsolations]);

  if (!authorized) {
    return (
      <Screen title="Pending Isolations">
        <Alert tone="warn">You need the QC Supervisor role to review isolation requests.</Alert>
      </Screen>
    );
  }

  const onDecide = async (name: string, action: 'approve' | 'dismiss') => {
    const outcome = await approveIsolation([name], action);
    if (outcome.kind === 'error') showError(outcome.message);
    else showSuccess(action === 'approve' ? 'Lot isolated.' : 'Isolation request dismissed.');
  };

  return (
    <Screen
      title="Pending Isolations"
      loading={loading}
      onRefresh={loadPendingIsolations}
      scroll={false}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {rows.length === 0 && !loading ? (
          <Alert tone="info">No isolation requests waiting for review.</Alert>
        ) : null}
        {rows.map((row) => (
          <Card key={row.name}>
            <Text style={s.bucket}>{row.bucketId}</Text>
            <Text style={s.sub}>
              {row.farm || '—'} · {row.variety || '—'}
            </Text>
            <Text style={s.sub}>Triggered by reject of {row.sourceBucketId || 'unknown bucket'}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button
                label="Dismiss"
                variant="outline"
                onPress={() => onDecide(row.name, 'dismiss')}
                disabled={approving}
                style={{ flex: 1 }}
              />
              <Button
                label="Isolate"
                onPress={() => onDecide(row.name, 'approve')}
                disabled={approving}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  bucket: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: COLORS.text },
  sub: { fontSize: fontSize.sm, color: COLORS.textMuted, marginTop: 2 },
});
