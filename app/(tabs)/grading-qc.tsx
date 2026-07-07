import { Text, TextInput, Pressable, Alert, Modal, View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { LabeledInput } from '@/src/core/ui/LabeledInput';
import { COLORS, fontFamily, fontSize, spacing, borderRadius } from '@/src/core/theme';
import { api } from '@/src/core/api/client';

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

export default function GradingQcTab() {
  const [bunchId, setBunchId] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setScanned(false);
    setScanning(true);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(false);
    let id = data.trim();
    if (id.startsWith('{')) {
      try {
        const parsed = JSON.parse(id);
        id = parsed.bunch_id || parsed.id || parsed.name || id;
      } catch {}
    }
    setBunchId(id);
  };

  const toggleReason = (r: string) => {
    setSelectedReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const onSubmit = async () => {
    if (!bunchId.trim()) {
      Alert.alert('Error', 'Please scan or enter a bunch reference.');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (selectedReasons.length === 0) {
      Alert.alert('Error', 'Please select at least one reason for rejection.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api({
        method: 'POST',
        url: '/api/method/create_quality_entry',
        data: {
          section: 'grading_reject',
          quantity: parseInt(quantity),
          reason: selectedReasons.join(', '),
          ref_id: bunchId,
        },
        validateStatus: () => true,
      }) as any;
      if (res.error || (res.http_status_code && res.http_status_code >= 400)) {
        Alert.alert('Error', res.error || 'Failed to record reject entry.');
      } else {
        Alert.alert('Success', res.message || 'Reject entry recorded!');
        setBunchId(''); setQuantity(''); setSelectedReasons([]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Grading">
      <Card>
        <Text style={s.section}>BUNCH REFERENCE</Text>
        <View style={{ height: spacing.sm }} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <TextInput
            value={bunchId}
            onChangeText={setBunchId}
            placeholder="e.g. BUNCH-16656"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            style={s.input}
          />
          <Pressable onPress={openScanner} style={s.scanBtn}>
            <Ionicons name="camera-outline" size={20} color={COLORS.textOnPrimary} />
          </Pressable>
        </View>
      </Card>

      <Card>
        <Text style={s.section}>REASON(S) FOR REJECTION</Text>
        <View style={{ height: spacing.sm }} />
        <View style={s.chipRow}>
          {REASONS.map((r) => {
            const active = selectedReasons.includes(r);
            return (
              <Text key={r} onPress={() => toggleReason(r)} style={[s.chip, active && s.chipActive]}>
                {active ? '✓ ' : ''}{r}
              </Text>
            );
          })}
        </View>
      </Card>

      <Card>
        <LabeledInput
          label="Quantity of stems"
          iconName="counter"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Quantity (stems)"
          keyboardType="number-pad"
        />
      </Card>

      <Button label={submitting ? 'Submitting…' : 'Submit Reject'} loading={submitting} onPress={onSubmit} />

      {/* Camera Scanner Modal */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned} />
          <View style={{ padding: spacing.xl, backgroundColor: '#000' }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 14, marginBottom: spacing.lg }}>
              Point camera at the bunch QR code
            </Text>
            <Button label="Cancel" onPress={() => setScanning(false)} color="#333" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  section: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 12, overflow: 'hidden' },
  chipActive: { backgroundColor: COLORS.text, color: '#FFFFFF', borderColor: COLORS.text },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: spacing.md,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
