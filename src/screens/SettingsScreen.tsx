import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCane } from '../context/CaneContext';
import { EmergencyContact } from '../types';
import { Colors, Spacing, Shadows, BorderRadius } from '../utils/theme';

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function SettingIcon({ symbol, bg }: { symbol: string; bg: string }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>{symbol}</Text>
    </View>
  );
}

function ListRow({
  icon, iconNode, label, value, onPress, accent, last,
}: {
  icon?: string; iconNode?: React.ReactNode; label: string; value?: string; onPress?: () => void; accent?: boolean; last?: boolean;
}) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      {iconNode ? iconNode : <Text style={styles.rowIcon}>{icon}</Text>}
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, accent && { color: Colors.accent }]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {onPress && <Text style={styles.chevron}>›</Text>}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export default function SettingsScreen() {
  const { userName, emergencyContacts, piIP, battery, ble, updateSettings } = useCane();
  const insets = useSafeAreaInsets();

  const [editField, setEditField] = useState<'name' | 'ip' | 'contact' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editContact, setEditContact] = useState<EmergencyContact | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);

  function openEdit(field: 'name' | 'ip', current: string) {
    setEditField(field);
    setEditValue(current);
  }

  function saveEdit() {
    if (editField === 'name') updateSettings({ userName: editValue.trim() || userName });
    if (editField === 'ip') updateSettings({ piIP: editValue.trim() || piIP });
    setEditField(null);
  }

  function openContactEdit(contact?: EmergencyContact) {
    setEditContact(contact ?? null);
    setContactName(contact?.name ?? '');
    setContactPhone(contact?.phone ?? '');
    setContactPrimary(contact?.isPrimary ?? false);
    setEditField('contact');
  }

  function saveContact() {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    let updated: EmergencyContact[];
    if (editContact) {
      updated = emergencyContacts.map(c =>
        c.id === editContact.id
          ? { ...c, name: contactName.trim(), phone: contactPhone.trim(), isPrimary: contactPrimary }
          : contactPrimary ? { ...c, isPrimary: false } : c
      );
    } else {
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name: contactName.trim(),
        phone: contactPhone.trim(),
        isPrimary: contactPrimary || emergencyContacts.length === 0,
      };
      updated = contactPrimary
        ? [...emergencyContacts.map(c => ({ ...c, isPrimary: false })), newContact]
        : [...emergencyContacts, newContact];
    }
    updateSettings({ emergencyContacts: updated });
    setEditField(null);
  }

  function deleteContact(id: string) {
    Alert.alert('Remove contact?', 'This contact will no longer receive SOS alerts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => updateSettings({ emergencyContacts: emergencyContacts.filter(c => c.id !== id) }),
      },
    ]);
  }

  const initials = userName ? userName[0].toUpperCase() : 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]} showsVerticalScrollIndicator={false}>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileSub}>Smart Cane User</Text>
        </View>
      </View>

      {/* Cane Device */}
      <SectionLabel text="CANE DEVICE" />
      <SettingGroup>
        <ListRow iconNode={<SettingIcon symbol="IP" bg="#5B8DEF" />} label="Cane IP Address" value={piIP} onPress={() => openEdit('ip', piIP)} />
        <ListRow iconNode={<SettingIcon symbol="BT" bg="#6C5CE7" />} label="BLE Device" value={ble.deviceName ?? 'Not connected'} />
        <ListRow iconNode={<SettingIcon symbol="⚡" bg="#00B894" />} label="Battery" value={battery !== null ? `${battery}%` : '--'} last />
      </SettingGroup>

      {/* Profile */}
      <SectionLabel text="PROFILE" />
      <SettingGroup>
        <ListRow iconNode={<View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#FDCB6E', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#222', fontSize: 15, fontWeight: '600' }}>P</Text></View>} label="Your Name" value={userName} onPress={() => openEdit('name', userName)} last />
      </SettingGroup>

      {/* Emergency Contacts */}
      <SectionLabel text="EMERGENCY CONTACTS" />
      <SettingGroup>
        {emergencyContacts.map((c, i) => (
          <ListRow
            key={c.id}
            iconNode={c.isPrimary ? <SettingIcon symbol="★" bg="#FF385C" /> : <SettingIcon symbol="☆" bg="#b2bec3" />}
            label={c.name}
            value={`${c.phone}${c.isPrimary ? '  · Primary' : ''}`}
            onPress={() => openContactEdit(c)}
            last={i === emergencyContacts.length - 1 && false}
          />
        ))}
        <ListRow
          iconNode={<SettingIcon symbol="+" bg="#FF385C" />}
          label="Add Emergency Contact"
          onPress={() => openContactEdit()}
          accent
          last
        />
      </SettingGroup>

      {/* Edit field modal */}
      <Modal
        visible={editField === 'name' || editField === 'ip'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editField === 'name' ? 'Your Name' : 'Cane IP Address'}
            </Text>
            <TextInput
              style={styles.sheetInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={editField === 'name' ? 'e.g. Margaret' : '192.168.1.100'}
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={saveEdit} activeOpacity={0.85}>
              <Text style={styles.sheetSaveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setEditField(null)}>
              <Text style={styles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contact edit modal */}
      <Modal
        visible={editField === 'contact'}
        transparent
        animationType="slide"
        onRequestClose={() => setEditField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.sheetInput}
              value={contactName}
              onChangeText={setContactName}
              placeholder="e.g. Linda Chen"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.sheetInput}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+1 (613) 555-0198"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.primaryRow}
              onPress={() => setContactPrimary(!contactPrimary)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, contactPrimary && styles.checkboxActive]}>
                {contactPrimary && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={styles.primaryLabel}>Set as primary contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={saveContact} activeOpacity={0.85}>
              <Text style={styles.sheetSaveBtnText}>Save Contact</Text>
            </TouchableOpacity>
            {editContact && (
              <TouchableOpacity onPress={() => { setEditField(null); deleteContact(editContact.id); }} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Remove Contact</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setEditField(null)}>
              <Text style={styles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing.xl,
    ...Shadows.level1,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accentBg, alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 24, fontWeight: '700', color: Colors.accent },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  profileSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  group: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    overflow: 'hidden', ...Shadows.level1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: 14, gap: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowValue: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.xl,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xl },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  sheetInput: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    padding: Spacing.lg, fontSize: 16, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  sheetSaveBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
  },
  sheetSaveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  sheetCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 8,
  },
  sheetCancelBtnText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  checkboxMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  primaryLabel: { fontSize: 15, color: Colors.textPrimary },
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  deleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '500' },
});
