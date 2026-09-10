export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'capacity' | 'queue' | 'ambulance' | 'system' | 'reroute' | 'success' | 'error' | 'info' | 'warning';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}
