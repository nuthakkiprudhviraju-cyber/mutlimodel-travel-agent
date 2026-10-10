import React, { useState } from 'react';
import { Booking } from '../../types';
import { api } from '../../services/api';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileCheck2, Clock } from 'lucide-react';

interface ApprovalProps {
  bookings: Booking[];
  onRefresh: () => void;
}

export const BookingApprovalCenter: React.FC<ApprovalProps> = ({ bookings, onRefresh }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Found cheaper private alternative');

  const handleDecision = async (bookingId: string, decision: 'APPROVE' | 'REJECT', reason?: string) => {
    setLoadingId(bookingId);
    setError(null);
    try {
      await api.approveBooking(bookingId, decision, reason);
      setRejectModalId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    setLoadingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Stage 04</span>
        <h2 className="text-3xl font-serif text-[#121C1A] mt-1">Booking & Human Approval Centre</h2>
        <p className="text-sm text-[#5C6460] mt-1">
          Review consequential booking actions. RoamAgent enforces a hard human-in-the-loop gate before issuing any simulated reservation or payment commitment.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-white border border-red-300 rounded text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {bookings.length === 0 && (
          <div className="bg-white border border-[#E2E5E4] rounded-lg p-12 text-center text-[#5C6460] text-sm">
            No booking actions currently pending approval. Request a booking from the Itinerary Results to test the approval workflow.
          </div>
        )}

        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E5E4] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                      booking.status === 'CONFIRMED_SIMULATED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : booking.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-100 text-amber-800'
                        : booking.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    {booking.status}
                  </span>
                  <span className="text-xs text-[#5C6460] font-mono">ID: {booking.id.slice(0, 8)}</span>
                </div>
                <h4 className="text-lg font-semibold text-[#121C1A] mt-1">
                  Passenger: {booking.passenger_name} ({booking.passenger_count} Passenger)
                </h4>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-[#121C1A]">₹{booking.total_amount.toFixed(2)}</div>
                <div className="text-xs text-[#5C6460] flex items-center justify-end space-x-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Created: {new Date(booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Simulated Reference Banner */}
            {booking.confirmation_reference && (
              <div className="p-3 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-xs flex items-center justify-between text-[#121C1A]">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-[#2D4645]" />
                  <span>Simulated Confirmation PNR: <strong className="font-mono">{booking.confirmation_reference}</strong></span>
                </div>
                <span className="text-[11px] text-[#5C6460] uppercase tracking-wider font-semibold">Simulated Booking Only</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[#5C6460] flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-[#2D4645]" />
                <span>Audited Transaction • Zero Real Money Billed</span>
              </div>

              <div className="flex items-center space-x-3">
                {booking.status === 'PENDING_APPROVAL' && (
                  <>
                    <button
                      type="button"
                      disabled={loadingId === booking.id}
                      onClick={() => setRejectModalId(booking.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 text-xs font-semibold rounded hover:bg-red-50 transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject & Cancel</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === booking.id}
                      onClick={() => handleDecision(booking.id, 'APPROVE')}
                      className="px-5 py-2 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Booking (Simulated)</span>
                    </button>
                  </>
                )}

                {booking.status === 'CONFIRMED_SIMULATED' && (
                  <button
                    type="button"
                    disabled={loadingId === booking.id}
                    onClick={() => handleCancel(booking.id)}
                    className="px-4 py-2 border border-[#E2E5E4] text-[#5C6460] text-xs font-semibold rounded hover:text-red-700 hover:border-red-300 transition-colors"
                  >
                    Simulate Cancellation
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-[#121C1A]/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E5E4] rounded-lg max-w-sm w-full p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-base text-[#121C1A]">Confirm Booking Rejection</h3>
            <p className="text-xs text-[#5C6460]">
              Please state why this booking request is being rejected. The system will cancel the tentative reservation.
            </p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-xs text-[#121C1A]"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-3 py-1.5 text-xs text-[#5C6460] font-medium"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handleDecision(rejectModalId, 'REJECT', rejectReason)}
                className="px-4 py-1.5 bg-red-700 text-white text-xs font-semibold rounded"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
