import React from 'react';
import { Bell, Check, Trash2, X, AlertTriangle, ShieldCheck, Truck, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationAsRead, clearAllNotifications } = useApp();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'emergency':
      case 'reroute':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'ambulance':
        return <Truck className="w-4 h-4 text-brand-500" />;
      case 'queue':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-400" />
              <h3 className="font-bold text-sm">System Event Stream</h3>
              <span className="px-2 py-0.5 text-[10px] bg-brand-500/30 text-brand-300 font-bold rounded-full">
                {notifications.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  title="Clear all"
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No active notifications.
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl transition ${
                    notif.read ? 'bg-white opacity-80' : 'bg-slate-50 border border-slate-100 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{notif.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-[10px] text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Real-time event synchronization active • MediFlow AI Protocol
          </div>
        </div>
      </div>
    </div>
  );
};
