import React, { useState } from 'react';
import { Sparkles, ArrowRight, Clock, Banknote, ShieldAlert, Bus, Train, Car } from 'lucide-react';
import { TripConstraints } from '../../types';
import { api } from '../../services/api';

interface PlannerProps {
  onTripCreated: (tripId: string) => void;
}

export const TripPlanner: React.FC<PlannerProps> = ({ onTripCreated }) => {
  const [prompt, setPrompt] = useState(
    'I want to travel from Chennai to Hyderabad on the selected date, reach before 9 AM, prefer a sleeper bus and keep my budget below ₹1,500.'
  );
  const [parsing, setParsing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable constraints
  const [constraints, setConstraints] = useState<TripConstraints>({
    origin: 'Chennai',
    destination: 'Hyderabad',
    departure_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    arrival_deadline: '09:00',
    max_budget: 1500,
    passenger_count: 1,
    seating_preference: 'SLEEPER',
    preferred_modes: ['BUS', 'TRAIN'],
    luggage_needed: true,
    accessibility_needs: false,
  });

  const handleParsePrompt = async () => {
    setParsing(true);
    setError(null);
    try {
      const parsed = await api.parseRequest(prompt);
      setConstraints(parsed);
    } catch (err: any) {
      setError(err.message || 'Parsing failed');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleMode = (mode: string) => {
    const current = constraints.preferred_modes || [];
    if (current.includes(mode)) {
      if (current.length > 1) {
        setConstraints({ ...constraints, preferred_modes: current.filter((m) => m !== mode) });
      }
    } else {
      setConstraints({ ...constraints, preferred_modes: [...current, mode] });
    }
  };

  const handlePlanTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanning(true);
    setError(null);
    try {
      const trip = await api.planTrip({
        title: `${constraints.origin} to ${constraints.destination}`,
        constraints,
      });
      onTripCreated(trip.id);
    } catch (err: any) {
      setError(err.message || 'Failed to generate itineraries');
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6460]">Stage 01</span>
        <h2 className="text-3xl font-serif text-[#121C1A] mt-1">Intelligent Journey Planning</h2>
        <p className="text-sm text-[#5C6460] mt-1">
          Tell us your travel plans in plain words. RoamAgent automatically formats the schedule, finds connecting routes, and pulls all tourist spots and restaurants along the route.
        </p>
      </div>

      {/* Natural Language Prompt Card */}
      <div className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-sm font-semibold text-[#121C1A]">
          <Sparkles className="w-4 h-4 text-[#2D4645]" />
          <span>Describe Your Journey</span>
        </div>

        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-4 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A] focus:outline-none focus:border-[#121C1A] resize-none"
          placeholder="e.g., I want to travel from Chennai to Hyderabad arriving before 9 AM with a sleeper bus under ₹1500..."
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#5C6460]">
            Supports custom departure cities, arrival deadlines, budgets, and comfort preferences.
          </div>
          <button
            type="button"
            onClick={handleParsePrompt}
            disabled={parsing}
            className="px-5 py-2.5 bg-[#121C1A] text-white text-xs font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-2"
          >
            <span>{parsing ? 'Analyzing Request...' : 'Apply Details to Plan'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-white border border-red-300 rounded text-xs text-red-700 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editable Constraints Form */}
      <form onSubmit={handlePlanTrip} className="bg-white border border-[#E2E5E4] rounded-lg p-6 shadow-sm space-y-6">
        <div className="border-b border-[#E2E5E4] pb-4">
          <h3 className="text-base font-semibold text-[#121C1A]">Trip Preferences & Transport Modes</h3>
          <p className="text-xs text-[#5C6460]">Review your route parameters before generating itineraries.</p>
        </div>

        {/* Mode of Transport Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-2">
            Modes of Transport
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'BUS', label: 'Intercity Bus', icon: Bus },
              { id: 'TRAIN', label: 'Express Train', icon: Train },
              { id: 'CAB', label: 'Highway Cab / Taxi', icon: Car },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = (constraints.preferred_modes || []).includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleToggleMode(m.id)}
                  className={`p-3 rounded border text-left flex items-center space-x-3 transition-colors ${
                    isSelected
                      ? 'border-[#121C1A] bg-[#121C1A] text-white'
                      : 'border-[#E2E5E4] bg-[#F4F4F4] text-[#121C1A] hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <div className="text-xs font-semibold">{m.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Origin / Destination / Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Departure City</label>
            <input
              type="text"
              required
              value={constraints.origin}
              onChange={(e) => setConstraints({ ...constraints, origin: e.target.value })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Arrival Destination</label>
            <input
              type="text"
              required
              value={constraints.destination}
              onChange={(e) => setConstraints({ ...constraints, destination: e.target.value })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Departure Date</label>
            <input
              type="date"
              required
              value={constraints.departure_date}
              onChange={(e) => setConstraints({ ...constraints, departure_date: e.target.value })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Arrival Deadline</span>
            </label>
            <input
              type="time"
              value={constraints.arrival_deadline || '09:00'}
              onChange={(e) => setConstraints({ ...constraints, arrival_deadline: e.target.value })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1 flex items-center space-x-1">
              <Banknote className="w-3.5 h-3.5" />
              <span>Max Budget (₹)</span>
            </label>
            <input
              type="number"
              value={constraints.max_budget || 1500}
              onChange={(e) => setConstraints({ ...constraints, max_budget: Number(e.target.value) })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] uppercase mb-1">Seating Tier</label>
            <select
              value={constraints.seating_preference || 'SLEEPER'}
              onChange={(e) => setConstraints({ ...constraints, seating_preference: e.target.value })}
              className="w-full p-2.5 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A]"
            >
              <option value="SLEEPER">AC Sleeper</option>
              <option value="AC_SEATER">AC Seater</option>
              <option value="NON_AC">Standard Non-AC</option>
              <option value="ANY">Any Available</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E5E4] flex justify-end">
          <button
            type="submit"
            disabled={planning}
            className="px-6 py-3 bg-[#121C1A] text-white text-sm font-semibold rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-2"
          >
            <span>{planning ? 'Finding Routes & Destination Guide...' : 'Search Journeys & View Tourist Guide'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
