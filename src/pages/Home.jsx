import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, Brain, BookOpen } from 'lucide-react';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 container mx-auto px-6 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl shadow-2xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
            </div>
            <span className="text-3xl font-black text-white tracking-tight">
              Quizz<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">App</span>
            </span>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 text-white font-semibold hover:bg-white/10 rounded-xl transition backdrop-blur-sm border border-white/20">
              Login
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-5xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white font-semibold">AI-Powered Quiz Platform</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-7xl md:text-8xl font-black text-white mb-6 leading-tight">
            Test Your Knowledge
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
              Ace Every Quiz
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-purple-200 mb-20 max-w-3xl mx-auto leading-relaxed">
            Create quizzes in seconds with AI, take interactive assessments, and track your progress 📚
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 hover:bg-gradient-to-br hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/50">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 transition-all">AI Quiz Generation</h3>
                <p className="text-purple-200 group-hover:text-white transition-all">Generate quizzes instantly on any topic using advanced AI technology.</p>
              </div>
            </div>

            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 hover:bg-gradient-to-br hover:from-indigo-600/30 hover:to-purple-600/30 hover:border-indigo-400 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/50">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-300 group-hover:to-purple-300 transition-all">Interactive Learning</h3>
                <p className="text-purple-200 group-hover:text-white transition-all">Take quizzes with instant feedback and detailed explanations.</p>
              </div>
            </div>

            <div className="group relative p-8 bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 hover:bg-gradient-to-br hover:from-pink-600/30 hover:to-purple-600/30 hover:border-pink-400 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-500/50">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-300 group-hover:to-purple-300 transition-all">Track Progress</h3>
                <p className="text-purple-200 group-hover:text-white transition-all">Monitor your performance with detailed analytics and statistics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-purple-300 text-sm">
              © 2025 QuizzApp
            </p>
            <p className="text-purple-300 text-sm">
              Made by Adem Sghaier, Med Majdi Soufargi & Med Oueslati
            </p>
          </div>
        </div>
      </div>

      <style>{`
        button {
          cursor: pointer;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .delay-700 {
          animation-delay: 700ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}

export default Home;