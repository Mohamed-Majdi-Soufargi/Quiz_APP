import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, ArrowLeft, Edit, Trash2, Users, Clock, BookOpen, 
  Play, BarChart3, CheckCircle, Calendar, Award, Zap, Copy, Check
} from 'lucide-react';
import { auth } from '../config/firebase';
import { getQuizDetails, deleteQuiz, getQuizSubmissions } from '../services/teacherService';

// Add this to your services if missing
// This component expects these functions to exist in teacherService.js

const QuizDetailsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadQuizData(quizId);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate, quizId]);

  const loadQuizData = async (id) => {
    setLoading(true);
    try {
      const quizResult = await getQuizDetails(id);
      if (quizResult.success) {
        setQuiz(quizResult.data);
        
        // Load submissions
        const submissionsResult = await getQuizSubmissions(id);
        if (submissionsResult.success) {
          setSubmissions(submissionsResult.data);
        }
      } else {
        alert('Quiz not found');
        navigate('/teacher-dashboard');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Error loading quiz');
      navigate('/teacher-dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      const result = await deleteQuiz(quizId, user.uid);
      if (result.success) {
        alert('Quiz deleted successfully');
        navigate('/teacher-dashboard');
      } else {
        alert('Failed to delete quiz');
      }
    }
  };

  const handleStartLive = () => {
    navigate(`/live-host/${quizId}`);
  };

  const copyQuizId = () => {
    navigator.clipboard.writeText(quizId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateStats = () => {
    if (submissions.length === 0) {
      return { avgScore: 0, highScore: 0, lowScore: 0, passRate: 0 };
    }
    
    const scores = submissions.map(s => s.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highScore = Math.max(...scores);
    const lowScore = Math.min(...scores);
    const passRate = Math.round((scores.filter(s => s >= 60).length / scores.length) * 100);
    
    return { avgScore, highScore, lowScore, passRate };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading quiz details...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Not Found</h2>
          <button
            onClick={() => navigate('/teacher-dashboard')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/teacher-dashboard')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleStartLive}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/50 transition font-semibold flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Start Live Session</span>
              </button>
              <button
                onClick={() => navigate(`/quiz/${quizId}/edit`)}
                className="px-6 py-2.5 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition font-semibold flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-semibold flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quiz Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-purple-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-3">{quiz.title}</h1>
              <p className="text-xl text-gray-300 mb-4">{quiz.description}</p>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="w-5 h-5" />
                  <span>Created: {formatDate(quiz.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="w-5 h-5" />
                  <span>Deadline: {formatDate(quiz.deadline)}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="w-5 h-5" />
                  <span>{quiz.studentIds?.length || 0} Students Assigned</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                quiz.status === 'open' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {quiz.status === 'open' ? '● Active' : '● Closed'}
              </span>
            </div>
          </div>

          {/* Quiz ID */}
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Quiz ID:</span>
            <code className="px-3 py-1 bg-slate-900/50 rounded text-gray-300 font-mono">
              {quizId}
            </code>
            <button
              onClick={copyQuizId}
              className="p-1.5 hover:bg-white/10 rounded transition"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-purple-400" />
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Total Questions</p>
            <p className="text-3xl font-bold text-white">{quiz.quiz?.questions?.length || 0}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              <Award className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Submissions</p>
            <p className="text-3xl font-bold text-white">{submissions.length}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.avgScore}%</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Pass Rate</p>
            <p className="text-3xl font-bold text-amber-400">{stats.passRate}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 overflow-hidden">
          <div className="border-b border-white/10 bg-slate-900/50">
            <nav className="flex">
              {['overview', 'questions', 'submissions'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition capitalize ${
                    activeTab === tab
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Quiz Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Time Limit</p>
                      <p className="text-lg font-semibold text-white">
                        {quiz.quiz?.timeLimit ? `${quiz.quiz.timeLimit} minutes` : 'No limit'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Passing Score</p>
                      <p className="text-lg font-semibold text-white">
                        {quiz.quiz?.passingScore || 60}%
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Difficulty</p>
                      <p className="text-lg font-semibold text-white capitalize">
                        {quiz.difficulty || 'Medium'}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">Category</p>
                      <p className="text-lg font-semibold text-white">
                        {quiz.category || 'General'}
                      </p>
                    </div>
                  </div>
                </div>

                {submissions.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Performance Distribution</h3>
                    <div className="space-y-3">
                      {[
                        { range: '90-100%', label: 'Excellent', color: 'emerald', count: submissions.filter(s => s.score >= 90).length },
                        { range: '80-89%', label: 'Good', color: 'blue', count: submissions.filter(s => s.score >= 80 && s.score < 90).length },
                        { range: '70-79%', label: 'Fair', color: 'amber', count: submissions.filter(s => s.score >= 70 && s.score < 80).length },
                        { range: '60-69%', label: 'Pass', color: 'orange', count: submissions.filter(s => s.score >= 60 && s.score < 70).length },
                        { range: '0-59%', label: 'Needs Improvement', color: 'red', count: submissions.filter(s => s.score < 60).length }
                      ].map(item => {
                        const percentage = submissions.length > 0 ? (item.count / submissions.length) * 100 : 0;
                        return (
                          <div key={item.range} className="bg-slate-900/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <span className="text-white font-semibold">{item.label}</span>
                                <span className="text-gray-400 text-sm ml-2">({item.range})</span>
                              </div>
                              <span className="text-white font-bold">{item.count} students</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-${item.color}-500 transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                {quiz.quiz?.questions?.map((question, index) => (
                  <div key={index} className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-bold text-white flex-1">
                        {index + 1}. {question.question}
                      </h4>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-bold">
                        {question.points} pts
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg ${
                            optIndex === question.correctAnswer
                              ? 'bg-emerald-500/20 border-2 border-emerald-500'
                              : 'bg-slate-800/50 border-2 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white">{option}</span>
                            {optIndex === question.correctAnswer && (
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-gray-400 mb-1">Explanation:</p>
                        <p className="text-white">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map(submission => (
                      <div
                        key={submission.id}
                        className="bg-slate-900/50 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 transition flex items-center justify-between"
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
                            <p className="text-white font-semibold">{submission.studentName}</p>
                            <p className="text-sm text-gray-400">{submission.studentEmail}</p>
                            <p className="text-xs text-gray-500">{formatDate(submission.submittedAt)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/submission/${submission.id}`)}
                          className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm font-semibold"
                        >
                          View Details
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
    </div>
  );
};

export default QuizDetailsPage;