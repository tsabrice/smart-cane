import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
// react-native-camera stubbed for emulator — add back for production build
const RNCamera = { Constants: { Type: { front: 'front' }, FaceDetection: { Mode: { fast: 'fast' } } } } as any;
import { useCane } from '../context/CaneContext';
import FaceCard from '../components/FaceCard';
import { getRegisteredFaces, uploadFacePhotos, deleteFace, waitForEncodingComplete, checkPiReachable } from '../services/WiFiService';
import { setPiIP } from '../services/WiFiService';
import { FaceRegistrationStep, RegisteredFace } from '../types';

const RELATIONSHIP_OPTIONS = ['Family', 'Friend', 'Caregiver', 'Other'];

export default function FacesScreen() {
  const { registeredFaces, setRegisteredFaces, piIP } = useCane();
  const [step, setStep] = useState<FaceRegistrationStep>('idle');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [uploadProgress, setUploadProgress] = useState('');
  const cameraRef = useRef<RNCamera | null>(null);

  useEffect(() => {
    setPiIP(piIP);
    refreshFaces();
  }, [piIP]);

  async function refreshFaces() {
    try {
      const faces = await getRegisteredFaces();
      setRegisteredFaces(faces);
    } catch {
      // Silently fail if Pi unreachable — show stale list
    }
  }

  // ─── Camera capture (auto-detect face, 5 shots) ───────────────────────────

  async function capturePhoto() {
    if (!cameraRef.current || capturedPhotos.length >= 5) return;
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.6,
      base64: true,
      width: 800,
    });
    if (!photo.base64) return;
    const updated = [...capturedPhotos, photo.base64];
    setCapturedPhotos(updated);
    if (updated.length >= 5) setStep('form');
  }

  // ─── Upload flow ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this person.');
      return;
    }

    const reachable = await checkPiReachable();
    if (!reachable) {
      Alert.alert('Cane unreachable', 'Connect your phone to the same Wi-Fi network as the cane.');
      return;
    }

    setStep('uploading');
    setUploadProgress('Uploading photos...');

    const result = await uploadFacePhotos({
      name: name.trim(),
      relationship,
      photos: capturedPhotos,
    });

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
    const ok = await deleteFace(faceName);
    if (ok) {
      setRegisteredFaces(registeredFaces.filter(f => f.name !== faceName));
    } else {
      Alert.alert('Delete failed', 'Could not reach the cane. Try again.');
    }
  }

  function handleRename(face: RegisteredFace) {
    // Simple rename flow via alert prompt
    Alert.prompt('Rename', `Enter new name for ${face.name}:`, async (newName) => {
      if (!newName?.trim()) return;
      // For hackathon: delete + re-register with new name is complex.
      // Instead just update the display name locally and note it's UI-only.
      setRegisteredFaces(
        registeredFaces.map(f => f.name === face.name ? { ...f, name: newName.trim() } : f)
      );
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <FlatList
        data={registeredFaces}
        keyExtractor={f => f.name}
        renderItem={({ item }) => (
          <FaceCard face={item} onDelete={handleDelete} onRename={handleRename} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No faces registered yet. Tap + to add one.</Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setStep('camera')}>
        <Text style={styles.fabText}>+ Add Face</Text>
      </TouchableOpacity>

      {/* Registration Modal */}
      <Modal visible={step !== 'idle'} animationType="slide" onRequestClose={resetFlow}>
        <View style={styles.modal}>

          {/* Camera Step */}
          {(step === 'camera' || step === 'capturing') && (
            <View style={{ flex: 1 }}>
              <RNCamera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                type={RNCamera.Constants.Type.front}
                onFacesDetected={capturePhoto as any}
                faceDetectionMode={RNCamera.Constants.FaceDetection.Mode.fast}
              />
              {/* Oval guide overlay */}
              <View style={styles.cameraOverlay}>
                <View style={styles.ovalGuide} />
                <Text style={styles.cameraHint}>Center your face</Text>
                <Text style={styles.photoCount}>{capturedPhotos.length} / 5</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={resetFlow}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Step */}
          {step === 'form' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <Text style={styles.fieldLabel}>Relationship</Text>
              <View style={styles.pillRow}>
                {RELATIONSHIP_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pill, relationship === r && styles.pillActive]}
                    onPress={() => setRelationship(r)}
                  >
                    <Text style={[styles.pillText, relationship === r && styles.pillTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.photosConfirm}>{capturedPhotos.length} photos captured</Text>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save & Sync to Cane</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelLink} onPress={resetFlow}>
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload / Done / Error */}
          {(step === 'uploading' || step === 'done' || step === 'error') && (
            <View style={styles.progressContainer}>
              {step === 'uploading' && <ActivityIndicator size="large" color="#3b82f6" />}
              <Text style={[
                styles.progressText,
                step === 'done' && styles.progressDone,
                step === 'error' && styles.progressError,
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    backgroundColor: '#3b82f6', borderRadius: 28,
    paddingVertical: 14, paddingHorizontal: 22,
    shadowColor: '#3b82f6', shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalGuide: {
    width: 220, height: 280,
    borderRadius: 110,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },
  cameraHint: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '600' },
  photoCount: { color: '#fff', marginTop: 8, fontSize: 28, fontWeight: '700' },
  closeBtn: { position: 'absolute', top: 52, right: 20 },
  closeBtnText: { color: '#fff', fontSize: 16 },
  formContainer: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingTop: 60 },
  formTitle: { fontSize: 24, fontWeight: '700', color: '#1e293b', marginBottom: 24 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 16, color: '#1e293b',
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  pill: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#3b82f6' },
  pillText: { color: '#64748b', fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  photosConfirm: { color: '#94a3b8', fontSize: 13, marginBottom: 28 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', marginTop: 14 },
  cancelLinkText: { color: '#94a3b8', fontSize: 15 },
  progressContainer: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', gap: 20 },
  progressText: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  progressDone: { color: '#22c55e' },
  progressError: { color: '#ef4444' },
  retryBtn: { marginTop: 8, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  retryBtnText: { color: '#fff', fontWeight: '700' },
});
