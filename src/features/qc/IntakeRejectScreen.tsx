import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Screen } from '@/src/core/ui/Screen';
import { Card } from '@/src/core/ui/Card';
import { Button } from '@/src/core/ui/Button';
import { useToast } from '@/src/core/ui/Toast';
import { COLORS } from '@/src/core/theme';
import { api } from '@/src/core/api/client';

const SECTIONS = [
  { label: 'Field Reject', value: 'field_reject' },
  { label: 'Receiving Reject', value: 'receiving_reject' },
  { label: 'Grading Reject', value: 'grading_reject' },
];

export function IntakeRejectScreen() {
  const { showSuccess, showError } = useToast();
  const [section, setSection] = useState('receiving_reject');
  const [refId, setRefId] = useState('');
  const [variety, setVariety] = useState('');
  const [farm, setFarm] = useState('');
  const [greenhouse, setGreenhouse] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!section || !quantity || parseInt(quantity) <= 0) {
      showError('Please fill in section and quantity.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api({
        method: 'POST',
        url: '/api/method/create_quality_entry',
        data: { section, quantity: parseInt(quantity), reason, notes, farm, greenhouse, variety, ref_id: refId },
        validateStatus: () => true,
      }) as any;
      if (res.error || (res.http_status_code && res.http_status_code >= 400)) {
        showError(res.error || 'Failed to record reject entry.');
      } else {
        showSuccess(res.message || 'Reject entry recorded!');
        setRefId(''); setVariety(''); setQuantity(''); setReason(''); setNotes('');
      }
    } catch (e: any) {
      showError(e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Intake QC">
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
        <Card>
          <Text style={s.sectionLabel}>REJECT TYPE</Text>
          <View style={{ height: 12 }} />
          <View style={s.chipRow}>
            {SECTIONS.map((sec) => (
              <Pressable key={sec.value} onPress={() => setSection(sec.value)} style={[s.chip, section === sec.value && s.chipActive]}>
                <Text style={[s.chipText, section === sec.value && s.chipTextActive]}>{sec.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={s.sectionLabel}>BUCKET REFERENCE</Text>
          <View style={{ height: 12 }} />
          <TextInput value={refId} onChangeText={setRefId} placeholder="e.g. BUCKET-11502" placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" style={s.input} />
        </Card>

        <Card>
          <Text style={s.sectionLabel}>DETAILS</Text>
          <View style={{ height: 12 }} />
          <TextInput value={variety} onChangeText={setVariety} placeholder="Variety (optional if bucket ref given)" placeholderTextColor={COLORS.textMuted} style={[s.input, { marginBottom: 10 }]} />
          <TextInput value={farm} onChangeText={setFarm} placeholder="Farm" placeholderTextColor={COLORS.textMuted} style={[s.input, { marginBottom: 10 }]} />
          <TextInput value={greenhouse} onChangeText={setGreenhouse} placeholder="Greenhouse" placeholderTextColor={COLORS.textMuted} style={[s.input, { marginBottom: 10 }]} />
          <TextInput value={quantity} onChangeText={setQuantity} placeholder="Quantity (stems)" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" style={s.input} />
        </Card>

        <Card>
          <Text style={s.sectionLabel}>REASON & NOTES</Text>
          <View style={{ height: 12 }} />
          <TextInput value={reason} onChangeText={setReason} placeholder="Reason for rejection" placeholderTextColor={COLORS.textMuted} style={[s.input, { marginBottom: 10 }]} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Additional notes (optional)" placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} />
        </Card>

        <Button label={submitting ? 'Submitting...' : 'SUBMIT REJECT'} loading={submitting} onPress={onSubmit} style={{ height: 56 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  sectionLabel: { fontWeight: '700', color: COLORS.textMuted, fontSize: 12, letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgMuted },
  chipActive: { borderColor: COLORS.text, backgroundColor: COLORS.bg },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.bg },
});
