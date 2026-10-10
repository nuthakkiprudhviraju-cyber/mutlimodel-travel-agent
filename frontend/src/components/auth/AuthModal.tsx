import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Compass, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('traveller@roamagent.com');
  const [password, setPassword] = useState('Travel12345!');
  const [fullName, setFullName] = useState('Naveen Traveller');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register({ email, password, full_name: fullName });
      } else {
        await login(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCredentials = (role: 'traveller' | 'admin') => {
    if (role === 'traveller') {
      setEmail('traveller@roamagent.com');
      setPassword('Travel12345!');
    } else {
      setEmail('admin@roamagent.com');
      setPassword('Admin12345!');
    }
    setIsRegister(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121C1A]/40 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E5E4] rounded-lg max-w-md w-full p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2E5E4] pb-4">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#121C1A]" />
            <h2 className="font-semibold text-[#121C1A]">
              {isRegister ? 'Create RoamAgent Account' : 'Sign In to RoamAgent'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#5C6460] hover:text-[#121C1A] text-xl font-bold">×</button>
        </div>

        {error && (
          <div className="p-3 bg-[#F4F4F4] border border-red-300 rounded text-xs text-red-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#5C6460] mb-1 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A] focus:outline-none focus:border-[#121C1A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] mb-1 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A] focus:outline-none focus:border-[#121C1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6460] mb-1 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-sm text-[#121C1A] focus:outline-none focus:border-[#121C1A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#121C1A] text-white font-medium rounded hover:bg-[#2D4645] transition-colors flex items-center justify-center space-x-2 text-sm"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-[#E2E5E4] space-y-3">
          <div className="text-xs text-[#5C6460] text-center">Quick Demo Accounts:</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadDemoCredentials('traveller')}
              className="flex-1 py-1.5 px-2 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-xs text-[#121C1A] font-medium hover:bg-white"
            >
              Traveller Demo
            </button>
            <button
              type="button"
              onClick={() => loadDemoCredentials('admin')}
              className="flex-1 py-1.5 px-2 bg-[#F4F4F4] border border-[#E2E5E4] rounded text-xs text-[#121C1A] font-medium hover:bg-white"
            >
              Admin Demo
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-[#5C6460] hover:text-[#121C1A] underline"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
