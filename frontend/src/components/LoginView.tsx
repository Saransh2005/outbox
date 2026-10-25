import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  onErrorToast: (title: string, desc?: string) => void;
  googleClientId?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onErrorToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Fetch user profile using access_token
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const data = await res.json();

        const userProfile: UserProfile = {
          name: data.name || 'Oliver Brown',
          email: data.email || 'oliver.brown@domain.io',
          avatar:
            data.picture ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          googleId: data.sub,
        };

        localStorage.setItem('reachinbox_user', JSON.stringify(userProfile));
        onLoginSuccess(userProfile);
      } catch (err: any) {
        console.error('Failed to fetch Google profile:', err);
        handleDemoSignIn();
      }
    },
    onError: () => {
      // Graceful fallback to demo sign in
      handleDemoSignIn();
    },
  });

  const handleDemoSignIn = () => {
    const defaultUser: UserProfile = {
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleId: 'google_user_demo_123',
    };
    localStorage.setItem('reachinbox_user', JSON.stringify(defaultUser));
    onLoginSuccess(defaultUser);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      onErrorToast('Missing Email', 'Please enter your email ID');
      return;
    }
    const user: UserProfile = {
      name: email.split('@')[0],
      email: email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    localStorage.setItem('reachinbox_user', JSON.stringify(user));
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Centered Login Card */}
      <div className="w-full max-w-[340px] bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.06)]">
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6">Login</h1>

        {/* Login with Google Button */}
        <button
          type="button"
          onClick={() => triggerGoogleLogin()}
          className="w-full bg-[#EBF8F2] hover:bg-[#DDF3E8] border border-[#A7E8C7] text-[#15803D] font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2.5 text-xs transition-colors shadow-sm mb-4"
        >
          {/* Google 4-color icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.31 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.0 10.05.0 12c0 1.95.46 3.8 1.27 5.42l4.01-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-gray-100 w-full" />
          <span className="bg-white px-2 text-[10px] text-gray-400 whitespace-nowrap">
            or sign up through email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A36C] focus:bg-white transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A36C] focus:bg-white transition-all"
            />
          </div>

          {/* Primary Login Button */}
          <button
            type="submit"
            className="w-full bg-[#00A36C] hover:bg-[#008f5d] text-white font-medium py-2.5 rounded-xl shadow-sm text-xs transition-colors mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
