import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RegisteredFace } from '../types';

interface Props {
  face: RegisteredFace;
  onDelete: (name: string) => void;
  onRename: (face: RegisteredFace) => void;
}

export default function FaceCard({ face, onDelete, onRename }: Props) {
  function handleMenu() {
    Alert.alert(face.name, '', [
      { text: 'Rename', onPress: () => onRename(face) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Face',
      `Remove ${face.name} from the cane? They will no longer be recognized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(face.name) },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        {face.thumbnail ? (
          <Image source={{ uri: `data:image/jpeg;base64,${face.thumbnail}` }} style={styles.image} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{face.name[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{face.name}</Text>
        <Text style={styles.relationship}>{face.relationship}</Text>
        <Text style={styles.date}>Added {face.addedAt}</Text>
      </View>
      <TouchableOpacity onPress={handleMenu} style={styles.menuBtn} hitSlop={12}>
        <Text style={styles.menuDots}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    marginRight: 14,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#64748b',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  relationship: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  menuBtn: {
    paddingHorizontal: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#94a3b8',
    letterSpacing: 2,
  },
});
