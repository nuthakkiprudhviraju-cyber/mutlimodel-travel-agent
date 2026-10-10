import React from 'react';
import { Notification } from '../../types';
import { api } from '../../services/api';
import { Bell, Check, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface NotifProps {
  notifications: Notification[];
  onRefresh: () => void;
}

export const NotificationCenter: React.FC<NotifProps> = ({ notifications, onRefresh }) => {
  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Activity Audit</span>
          <h2 className="text-3xl font-serif text-[#121C1A] mt-1">Notification & Event Log</h2>
          <p className="text-sm text-[#5C6460]">Real-time operational alerts, disruption warnings, and approval requests.</p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="bg-white border border-[#E2E5E4] rounded-lg p-12 text-center text-[#5C6460] text-sm">
            No active notifications logged.
          </div>
        )}

        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 bg-white border rounded-lg shadow-sm flex items-start justify-between gap-4 transition-colors ${
              notif.is_read ? 'border-[#E2E5E4] opacity-75' : 'border-[#121C1A]'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-[#F4F4F4] rounded text-[#121C1A] mt-0.5">
                {notif.level === 'URGENT' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                ) : notif.level === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : (
                  <Info className="w-4 h-4 text-[#2D4645]" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-sm text-[#121C1A]">{notif.title}</h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#F4F4F4] rounded text-[#5C6460]">
                    {notif.category}
                  </span>
                </div>
                <p className="text-xs text-[#5C6460] mt-1 leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-[#A3ACA9] block mt-1">
                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {!notif.is_read && (
              <button
                type="button"
                onClick={() => markAsRead(notif.id)}
                className="text-xs text-[#5C6460] hover:text-[#121C1A] flex items-center space-x-1 p-1 hover:bg-[#F4F4F4] rounded"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
