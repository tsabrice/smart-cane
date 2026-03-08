import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RNCamera } from 'react-native-camera';
import { useCane } from '../context/CaneContext';
import { getRegisteredFaces, uploadFacePhotos, deleteFace, waitForEncodingComplete, checkPiReachable, setPiIP } from '../services/WiFiService';
import { FaceRegistrationStep, RegisteredFace } from '../types';
import { Colors, Spacing, Shadows, BorderRadius } from '../utils/theme';

const RELATIONSHIP_OPTIONS = ['Family', 'Friend', 'Caregiver', 'Other'];
const FILTER_OPTIONS = ['All', ...RELATIONSHIP_OPTIONS];

function SearchIcon() {
  return (
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 2, height: 6, backgroundColor: Colors.textMuted, borderRadius: 1, marginTop: 3, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

function EmptyIcon() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.border }} />
        <View style={{ width: 32, height: 14, borderRadius: 8, backgroundColor: Colors.border, marginTop: 4 }} />
      </View>
    </View>
  );
}

export default function FacesScreen() {
  const { registeredFaces, setRegisteredFaces, piIP } = useCane();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<FaceRegistrationStep>('idle');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [uploadProgress, setUploadProgress] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const cameraRef = useRef<RNCamera | null>(null);

  useEffect(() => {
    setPiIP(piIP);
    refreshFaces();
  }, [piIP]);

  async function refreshFaces() {
    try {
      const faces = await getRegisteredFaces();
      setRegisteredFaces(faces);
    } catch { }
  }

  async function capturePhoto() {
    if (!cameraRef.current || capturedPhotos.length >= 5) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true, width: 800 });
    if (!photo.base64) return;
    const updated = [...capturedPhotos, photo.base64];
    setCapturedPhotos(updated);
    if (updated.length >= 5) setStep('form');
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this person.');
      return;
    }
    const reachable = await checkPiReachable();
    if (!reachable) {
      Alert.alert('Cane unreachable', 'Connect your phone to the same Wi-Fi as the cane.');
      return;
    }
    setStep('uploading');
    setUploadProgress('Uploading photos...');
    const result = await uploadFacePhotos({ name: name.trim(), relationship, photos: capturedPhotos });
    if (!result.success) {
      setStep('error');
      setUploadProgress(result.error ?? 'Upload failed');
      return;
    }
    setUploadProgress('Generating face encoding...');
    const done = await waitForEncodingComplete();
    if (!done) {
      setStep('error');
      setUploadProgress('Encoding timed out. Try again.');
      return;
    }
    setUploadProgress('Done!');
    setStep('done');
    await refreshFaces();
    setTimeout(() => resetFlow(), 2000);
  }

  function resetFlow() {
    setStep('idle');
    setCapturedPhotos([]);
    setName('');
    setRelationship('Family');
    setUploadProgress('');
  }

  async function handleDelete(faceName: string) {
    Alert.alert('Remove person?', `${faceName} will no longer be recognized by the cane.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const ok = await deleteFace(faceName);
          if (ok) setRegisteredFaces(registeredFaces.filter(f => f.name !== faceName));
          else Alert.alert('Delete failed', 'Could not reach the cane. Try again.');
        },
      },
    ]);
  }

  const filtered = registeredFaces.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || f.relationship === filter;
    return matchSearch && matchFilter;
  });

  function FaceRow({ face }: { face: RegisteredFace }) {
    const initial = face.name[0]?.toUpperCase() ?? '?';
    return (
      <TouchableOpacity style={styles.faceRow} onLongPress={() => handleDelete(face.name)} activeOpacity={0.7}>
        <View style={styles.faceAvatar}>
          <Text style={styles.faceAvatarText}>{initial}</Text>
        </View>
        <View style={styles.faceInfo}>
          <Text style={styles.faceName}>{face.name}</Text>
          <Text style={styles.faceSub}>{face.relationship}  ·  Added {face.addedAt}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.searchWrap}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterPill, filter === opt && styles.filterPillActive]}
            onPress={() => setFilter(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === opt && styles.filterPillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.divider} />

      <FlatList
        data={filtered}
        keyExtractor={f => f.name}
        renderItem={({ item }) => <FaceRow face={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          filtered.length > 0
            ? <Text style={styles.listHeader}>{filtered.length} {filtered.length === 1 ? 'person' : 'people'}</Text>
            : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <EmptyIcon />
            <Text style={styles.emptyTitle}>No one registered yet</Text>
            <Text style={styles.emptySubtitle}>Add people so the cane can recognize and announce them.</Text>
          </View>
        }
      />

      <View style={[styles.addBtnWrap, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setStep('camera')} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Register New Face</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={step !== 'idle'} animationType="slide" onRequestClose={resetFlow}>
        <View style={styles.modal}>

          {(step === 'camera' || step === 'capturing') && (
            <View style={{ flex: 1 }}>
              <RNCamera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                type={RNCamera.Constants.Type.front}
                onFacesDetected={capturePhoto as any}
                faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.fast}
              />
              <View style={styles.cameraOverlay}>
                <View style={styles.ovalGuide} />
                <Text style={styles.cameraHint}>Center your face in the oval</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>{capturedPhotos.length}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}> / 5 photos</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={resetFlow}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'form' && (
            <View style={styles.formContainer}>
              <TouchableOpacity onPress={resetFlow} style={{ marginBottom: Spacing.xl }}>
                <Text style={{ fontSize: 17, color: Colors.textPrimary, fontWeight: '500' }}>‹ Back</Text>
              </TouchableOpacity>
              <Text style={styles.formTitle}>Add details</Text>
              <Text style={styles.formSubtitle}>{capturedPhotos.length} photos captured</Text>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <Text style={styles.fieldLabel}>Relationship</Text>
              <View style={styles.pillRow}>
                {RELATIONSHIP_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.relPill, relationship === r && styles.relPillActive]}
                    onPress={() => setRelationship(r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.relPillText, relationship === r && styles.relPillTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save & Sync to Cane</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', marginTop: 16, padding: 8 }} onPress={resetFlow}>
                <Text style={{ color: Colors.textMuted, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {(step === 'uploading' || step === 'done' || step === 'error') && (
            <View style={styles.progressContainer}>
              {step === 'uploading' && <ActivityIndicator size="large" color={Colors.accent} />}
              <Text style={[
                styles.progressText,
                step === 'done' && { color: Colors.safe },
                step === 'error' && { color: Colors.danger },
              ]}>
                {uploadProgress}
              </Text>
              {step === 'error' && (
                <TouchableOpacity style={styles.retryBtn} onPress={resetFlow}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  filterPill: {
    borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  filterPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterPillText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  filterPillTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: Colors.divider },
  list: { paddingBottom: 100 },
  listHeader: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 72 },
  faceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  faceAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.accentBg, alignItems: 'center', justifyContent: 'center',
  },
  faceAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  faceInfo: { flex: 1 },
  faceName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  faceSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16, color: Colors.border },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21 },
  addBtnWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingTop: 16,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  addBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  modal: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ovalGuide: { width: 220, height: 280, borderRadius: 110, borderWidth: 2.5, borderColor: Colors.accent + 'DD' },
  cameraHint: { color: 'rgba(255,255,255,0.85)', marginTop: 20, fontSize: 15, fontWeight: '500' },
  closeBtn: { position: 'absolute', top: 52, left: 20, padding: 8 },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  formContainer: { flex: 1, backgroundColor: Colors.surface, paddingHorizontal: Spacing.xl, paddingTop: 60 },
  formTitle: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32 },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: Spacing.lg, fontSize: 16, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 28,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 36 },
  relPill: { borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  relPillActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  relPillText: { color: Colors.textMuted, fontWeight: '500', fontSize: 14 },
  relPillTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  progressContainer: { flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 40 },
  progressText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
