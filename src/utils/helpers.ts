import { ObstacleState, GPSLocation } from '../types';
import { OBSTACLE_THRESHOLDS } from './constants';

export function getObstacleSeverity(distance: number | null): ObstacleState['severity'] {
  if (distance === null) return 'unknown';
  if (distance > OBSTACLE_THRESHOLDS.SAFE) return 'safe';
  if (distance > OBSTACLE_THRESHOLDS.CAUTION) return 'caution';
  return 'danger';
}

export function formatDistance(cm: number | null): string {
  if (cm === null) return '--';
  if (cm >= 100) return `${(cm / 100).toFixed(1)} m`;
  return `${Math.round(cm)} cm`;
}

export function formatTimeAgo(timestamp: number | null): string {
  if (timestamp === null) return '--';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function isStale(timestamp: number | null, thresholdMs: number): boolean {
  if (timestamp === null) return true;
  return Date.now() - timestamp > thresholdMs;
}

export function buildMapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function formatSOSTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function haversineDistanceMeters(a: GPSLocation, b: GPSLocation): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function decodeUint8(value: number[]): number {
  return value[0];
}

export function decodeUint16LE(value: number[]): number {
  return value[0] | (value[1] << 8);
}

export function decodeString(value: number[]): string {
  return String.fromCharCode(...value);
}

export function decodeBool(value: number[]): boolean {
  return value[0] === 1;
}
