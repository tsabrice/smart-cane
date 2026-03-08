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
      { text: 'Remove', style: 'destructive', onPress: () => confirmDelete() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      'Remove Person',
      `${face.name} will no longer be recognized by the cane.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDelete(face.name) },
      ]
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={handleMenu} activeOpacity={0.6}>
      <View style={styles.avatar}>
        {face.thumbnail ? (
          <Image source={{ uri: `data:image/jpeg;base64,${face.thumbnail}` }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.initial}>{face.name[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{face.name}</Text>
        <Text style={styles.meta}>{face.relationship} · Added {face.addedAt}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  avatar: { marginRight: 16 },
  image: { width: 56, height: 56, borderRadius: 28 },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  initial: { fontSize: 22, fontWeight: '600', color: '#717171' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222222' },
  meta: { fontSize: 13, color: '#717171', marginTop: 2 },
  chevron: { fontSize: 24, color: '#CCCCCC', fontWeight: '300' },
});
