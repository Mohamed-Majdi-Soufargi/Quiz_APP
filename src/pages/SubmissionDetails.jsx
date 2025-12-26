import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, ArrowLeft, Award, CheckCircle, XCircle, Clock, 
  Calendar, User, Mail, BarChart3, Target, Trophy
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

const SubmissionDetails = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadSubmissionDetails();
    }
  }, [user, submissionId]);

  const loadSubmissionDetails = async () => {
    setLoading(true);
    try {
      // Load submission
      const submissionRef = ref(database, `submissions/${submissionId}`);
      const submissionSnapshot = await get(submissionRef);
      
      if (submissionSnapshot.exists()) {
        const submissionData = submissionSnapshot.val();
        setSubmission(submissionData);

        // Load assignment details
        const assignmentRef = ref(database, `assignments/${submissionData.assignmentId}`);
        const assignmentSnapshot = await get(assignmentRef);
        
        if (assignmentSnapshot.exists()) {
          setAssignment(assignmentSnapshot.val());
        }
      } else {
        alert('Submission not found');
        navigate('/teacher-dashboard');
      }
    } catch (error) {
      console.error('Error loading submission:', error);
      alert('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-emerald-500 to-green-600';
    if (score >= 60) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const getGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Submission Not Found</h2>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Submission Details
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Info Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                {submission.studentName?.[0]?.toUpperCase() || 'S'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{submission.studentName}</h2>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{submission.studentEmail}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Submitted: {formatDate(submission.submittedAt)}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className={`text-6xl font-black bg-gradient-to-r ${getScoreColor(submission.score)} bg-clip-text text-transparent mb-2`}>
                {submission.score}%
              </div>
              <p className="text-xl text-gray-300">
                Grade: <span className="font-bold text-white">{getGrade(submission.score)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Quiz Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Quiz Title</p>
              <p className="text-lg font-semibold text-white">{assignment.title}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Category</p>
              <p className="text-lg font-semibold text-white">{assignment.category || 'General'}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 text-center">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">{submission.earnedPoints}</p>
            <p className="text-sm text-gray-400">Points Earned</p>
            <p className="text-xs text-gray-500 mt-1">out of {submission.totalPoints}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission.results?.filter(r => r.isCorrect).length || 0}
            </p>
            <p className="text-sm text-gray-400">Correct</p>
            <p className="text-xs text-gray-500 mt-1">out of {submission.results?.length || 0}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission.results?.filter(r => !r.isCorrect).length || 0}
            </p>
            <p className="text-sm text-gray-400">Incorrect</p>
            <p className="text-xs text-gray-500 mt-1">answers</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 text-center">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission.timeSpent || 'N/A'}
            </p>
            <p className="text-sm text-gray-400">Time Spent</p>
          </div>
        </div>

        {/* Feedback */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span>Performance Feedback</span>
          </h3>
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
            <p className="text-gray-300 text-lg">{submission.feedback}</p>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <span>Answer Review</span>
            </h2>
          </div>

          <div className="space-y-6">
            {submission.results?.map((result, index) => {
              const question = assignment.quiz?.questions?.[result.questionIndex];
              if (!question) return null;

              return (
                <div
                  key={index}
                  className={`rounded-2xl border-2 p-6 ${
                    result.isCorrect
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <span className="px-3 py-1 bg-slate-900 rounded-lg font-bold text-sm text-gray-400">
                        Q{result.questionIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {question.question}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${
                      result.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {result.isCorrect ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-bold">Correct</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          <span className="font-bold">Incorrect</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 ml-12">
                    {question.options.map((option, optIndex) => {
                      const isSelected = result.selectedAnswer === optIndex;
                      const isCorrect = result.correctAnswer === optIndex;

                      return (
                        <div
                          key={optIndex}
                          className={`p-4 rounded-xl border-2 ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/50'
                              : isSelected
                              ? 'bg-red-500/10 border-red-500/50'
                              : 'bg-slate-900/50 border-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`${
                              isCorrect || isSelected ? 'text-white font-semibold' : 'text-gray-400'
                            }`}>
                              {option}
                            </span>
                            <div className="flex items-center space-x-2">
                              {isSelected && !isCorrect && (
                                <span className="text-red-400 text-sm font-semibold">Student's Answer</span>
                              )}
                              {isSelected && isCorrect && (
                                <span className="text-emerald-400 text-sm font-semibold">Student's Answer (Correct!)</span>
                              )}
                              {isCorrect && !isSelected && (
                                <span className="text-emerald-400 text-sm font-semibold">Correct Answer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="mt-4 ml-12 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <p className="text-sm font-semibold text-blue-400 mb-1">💡 Explanation:</p>
                      <p className="text-sm text-gray-300">{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetails;