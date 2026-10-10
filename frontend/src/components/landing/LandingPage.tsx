import React from 'react';
import { Compass, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#121C1A]">
      {/* Navigation Header */}
      <header className="border-b border-[#E2E5E4] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#121C1A] text-white flex items-center justify-center rounded">
              <Compass className="w-6 h-6 text-[#A3ACA9]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#121C1A]">TBS RoamAgent</span>
              <span className="block text-xs uppercase tracking-widest text-[#5C6460]">Travel Concierge</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#5C6460]">
            <a href="#features" className="hover:text-[#121C1A] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#121C1A] transition-colors">How it Works</a>
            <a href="#destinations" className="hover:text-[#121C1A] transition-colors">Corridors</a>
            <a href="#responsible-ai" className="hover:text-[#121C1A] transition-colors">Responsible AI</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={onSignIn}
              className="text-sm font-semibold px-4 py-2 text-[#121C1A] hover:text-[#2D4645] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-5 py-2.5 bg-[#121C1A] text-white rounded hover:bg-[#2D4645] transition-colors flex items-center space-x-2"
            >
              <span>Plan Your Journey</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#E2E5E4] rounded text-xs font-semibold uppercase tracking-wider text-[#121C1A]">
              <span className="w-2 h-2 rounded-full bg-[#2D4645]"></span>
              <span>Agentic AI in Travel Technology</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-serif font-normal tracking-tight text-[#121C1A] leading-tight">
              Quietly intelligent journeys, engineered for certainty.
            </h1>
            <p className="text-lg text-[#5C6460] max-w-xl leading-relaxed">
              Experience proactive multimodal journey planning. From sleeper buses across Andhra Pradesh to coordinated railway links, RoamAgent enforces arrival deadlines, monitors disruptions, and never commits bookings without your explicit approval.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={onGetStarted}
                className="px-6 py-3.5 bg-[#121C1A] text-white font-medium rounded hover:bg-[#2D4645] transition-colors shadow-sm"
              >
                Plan Your Journey
              </button>
              <a
                href="#destinations"
                className="px-6 py-3.5 border border-[#121C1A] text-[#121C1A] font-medium rounded hover:bg-white transition-colors"
              >
                Explore Corridors
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-[#E2E5E4] rounded p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-4">
                <span className="text-xs uppercase tracking-wider text-[#5C6460] font-semibold">Active Demonstration Corridor</span>
                <span className="text-xs px-2 py-0.5 bg-[#E2E5E4] rounded text-[#121C1A]">Live Timetable</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-[#121C1A]">Visakhapatnam → Hyderabad</h4>
                    <p className="text-xs text-[#5C6460]">Overnight Express corridor (RTC Complex to MGBS)</p>
                  </div>
                  <span className="text-sm font-bold text-[#121C1A]">From ₹890</span>
                </div>
                <div className="p-3 bg-[#F4F4F4] rounded border border-[#E2E5E4] text-xs text-[#5C6460] space-y-1">
                  <div className="flex justify-between">
                    <span>Average Duration:</span>
                    <span className="font-medium text-[#121C1A]">10h 30m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transfer Safety Buffer:</span>
                    <span className="font-medium text-[#121C1A]">45–60 mins minimum</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deadline Compliance:</span>
                    <span className="font-medium text-[#121C1A]">Strict &lt; 09:00 AM arrival</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="bg-white border-y border-[#E2E5E4] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-wider text-[#5C6460] font-semibold">Architecture</span>
            <h2 className="text-3xl font-serif mt-2 text-[#121C1A]">Engineered with deterministic safeguards</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-[#E2E5E4] rounded bg-[#F4F4F4] space-y-4">
              <div className="w-10 h-10 bg-[#121C1A] text-white rounded flex items-center justify-center font-bold">1</div>
              <h3 className="text-xl font-semibold text-[#121C1A]">Deterministic Planning</h3>
              <p className="text-sm text-[#5C6460] leading-relaxed">
                Graph-search engine checks timetable feasibility, arrival deadlines, and connection buffers without LLM hallucination of false services.
              </p>
            </div>

            <div className="p-8 border border-[#E2E5E4] rounded bg-[#F4F4F4] space-y-4">
              <div className="w-10 h-10 bg-[#121C1A] text-white rounded flex items-center justify-center font-bold">2</div>
              <h3 className="text-xl font-semibold text-[#121C1A]">Disruption Recovery</h3>
              <p className="text-sm text-[#5C6460] leading-relaxed">
                When delays strike, RoamAgent recalculates route viability, checks alternate connecting corridors, and transparently displays cost differences.
              </p>
            </div>

            <div className="p-8 border border-[#E2E5E4] rounded bg-[#F4F4F4] space-y-4">
              <div className="w-10 h-10 bg-[#121C1A] text-white rounded flex items-center justify-center font-bold">3</div>
              <h3 className="text-xl font-semibold text-[#121C1A]">Human-in-the-Loop Approval</h3>
              <p className="text-sm text-[#5C6460] leading-relaxed">
                Consequential actions—booking confirmations, cancellations, and ticket changes—halt automatically for verified user authorization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Responsible AI */}
      <section id="responsible-ai" className="py-20 max-w-7xl mx-auto px-6">
        <div className="bg-[#121C1A] text-white rounded-lg p-10 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center space-x-2 text-[#A3ACA9] text-xs uppercase tracking-widest">
              <ShieldCheck className="w-5 h-5 text-[#A3ACA9]" />
              <span>Responsible AI Governance</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-serif">Zero unapproved transactions. Transparent audit trails.</h3>
            <p className="text-[#A3ACA9] text-sm leading-relaxed">
              RoamAgent never collects real payment details or simulates transactions without explicit approval. All simulated data and mock timetable parameters are explicitly watermarked.
            </p>
          </div>
          <button
            onClick={onGetStarted}
            className="px-6 py-3.5 bg-white text-[#121C1A] font-semibold rounded hover:bg-[#F4F4F4] transition-colors whitespace-nowrap"
          >
            Launch Experience
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E5E4] bg-white py-12 text-sm text-[#5C6460]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <Compass className="w-5 h-5 text-[#121C1A]" />
            <span className="font-semibold text-[#121C1A]">TBS RoamAgent</span>
            <span>— Multimodal Travel Concierge (SAMARTHA Hackathon)</span>
          </div>
          <div className="text-xs">
            Restrained natural aesthetic • No gradients • Deterministic graph engine
          </div>
        </div>
      </footer>
    </div>
  );
};
