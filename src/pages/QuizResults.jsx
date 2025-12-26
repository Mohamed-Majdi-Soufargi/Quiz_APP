import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Brain, Trophy, Star, CheckCircle, XCircle, ArrowLeft, 
  Award, Target, Clock, TrendingUp, Share2, Home, BarChart3
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

const QuizResults = () => {
  const { assignmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

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
      loadResults();
    }
  }, [user]);

  const loadResults = async () => {
    setLoading(true);
    try {
      // Get submission from navigation state or fetch it from Firebase
      let submissionData = null;
      
      if (location.state?.submission) {
        console.log('✅ Found submission in navigation state');
        submissionData = location.state.submission;
        setSubmission(submissionData);
      } else {
        console.log('🔍 No submission in state, searching Firebase...');
        console.log('Assignment ID:', assignmentId);
        console.log('User ID:', user.uid);
        
        // Method 1: Check under assignments/{assignmentId}/submissions/{userId}
        const assignmentSubmissionsRef = ref(database, `assignments/${assignmentId}/submissions/${user.uid}`);
        const submissionSnapshot = await get(assignmentSubmissionsRef);
        
        console.log('Method 1 - Check assignment submissions:', submissionSnapshot.exists());
        
        if (submissionSnapshot.exists()) {
          const submissionId = submissionSnapshot.val().submissionId;
          console.log('Found submission ID:', submissionId);
          
          const submissionRef = ref(database, `submissions/${submissionId}`);
          const fullSubmissionSnapshot = await get(submissionRef);
          
          if (fullSubmissionSnapshot.exists()) {
            submissionData = fullSubmissionSnapshot.val();
            console.log('✅ Loaded full submission data');
          }
        } 
        
        // Method 2: If not found, search all submissions for this user and assignment
        if (!submissionData) {
          console.log('Method 2 - Searching all submissions...');
          const allSubmissionsRef = ref(database, 'submissions');
          const allSubmissionsSnapshot = await get(allSubmissionsRef);
          
          if (allSubmissionsSnapshot.exists()) {
            const submissions = allSubmissionsSnapshot.val();
            console.log('Total submissions in database:', Object.keys(submissions).length);
            
            // Find the latest submission for this assignment by this user
            const userSubmissions = Object.entries(submissions)
              .filter(([_, sub]) => {
                const match = sub.assignmentId === assignmentId && sub.studentId === user.uid;
                if (match) {
                  console.log('✅ Found matching submission:', _);
                }
                return match;
              })
              .sort((a, b) => new Date(b[1].submittedAt) - new Date(a[1].submittedAt));
            
            console.log('Matching submissions found:', userSubmissions.length);
            
            if (userSubmissions.length > 0) {
              submissionData = userSubmissions[0][1];
              console.log('✅ Using latest submission');
            } else {
              console.log('❌ No matching submissions found');
            }
          } else {
            console.log('❌ No submissions collection found');
          }
        }
        
        if (submissionData) {
          setSubmission(submissionData);
          console.log('Final submission data:', submissionData);
          console.log('Time spent value:', submissionData.timeSpent);
          console.log('Time spent type:', typeof submissionData.timeSpent);
        } else {
          console.log('❌ No submission data found at all');
        }
      }

      // Load assignment details
      const assignmentRef = ref(database, `assignments/${assignmentId}`);
      const snapshot = await get(assignmentRef);
      
      if (snapshot.exists()) {
        setAssignment(snapshot.val());
        console.log('✅ Assignment loaded');
      }

      // Show confetti for good scores
      if (submissionData?.score >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error('❌ Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-emerald-500 to-green-600';
    if (score >= 60) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const getScoreEmoji = (score) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '🌟';
    if (score >= 70) return '👍';
    if (score >= 60) return '👌';
    return '📚';
  };

  const getGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const isPassed = () => {
    const passingScore = assignment?.quiz?.passingScore || 60;
    return submission?.score >= passingScore;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Submission Found</h2>
          <p className="text-gray-400 mb-6">You haven't completed this quiz yet.</p>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl transition font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              {['🎉', '⭐', '🎊', '✨', '🏆'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/student-dashboard')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
            >
              <Home className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                QuizzApp
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${getScoreColor(submission?.score || 0)} rounded-full blur-3xl`}></div>
          </div>

          <div className="relative">
            {/* Pass/Fail Badge */}
            <div className="text-center mb-6">
              {isPassed() ? (
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-full">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">Quiz Passed!</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-full">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="text-red-400 font-bold text-lg">Keep Practicing!</span>
                </div>
              )}
            </div>

            {/* Score Display */}
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">{getScoreEmoji(submission?.score || 0)}</div>
              <div className={`inline-block text-9xl font-black bg-gradient-to-r ${getScoreColor(submission?.score || 0)} bg-clip-text text-transparent mb-2 animate-scale-in`}>
                {submission?.score || 0}%
              </div>
              <p className="text-2xl text-gray-400">
                Grade: <span className="text-white font-bold">{getGrade(submission?.score || 0)}</span>
              </p>
            </div>

            {/* Feedback */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10 text-center">
              <p className="text-gray-300 text-lg">{submission?.feedback}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 text-center">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">{submission?.earnedPoints || 0}</p>
            <p className="text-sm text-gray-400">Points Earned</p>
            <p className="text-xs text-gray-500 mt-1">out of {submission?.totalPoints || 0}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission?.results?.filter(r => r.isCorrect).length || 0}
            </p>
            <p className="text-sm text-gray-400">Correct</p>
            <p className="text-xs text-gray-500 mt-1">out of {submission?.results?.length || 0}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission?.results?.filter(r => !r.isCorrect).length || 0}
            </p>
            <p className="text-sm text-gray-400">Incorrect</p>
            <p className="text-xs text-gray-500 mt-1">answers</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 text-center">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white mb-1">
              {submission?.timeSpent || (submission?.timeSpentSeconds ? `${Math.floor(submission.timeSpentSeconds / 60)} min` : 'N/A')}
            </p>
            <p className="text-sm text-gray-400">Time Spent</p>
          </div>
        </div>

        {/* Question Review */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <span>Detailed Review</span>
            </h2>
            <div className="text-sm text-gray-400">
              Review each question and learn from mistakes
            </div>
          </div>

          <div className="space-y-6">
            {submission?.results?.map((result, index) => {
              const question = assignment?.quiz?.questions?.[result.questionIndex];
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
                                <span className="text-red-400 text-sm font-semibold">Your Answer</span>
                              )}
                              {isCorrect && (
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/student-dashboard')}
            className="flex-1 px-6 py-4 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'My Quiz Results',
                  text: `I scored ${submission.score}% on ${assignment.title}!`,
                });
              } else {
                alert('Share feature not supported on this browser');
              }
            }}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center justify-center space-x-2"
          >
            <Share2 className="w-5 h-5" />
            <span>Share Results</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes scale-in {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default QuizResults;