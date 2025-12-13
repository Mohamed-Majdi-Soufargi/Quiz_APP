import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { signUp } from '../services/authService';

function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Create new user account
      const result = await signUp(email, password, name, role);
      
      if (result.success) {
        // Navigate to appropriate dashboard
        if (role === 'teacher') {
          navigate('/teacher-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      } else {
        // Display error message
        let errorMessage = result.error;
        
        // Provide user-friendly error messages
        if (errorMessage.includes('email-already-in-use')) {
          errorMessage = 'This email is already registered. Please login instead.';
        } else if (errorMessage.includes('weak-password')) {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (errorMessage.includes('invalid-email')) {
          errorMessage = 'Invalid email address. Please check and try again.';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-purple-500/30 shadow-2xl">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join QuizzApp today</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Role Toggle */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
          <button 
            onClick={() => setRole('student')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              role === 'student' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}>
            🎓 Student
          </button>
          <button 
            onClick={() => setRole('teacher')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              role === 'teacher' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}>
            👨‍🏫 Teacher
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
              required
              disabled={loading}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            {loading ? 'Creating Account...' : `Sign Up as ${role === 'student' ? 'Student' : 'Teacher'}`}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')}
              className="text-purple-400 hover:text-purple-300 font-semibold">
              Login
            </button>
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-300 text-sm">
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;