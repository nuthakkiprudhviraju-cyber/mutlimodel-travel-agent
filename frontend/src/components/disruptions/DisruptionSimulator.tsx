import React, { useState } from 'react';
import { Trip, Disruption } from '../../types';
import { api } from '../../services/api';
import { AlertCircle, RefreshCw, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface DisruptionProps {
  trips: Trip[];
  onDisruptionHandled: () => void;
}

export const DisruptionSimulator: React.FC<DisruptionProps> = ({ trips, onDisruptionHandled }) => {
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || '');
  const [disruptionType, setDisruptionType] = useState<string>('DELAY');
  const [delayMinutes, setDelayMinutes] = useState<number>(60);
  const [serviceName, setServiceName] = useState<string>('APSRTC Amaravati Multi-Axle');
  const [loading, setLoading] = useState(false);
  const [activeDisruption, setActiveDisruption] = useState<Disruption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.simulateDisruption({
        trip_id: selectedTripId,
        disruption_type: disruptionType,
        delay_minutes: delayMinutes,
        affected_service_name: serviceName,
        description: `Simulated event: ${disruptionType} on ${serviceName} with ${delayMinutes} mins delay.`
      });
      setActiveDisruption(result);
      onDisruptionHandled();
    } catch (err: any) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Stage 03</span>
        <h2 className="text-3xl font-serif text-[#121C1A] mt-1">Disruption Simulator & Recovery</h2>
        <p className="text-sm text-[#5C6460] mt-1">
          Trigger realistic transport delays or cancellations. RoamAgent immediately recalculates trip viability and formulates recovery alternatives.
        </p>
      </div>

      {/* Simulator Control Box */}
      <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 border-b border-[#E2E5E4] pb-4">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-[#121C1A]">Simulate Corridor Disruption Event</h3>
        </div>

        <form onSubmit={handleSimulate} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Target Planned Trip</label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            >
              {trips.length === 0 && <option value="">No active trips found</option>}
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.title} ({t.origin} → {t.destination})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Disruption Scenario</label>
            <select
              value={disruptionType}
              onChange={(e) => setDisruptionType(e.target.value)}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            >
              <option value="DELAY">Severe Traffic / Road Delay</option>
              <option value="CANCELLATION">Service Cancelled by Operator</option>
              <option value="MISSED_CONNECTION">Missed Transfer Connection</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Delay Duration (mins)</label>
            <input
              type="number"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !selectedTripId}
              className="w-full py-2.5 bg-amber-700 text-white font-semibold rounded hover:bg-amber-800 transition-colors flex items-center justify-center space-x-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Trigger Simulation</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-white border border-red-300 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Disruption Active State & Recovery Options */}
      {activeDisruption && (
        <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">
                  {activeDisruption.disruption_type}
                </span>
                <span className="text-xs text-[#5C6460] uppercase tracking-wider font-semibold">Simulated Event</span>
              </div>
              <p className="text-sm text-[#121C1A] mt-1 font-medium">{activeDisruption.description}</p>
            </div>
            <div className="text-right text-xs text-[#5C6460]">
              Impact: <span className="text-red-700 font-bold">{activeDisruption.impact_level}</span>
            </div>
          </div>

          <div>
            <h4 className="text-base font-serif text-[#121C1A] mb-3">AI Recovery Recommendations</h4>
            <div className="space-y-4">
              {activeDisruption.recovery_recommendations.map((rec) => (
                <div key={rec.id} className="p-4 border border-[#E2E5E4] rounded-lg bg-[#F4F4F4] space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h5 className="font-semibold text-sm text-[#121C1A]">{rec.title}</h5>
                    <span className="text-xs px-2 py-0.5 bg-white border border-[#E2E5E4] rounded text-[#121C1A] font-medium">
                      Status: {rec.feasibility_status}
                    </span>
                  </div>
                  <p className="text-xs text-[#5C6460] leading-relaxed">{rec.explanation}</p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#E2E5E4] text-xs">
                    <div className="flex space-x-4 text-[#5C6460]">
                      <span>Cost Difference: <strong className="text-[#121C1A]">₹{rec.additional_cost}</strong></span>
                      <span>Time Trade-off: <strong className="text-[#121C1A]">{rec.time_difference_minutes} mins</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-[#5C6460] italic">Requires User Approval</span>
                      <button
                        type="button"
                        onClick={() => alert("Recovery selected. Please proceed to Booking & Approval Centre to finalize approval.")}
                        className="px-3 py-1.5 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors"
                      >
                        Select Replacement Route
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
