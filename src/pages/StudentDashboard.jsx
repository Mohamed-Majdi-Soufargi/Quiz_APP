import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Trophy, Flame, BookOpen, Star, LogOut, User, Bell, Search, TrendingUp, Clock, Award, Target, Home } from 'lucide-react';
import { auth } from '../config/firebase';
import { logout } from '../services/authService';
import {
  getStudentProfile,
  getStudentAssignments,
  getStudentSubmissions,
  subscribeToAssignments
} from '../services/studentService';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  const [roomCode, setRoomCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadStudentData(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadStudentData = async (userId) => {
    setLoading(true);
    try {
      const profileResult = await getStudentProfile(userId);
      if (profileResult.success) setProfile(profileResult.data);

      const assignmentsResult = await getStudentAssignments(userId);
      if (assignmentsResult.success) setAssignments(assignmentsResult.data);

      const submissionsResult = await getStudentSubmissions(userId);
      if (submissionsResult.success) setSubmissions(submissionsResult.data);

      const unsubscribe = subscribeToAssignments(userId, (updatedAssignments) => {
        setAssignments(updatedAssignments);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) navigate('/login');
  };

const getAssignmentStatus = (assignment) => {
    // First check if already submitted
    const submission = submissions.find(s => s.assignmentId === assignment.id);
    if (submission) return 'submitted';

    // Then check deadline
    const deadline = new Date(assignment.deadline);
    const now = new Date();
    
    // If deadline has passed
    if (now > deadline) return 'overdue';
    
    // Check if due soon (within 24 hours)
    const hoursUntilDue = (deadline - now) / (1000 * 60 * 60);
    if (hoursUntilDue < 24) return 'due-soon';
    
    // Otherwise it's just assigned
    return 'assigned';
  };
  const getStatusBadge = (status) => {
    const config = {
      submitted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Completed', icon: '✓' },
      'due-soon': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Due Soon', icon: '⚠' },
      overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Overdue', icon: '!' },
      assigned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Active', icon: '→' }
    };
    const c = config[status];
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${c.bg} ${c.text} backdrop-blur-sm border border-white/10`}>
        {c.icon} {c.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleJoinLive = () => {
    if (roomCode.trim()) navigate(`/live-session/${roomCode}`);
  };

  const filteredAssignments = assignments.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enhanced Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    QuizzApp
                  </h1>
                  <p className="text-xs text-gray-400">Student Portal</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10">
                <Bell className="w-5 h-5 text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full"></span>
              </button>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 p-2 pr-4 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                    {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-white">{profile?.name || user?.displayName || 'Student'}</p>
                    <p className="text-xs text-gray-400">Student</p>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30 py-2 z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-semibold text-white">{profile?.name || user?.displayName}</p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 flex items-center space-x-3 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-purple-500/30">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Welcome back, {profile?.name?.split(' ')[0] || 'Student'}! 👋
              </h2>
              <p className="text-gray-300">Ready to continue your learning journey?</p>
            </div>
            <div className="hidden md:block">
              <div className="text-6xl">🎓</div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Points</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {profile?.stats?.totalPoints || 0}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Current Streak</p>
            <p className="text-4xl font-bold text-orange-400">{profile?.stats?.streak || 0}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Active Assignments</p>
            <p className="text-4xl font-bold text-blue-400">{assignments.filter(a => getAssignmentStatus(a) === 'assigned').length}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition">
                <Star className="w-7 h-7 text-white" />
              </div>
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Badges Earned</p>
            <p className="text-4xl font-bold text-emerald-400">{profile?.badges?.length || 0}</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-white/10 bg-slate-900/50">
            <nav className="flex overflow-x-auto">
              {[
                { id: 'assignments', label: 'Assignments', icon: BookOpen, count: assignments.length },
                { id: 'live', label: 'Live Session', icon: Target, count: null },
                { id: 'stats', label: 'Statistics', icon: TrendingUp, count: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div>
                {filteredAssignments.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-4">📚</div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Assignments Yet</h3>
                    <p className="text-gray-400">Check back later for new assignments from your teachers</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAssignments.map((assignment) => {
                      const status = getAssignmentStatus(assignment);
                      const submission = submissions.find(s => s.assignmentId === assignment.id);
                      
                      return (
                        <div
                          key={assignment.id}
                          className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition">
                                  {assignment.title || 'Untitled Assignment'}
                                </h3>
                                {getStatusBadge(status)}
                              </div>
                              <p className="text-gray-400 text-sm">{assignment.description || 'No description provided'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>Due: {formatDate(assignment.deadline)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <BookOpen className="w-4 h-4" />
                              <span>{assignment.quiz?.questions?.length || 0} Questions</span>
                            </div>
                            {submission && (
                              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                                <Award className="w-4 h-4" />
                                <span>Score: {submission.score}%</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end">
                            {status !== 'submitted' && status !== 'overdue' && (
                              <button
                                onClick={() => navigate(`/assignment/${assignment.id}`)}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold"
                              >
                                Start Assignment →
                              </button>
                            )}
                            {status === 'submitted' && (
                              <button
                                onClick={() => navigate(`/assignment/${assignment.id}/review`)}
                                className="px-6 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold"
                              >
                                View Results
                              </button>
                            )}
                            {status === 'overdue' && (
                              <span className="px-6 py-3 text-red-400 font-semibold">Assignment Overdue</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Session Tab */}
            {activeTab === 'live' && (
              <div className="max-w-lg mx-auto text-center py-12">
                <div className="text-8xl mb-6">🎮</div>
                <h2 className="text-3xl font-bold text-white mb-3">Join Live Quiz Session</h2>
                <p className="text-gray-400 mb-8">Enter the room code provided by your teacher to participate in real-time</p>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    className="w-full px-6 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-center text-3xl font-bold tracking-[0.5em] transition"
                    maxLength={6}
                  />
                  
                  <button
                    onClick={handleJoinLive}
                    disabled={!roomCode.trim()}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-lg"
                  >
                    Join Session →
                  </button>
                </div>

                <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">💡</div>
                    <div className="text-left">
                      <p className="font-semibold text-blue-400 mb-1">Quick Tip</p>
                      <p className="text-sm text-gray-400">Room codes are 6 characters and case-insensitive. Make sure to join before the session starts!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                {/* Badges */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                    <Award className="w-6 h-6 text-yellow-400" />
                    <span>Badges Collection</span>
                  </h3>
                  {profile?.badges?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profile.badges.map((badge, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-6 text-center border border-yellow-500/30 hover:scale-105 transition"
                        >
                          <div className="text-5xl mb-3">{badge.icon || '🏆'}</div>
                          <p className="font-bold text-white mb-1">{badge.name}</p>
                          <p className="text-xs text-gray-400">{new Date(badge.earnedAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-white/20">
                      <div className="text-6xl mb-3">🎯</div>
                      <p className="text-gray-400">Complete assignments to unlock badges!</p>
                    </div>
                  )}
                </div>

                {/* Recent Performance */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                    <span>Recent Performance</span>
                  </h3>
                  {submissions.length > 0 ? (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-5 bg-slate-900/50 rounded-xl border border-white/10 hover:border-purple-500/30 transition"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                              submission.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                              submission.score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {submission.score}%
                            </div>
                            <div>
                              <p className="font-semibold text-white">Assignment {submission.assignmentId.slice(0, 8)}...</p>
                              <p className="text-sm text-gray-400">{formatDate(submission.submittedAt)}</p>
                            </div>
                          </div>
                          <Trophy className={`w-5 h-5 ${
                            submission.score >= 80 ? 'text-emerald-400' :
                            submission.score >= 60 ? 'text-amber-400' :
                            'text-gray-600'
                          }`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-white/20">
                      <div className="text-6xl mb-3">📊</div>
                      <p className="text-gray-400">No submissions yet. Start your first assignment!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;