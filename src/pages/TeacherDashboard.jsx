import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Plus, BookOpen, Users, BarChart3, LogOut, User, Bell, 
  Search, TrendingUp, Clock, Award, Target, Edit, Trash2, Eye,
  AlertCircle, CheckCircle, XCircle, MoreVertical, Copy, PlayCircle, Zap ,Sparkles
} from 'lucide-react';
import { auth } from '../config/firebase';
import { logout } from '../services/authService';
import {
  getTeacherProfile,
  getTeacherQuizzes,
  getTeacherStudents,
  getRecentSubmissions,
  deleteQuiz,
  updateQuizStatus
} from '../services/teacherService';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showQuizMenu, setShowQuizMenu] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadTeacherData(currentUser.uid);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadTeacherData = async (userId) => {
    setLoading(true);
    try {
      const profileResult = await getTeacherProfile(userId);
      if (profileResult.success) setProfile(profileResult.data);

      const quizzesResult = await getTeacherQuizzes(userId);
      if (quizzesResult.success) setQuizzes(quizzesResult.data);

      const studentsResult = await getTeacherStudents();
      if (studentsResult.success) setStudents(studentsResult.data);

      const submissionsResult = await getRecentSubmissions(userId);
      if (submissionsResult.success) setSubmissions(submissionsResult.data);
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

  const handleDeleteQuiz = async (quizId) => {
    const result = await deleteQuiz(quizId);
    if (result.success) {
      setQuizzes(quizzes.filter(q => q.id !== quizId));
      alert('Quiz deleted successfully!');
    } else {
      alert('Failed to delete quiz');
    }
    setShowDeleteConfirm(null);
  };

  const handleToggleStatus = async (quizId, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    const result = await updateQuizStatus(quizId, newStatus);
    if (result.success) {
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, status: newStatus } : q));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      open: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
      closed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Closed' }
    };
    const c = config[status] || config.open;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty) => {
    const config = {
      easy: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Easy' },
      medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Medium' },
      hard: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Hard' }
    };
    const c = config[difficulty] || config.medium;
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
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
                  <p className="text-xs text-gray-400">Teacher Portal</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
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
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                    {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-white">{profile?.name || user?.displayName || 'Teacher'}</p>
                    <p className="text-xs text-gray-400">Teacher</p>
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
                Welcome back, {profile?.name?.split(' ')[0] || 'Teacher'}! 👨‍🏫
              </h2>
              <p className="text-gray-300">Manage your quizzes and track student progress</p>
            </div>
            <button
              onClick={() => navigate('/create-quiz')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Quiz</span>
            </button>
            <button
            onClick={() => navigate('/ai-quiz-generator')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:shadow-xl hover:shadow-orange-500/50 transition font-semibold flex items-center space-x-2"
            >
            <Sparkles className="w-5 h-5" />
            <span>AI Generator</span>
          </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Quizzes</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {quizzes.length}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition">
                <Users className="w-7 h-7 text-white" />
              </div>
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Students</p>
            <p className="text-4xl font-bold text-blue-400">{students.length}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-500/50 transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Submissions</p>
            <p className="text-4xl font-bold text-emerald-400">{submissions.length}</p>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-white/10 bg-slate-900/50">
            <nav className="flex overflow-x-auto">
              {[
                { id: 'quizzes', label: 'My Quizzes', icon: BookOpen, count: quizzes.length },
                { id: 'students', label: 'Students', icon: Users, count: students.length },
                { id: 'submissions', label: 'Recent Submissions', icon: TrendingUp, count: submissions.length }
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
                  {tab.count !== undefined && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Quizzes Tab */}
            {activeTab === 'quizzes' && (
              <div>
                {filteredQuizzes.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-4">📝</div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Quizzes Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first quiz to get started</p>
                    <button
                      onClick={() => navigate('/create-quiz')}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold inline-flex items-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Quiz</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition">
                                {quiz.title}
                              </h3>
                              {getStatusBadge(quiz.status)}
                              {getDifficultyBadge(quiz.difficulty)}
                            </div>
                            <p className="text-gray-400 text-sm mb-3">{quiz.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Due: {formatDate(quiz.deadline)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{quiz.quiz?.questions?.length || 0} Questions</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4" />
                                <span>{quiz.studentIds?.length || 0} Students</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>{quiz.submissionsCount || 0} Submissions</span>
                              </div>
                            </div>
                          </div>

                          {/* Quiz Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setShowQuizMenu(showQuizMenu === quiz.id ? null : quiz.id)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>

                            {showQuizMenu === quiz.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30 py-2 z-10">
                                <button
                                  onClick={() => {
                                    setShowQuizMenu(null);
                                    navigate(`/live-host/${quiz.id}`);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-emerald-400 hover:bg-white/5 flex items-center space-x-3 transition font-semibold"
                                >
                                  <Zap className="w-4 h-4" />
                                  <span>Start Live Session</span>
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                  onClick={() => navigate(`/quiz/${quiz.id}/view`)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Details</span>
                                </button>
                                <button
                                  onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit Quiz</span>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(quiz.id, quiz.status)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition"
                                >
                                  {quiz.status === 'open' ? (
                                    <>
                                      <XCircle className="w-4 h-4" />
                                      <span>Close Quiz</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Open Quiz</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {/* Duplicate logic */}}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center space-x-3 transition"
                                >
                                  <Copy className="w-4 h-4" />
                                  <span>Duplicate</span>
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button
                                  onClick={() => setShowDeleteConfirm(quiz.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 flex items-center space-x-3 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div>
                {students.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No students yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map(student => (
                      <div
                        key={student.id}
                        className="bg-slate-900/50 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center font-bold text-white">
                            {student.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">{student.name}</p>
                            <p className="text-sm text-gray-400 truncate">{student.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-800 rounded-lg p-2">
                            <p className="text-gray-400">Points</p>
                            <p className="text-white font-bold">{student.stats?.totalPoints || 0}</p>
                          </div>
                          <div className="bg-slate-800 rounded-lg p-2">
                            <p className="text-gray-400">Streak</p>
                            <p className="text-orange-400 font-bold">{student.stats?.streak || 0}</p>
                          </div>
                          <div className="bg-slate-800 rounded-lg p-2">
                            <p className="text-gray-400">Avg</p>
                            <p className="text-emerald-400 font-bold">{student.stats?.averageScore || 0}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                {submissions.length === 0 ? (
                  <div className="text-center py-16">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map(submission => (
                      <div
                        key={submission.id}
                        className="bg-slate-900/50 border border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl ${
                            submission.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                            submission.score >= 60 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {submission.score}%
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              Assignment: {submission.assignmentId.slice(0, 12)}...
                            </p>
                            <p className="text-sm text-gray-400">
                              Student ID: {submission.studentId.slice(0, 12)}...
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(submission.submittedAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/submission/${submission.id}`)}
                          className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm font-semibold"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl border border-purple-500/30 p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete Quiz?</h3>
              <p className="text-gray-400">This action cannot be undone. All submissions will be lost.</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-6 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuiz(showDeleteConfirm)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;