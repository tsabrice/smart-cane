import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
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
        ListHeaderComponent={
          registeredFaces.length > 0
            ? <Text style={styles.listHeader}>{registeredFaces.length} {registeredFaces.length === 1 ? 'person' : 'people'} registered</Text>
            : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☺</Text>
            <Text style={styles.emptyTitle}>No one registered yet</Text>
            <Text style={styles.emptySubtitle}>Add people so the cane can recognize and announce them.</Text>
          </View>
        }
      />

      {/* Add Person Button */}
      <View style={styles.addBtnWrap}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setStep('camera')} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Add Person</Text>
        </TouchableOpacity>
      </View>

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
              <View style={styles.cameraOverlay}>
                <View style={styles.ovalGuide} />
                <Text style={styles.cameraHint}>Center your face in the oval</Text>
                <View style={styles.photoCountWrap}>
                  <Text style={styles.photoCount}>{capturedPhotos.length}</Text>
                  <Text style={styles.photoCountOf}> / 5 photos</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={resetFlow}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Step */}
          {step === 'form' && (
            <View style={styles.formContainer}>
              <TouchableOpacity onPress={resetFlow} style={styles.backBtn}>
                <Text style={styles.backBtnText}>‹ Back</Text>
              </TouchableOpacity>
              <Text style={styles.formTitle}>Add details</Text>
              <Text style={styles.formSubtitle}>{capturedPhotos.length} photos captured</Text>

              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor="#BBBBBB"
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
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, relationship === r && styles.pillTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
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
              {step === 'uploading' && <ActivityIndicator size="large" color="#222222" />}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { paddingBottom: 100 },
  listHeader: {
    fontSize: 12, fontWeight: '500', color: '#AAAAAA',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB',
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16, color: '#CCCCCC' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222222', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', lineHeight: 21 },
  addBtnWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB',
  },
  addBtn: {
    backgroundColor: '#222222', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  modal: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalGuide: {
    width: 220, height: 280, borderRadius: 110,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  cameraHint: { color: 'rgba(255,255,255,0.8)', marginTop: 20, fontSize: 15, fontWeight: '500' },
  photoCountWrap: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  photoCount: { color: '#FFFFFF', fontSize: 36, fontWeight: '700' },
  photoCountOf: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  closeBtn: { position: 'absolute', top: 52, left: 20, padding: 8 },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  formContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 60 },
  backBtn: { marginBottom: 24 },
  backBtnText: { fontSize: 17, color: '#222222', fontWeight: '500' },
  formTitle: { fontSize: 26, fontWeight: '700', color: '#222222', marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: '#AAAAAA', marginBottom: 32 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input: {
    backgroundColor: '#F7F7F7', borderRadius: 12, padding: 16,
    fontSize: 16, color: '#222222',
    borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 28,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 36 },
  pill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#EBEBEB' },
  pillActive: { backgroundColor: '#222222', borderColor: '#222222' },
  pillText: { color: '#717171', fontWeight: '500', fontSize: 14 },
  pillTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#222222', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  cancelLink: { alignItems: 'center', marginTop: 16, padding: 8 },
  cancelLinkText: { color: '#AAAAAA', fontSize: 15 },
  progressContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 40 },
  progressText: { fontSize: 18, fontWeight: '600', color: '#222222', textAlign: 'center' },
  progressDone: { color: '#00A699' },
  progressError: { color: '#FF385C' },
  retryBtn: { marginTop: 8, backgroundColor: '#222222', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
