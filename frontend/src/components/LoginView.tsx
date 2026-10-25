import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UserProfile } from '../types';
import {
  Mail,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  onErrorToast: (title: string, desc?: string) => void;
  googleClientId?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onErrorToast,
  googleClientId,
}) => {
  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential returned from Google');
      }

      const decoded: any = jwtDecode(credentialResponse.credential);
      const userProfile: UserProfile = {
        name: decoded.name || 'Google User',
        email: decoded.email,
        avatar:
          decoded.picture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        googleId: decoded.sub,
      };

      localStorage.setItem('reachinbox_user', JSON.stringify(userProfile));
      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error('Google decode error:', err);
      onErrorToast('Google Sign-In Error', err.message);
    }
  };

  const handleDemoSignIn = () => {
    const demoUser: UserProfile = {
      name: 'Alex Morgan',
      email: 'alex.morgan@outboxlabs.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleId: 'google_oauth_demo_1092834710',
    };
    localStorage.setItem('reachinbox_user', JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-violet-500 shadow-xl shadow-brand-500/25 border border-white/10 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ReachInbox
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Production-grade Email Scheduler & Queue Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-400">
              Access scheduled outreach, BullMQ live queues, and Ethereal preview
            </p>
          </div>

          {/* Real Google OAuth Login */}
          <div className="flex flex-col items-center justify-center pt-2">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => onErrorToast('Google Sign-In Failed', 'Unable to authenticate with Google.')}
              useOneTap={false}
              shape="pill"
              theme="filled_black"
              text="signin_with"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0B0F19] px-3 text-[11px] text-slate-400 uppercase tracking-wider">
              Or quick demo sign in
            </span>
          </div>

          {/* Instant Demo Google User Button */}
          <button
            onClick={handleDemoSignIn}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white border border-white/10 hover:border-brand-500/40 transition-all group shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Sign In with Demo Google Profile</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Architecture Features List */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span>BullMQ Queue</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Restart Persistence</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Rate Limit Defense</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Multi-Sender Ready</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          ReachInbox • Outbox Labs Hiring Assignment
        </p>
      </div>
    </div>
  );
};
