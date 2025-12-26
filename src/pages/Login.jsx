import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { login, getUserRole } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Login user
      const result = await login(email, password);
      
      if (result.success) {
        // Get user's role from database
        const userRole = await getUserRole(result.user.uid);
        
        // Check if selected role matches stored role
        if (userRole !== role) {
          setError(`You registered as a ${userRole}. Please select the correct role.`);
          setLoading(false);
          return;
        }

        // Navigate based on role
        if (role === 'teacher') {
          navigate('/teacher-dashboard');
        } else {
          navigate('/student-dashboard');
        }
      } else {
        // Display user-friendly error messages
        let errorMessage = result.error || 'Login failed. Please check your credentials.';
        
        if (errorMessage.includes('user-not-found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (errorMessage.includes('wrong-password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (errorMessage.includes('invalid-email')) {
          errorMessage = 'Invalid email format. Please check your email.';
        } else if (errorMessage.includes('user-disabled')) {
          errorMessage = 'This account has been disabled. Please contact support.';
        } else if (errorMessage.includes('too-many-requests')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (errorMessage.includes('network-request-failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
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
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-gray-400">Login to continue to QuizzApp</p>
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
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            {loading ? 'Logging in...' : `Login as ${role === 'student' ? 'Student' : 'Teacher'}`}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <button 
              onClick={() => navigate('/signup')}
              className="text-purple-400 hover:text-purple-300 font-semibold">
              Sign up
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

export default Login;