import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Alert, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '@/src/core/api/client';

const SECTIONS = [
  { label: 'Field Reject', value: 'field_reject' },
  { label: 'Receiving Reject', value: 'receiving_reject' },
  { label: 'Grading Reject', value: 'grading_reject' },
];

export default function IntakeQcTab() {
  const [section, setSection] = useState('receiving_reject');
  const [refId, setRefId] = useState('');
  const [variety, setVariety] = useState('');
  const [farm, setFarm] = useState('');
  const [greenhouse, setGreenhouse] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [farms, setFarms] = useState<string[]>([]);
  const [farmPickerOpen, setFarmPickerOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupNote, setLookupNote] = useState('');

  useEffect(() => {
    const loadFarms = async () => {
      try {
        const res = await api({
          method: 'GET',
          url: '/api/method/frappe.client.get_list',
          params: {
            doctype: 'Farm',
            fields: JSON.stringify(['name']),
            filters: JSON.stringify([['company', 'in', ['XPRESSIONS FLORA LIMITED', 'AFRICA BLOOMS LIMITED', 'BLOOM VALLEY LIMITED', 'SOJANMI SPRINGFIELDS LIMITED']]]),
            limit_page_length: 100,
            order_by: 'name asc',
          },
          validateStatus: () => true,
        }) as any;
        const list = res.message ?? [];
        setFarms(list.map((f: any) => f.name));
      } catch {}
    };
    loadFarms();
  }, []);

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
    let bucketId = data.trim();
    if (bucketId.startsWith('{')) {
      try {
        const parsed = JSON.parse(bucketId);
        bucketId = parsed.bucket_id || parsed.id || parsed.name || bucketId;
      } catch {}
    }
    setRefId(bucketId);
    lookupBucket(bucketId);
  };

  const lookupBucket = async (bucketId: string) => {
    if (!bucketId.trim()) return;
    setLookupLoading(true);
    setLookupNote('');
    try {
      const res = await api({
        method: 'POST',
        url: '/api/method/get_bucket_details',
        data: { bucket_id: bucketId.trim() },
        validateStatus: () => true,
      }) as any;
      const details = res.message;
      if (res.error || !details || !details.found) {
        setLookupNote('No details found for this bucket — fill in manually.');
      } else {
        if (details.variety) setVariety(details.variety);
        if (details.greenhouse) setGreenhouse(details.greenhouse);
        if (details.farm && farms.includes(details.farm)) setFarm(details.farm);
        setLookupNote(`Auto-filled from ${details.found_via === 'stock_entry' ? 'receiving record' : 'bucket registration'}.`);
      }
    } catch {
      setLookupNote('Lookup failed — fill in manually.');
    } finally {
      setLookupLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
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
        Alert.alert('Error', res.error || 'Failed to record reject entry.');
      } else {
        Alert.alert('Success', res.message || 'Reject entry recorded!');
        setRefId(''); setVariety(''); setQuantity(''); setReason(''); setNotes(''); setFarm(''); setGreenhouse('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Text style={s.title}>Intake QC</Text>

        <View style={s.card}>
          <Text style={s.label}>REJECT TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {SECTIONS.map((sec) => (
              <Pressable key={sec.value} onPress={() => setSection(sec.value)}
                style={[s.chip, section === sec.value && s.chipActive]}>
                <Text style={[s.chipText, section === sec.value && s.chipTextActive]}>{sec.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.label}>BUCKET REFERENCE</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput value={refId} onChangeText={setRefId} onBlur={() => lookupBucket(refId)} placeholder="e.g. BUCKET-11502"
              autoCapitalize="characters" style={[s.input, { flex: 1, marginTop: 0 }]} />
            <Pressable onPress={openScanner} style={s.scanBtn}>
              <Text style={s.scanBtnText}>📷 Scan</Text>
            </Pressable>
          </View>
          {lookupLoading ? <Text style={s.lookupNote}>Looking up bucket…</Text> : null}
          {!lookupLoading && lookupNote ? <Text style={s.lookupNote}>{lookupNote}</Text> : null}
        </View>

        <View style={s.card}>
          <Text style={s.label}>DETAILS</Text>
          <TextInput value={variety} onChangeText={setVariety} placeholder="Variety (auto-fills from bucket ref)" style={[s.input, { marginBottom: 8 }]} />

          <Text style={[s.label, { marginTop: 8 }]}>FARM</Text>
          <Pressable onPress={() => setFarmPickerOpen(true)} style={[s.input, { marginTop: 4, justifyContent: 'center' }]}>
            <Text style={{ fontSize: 14, color: farm ? '#000' : '#999' }}>{farm || 'Select farm...'}</Text>
          </Pressable>

          <TextInput value={greenhouse} onChangeText={setGreenhouse} placeholder="Greenhouse" style={[s.input, { marginBottom: 8, marginTop: 8 }]} />
          <TextInput value={quantity} onChangeText={setQuantity} placeholder="Quantity (stems)"
            keyboardType="number-pad" style={s.input} />
        </View>

        <View style={s.card}>
          <Text style={s.label}>REASON & NOTES</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="Reason for rejection" style={[s.input, { marginBottom: 8 }]} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Additional notes (optional)"
            multiline numberOfLines={3} style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} />
        </View>

        <Pressable style={[s.button, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
          <Text style={s.buttonText}>{submitting ? 'Submitting...' : 'SUBMIT REJECT'}</Text>
        </Pressable>
      </ScrollView>

      {/* Farm Picker Modal */}
      <Modal visible={farmPickerOpen} animationType="slide" onRequestClose={() => setFarmPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Select Farm</Text>
            <Pressable onPress={() => setFarmPickerOpen(false)}>
              <Text style={s.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
          <FlatList
            data={farms}
            keyExtractor={(item) => item}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => { setFarm(item); setFarmPickerOpen(false); }} style={s.modalRow}>
                <Text style={s.modalRowText}>{item}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={{ padding: 16, color: '#999' }}>Loading farms...</Text>}
          />
        </View>
      </Modal>

      {/* Camera Scanner Modal */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned} />
          <View style={{ padding: 24, backgroundColor: '#000' }}>
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 14, marginBottom: 16 }}>
              Point camera at the bucket QR code
            </Text>
            <Pressable onPress={() => setScanning(false)} style={[s.button, { backgroundColor: '#333' }]}>
              <Text style={s.buttonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  label: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.4 },
  lookupNote: { fontSize: 12, color: '#666', marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f0f0f0' },
  chipActive: { borderColor: '#000', backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#999' },
  chipTextActive: { color: '#000' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, marginTop: 8 },
  scanBtn: { backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  scanBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  button: { backgroundColor: '#000', borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalCancel: { fontSize: 16, color: '#666' },
  modalRow: { padding: 16 },
  modalRowText: { fontSize: 16 },
});
