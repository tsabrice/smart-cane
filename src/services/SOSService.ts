import SendSMS from 'react-native-sms';
import { EmergencyContact, GPSLocation } from '../types';
import { buildMapsUrl, formatSOSTime } from '../utils/helpers';
import { getEmergencyContacts } from './StorageService';

export interface SOSResult {
  contact: EmergencyContact;
  sent: boolean;
}

export async function triggerSOS(
  userName: string,
  gps: GPSLocation | null,
  onContactNotified: (contactName: string) => void
): Promise<SOSResult[]> {
  const contacts = await getEmergencyContacts();
  if (contacts.length === 0) return [];

  const results: SOSResult[] = [];

  for (const contact of contacts) {
    const body = buildSOSMessage(userName, gps);
    const sent = await sendSMS(contact.phone, body);
    if (sent) onContactNotified(contact.name);
    results.push({ contact, sent });
  }

  return results;
}

function buildSOSMessage(userName: string, gps: GPSLocation | null): string {
  const timeStr = formatSOSTime(Date.now());
  if (gps) {
    const mapsUrl = buildMapsUrl(gps.lat, gps.lng);
    return (
      `EMERGENCY: ${userName} has triggered an SOS alert.\n` +
      `Location: ${mapsUrl}\n` +
      `Time: ${timeStr}`
    );
  }
  return (
    `EMERGENCY: ${userName} has triggered an SOS alert.\n` +
    `Location: unavailable\n` +
    `Time: ${timeStr}`
  );
}

function sendSMS(phone: string, body: string): Promise<boolean> {
  return new Promise((resolve) => {
    SendSMS.send(
      {
        body,
        recipients: [phone],
        successTypes: ['sent', 'queued'],
        allowAndroidSendWithoutReadPermission: true,
      },
      (completed, cancelled, error) => {
        resolve(completed && !error);
      }
    );
  });
}

export async function callPrimaryContact(contacts: EmergencyContact[]): Promise<void> {
  const primary = contacts.find(c => c.isPrimary) ?? contacts[0];
  if (!primary) return;
  const { Linking } = require('react-native');
  await Linking.openURL(`tel:${primary.phone}`);
}
