import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, Trophy, Timer, Zap, CheckCircle, XCircle, Crown, Home
} from 'lucide-react';
import { auth } from '../config/firebase';
import {
  joinLiveSession,
  leaveLiveSession,
  submitLiveAnswer,
  subscribeLiveSession
} from '../services/liveSessionService';

const LiveStudentSession = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myData, setMyData] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);

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
    if (!user || !roomCode) return;

    let sessionUnsubscribe;

    const initializeSession = async () => {
      setLoading(true);
      try {
        const result = await joinLiveSession(
          roomCode,
          user.uid,
          user.displayName || user.email?.split('@')[0] || 'Student'
        );

        if (!result.success) {
          alert(result.error || 'Failed to join session');
          navigate('/student-dashboard');
          return;
        }

        // Subscribe to session updates
        sessionUnsubscribe = subscribeLiveSession(roomCode, (sessionData) => {
          if (!sessionData) {
            alert('Session ended');
            navigate('/student-dashboard');
            return;
          }

          console.log('Session update:', sessionData); // Debug log

          setSession(sessionData);

          // Get my data
          if (sessionData.participants && sessionData.participants[user.uid]) {
            setMyData(sessionData.participants[user.uid]);
          }

          // Reset answer state when question changes
          if (sessionData.currentQuestion !== session?.currentQuestion) {
            setSelectedAnswer(null);
            setHasAnswered(false);
            setAnswerResult(null);
            setQuestionStartTime(Date.now());
          }
        });
      } catch (error) {
        console.error('Error joining session:', error);
        alert('Failed to join session');
        navigate('/student-dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
      }
    };
  }, [user, roomCode, navigate]);

  // Timer
  useEffect(() => {
    if (session?.status === 'playing' && session.currentQuestion >= 0 && !hasAnswered) {
      const questionTime = session.settings.questionTime;
      setTimeLeft(questionTime);

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session?.currentQuestion, session?.status, hasAnswered]);

  const handleAnswerSelect = async (answerIndex) => {
    // Prevent multiple clicks - MULTIPLE LAYERS OF PROTECTION
    if (hasAnswered || selectedAnswer !== null || !questionStartTime) {
      console.warn('Answer already submitted or invalid state');
      return;
    }

    // Immediately set state to prevent double-clicks
    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    // Calculate time spent
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      // Submit answer to server
      const result = await submitLiveAnswer(
        roomCode,
        user.uid,
        session.currentQuestion,
        answerIndex,
        timeSpent
      );

      if (result.success) {
        setAnswerResult({
          isCorrect: result.isCorrect,
          points: result.points
        });
      } else if (result.alreadyAnswered) {
        // Server detected duplicate submission
        console.error('Server rejected: Already answered');
        // Keep the locked state, don't allow retry
      } else {
        // Other error - could reset state if needed
        console.error('Submission failed:', result.error);
        // For now, keep locked to prevent exploits
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      // Keep locked state even on error to prevent exploits
    }
  };

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave?')) {
      await leaveLiveSession(roomCode, user.uid);
      navigate('/student-dashboard');
    }
  };

  const getCurrentQuestion = () => {
    if (!session || session.currentQuestion < 0) return null;
    return session.questions[session.currentQuestion];
  };

  const getMyRank = () => {
    if (!session?.participants || !user) return 0;
    const sorted = Object.values(session.participants).sort((a, b) => b.score - a.score);
    return sorted.findIndex(p => p.id === user.uid) + 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Joining session...</p>
        </div>
      </div>
    );
  }

  // Show error state if no session after loading
  if (!loading && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">The room code may be invalid or the session has ended.</p>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const myRank = getMyRank();
  const participantCount = session?.participants ? Object.keys(session.participants).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{session?.quizTitle}</h1>
                <p className="text-sm text-gray-400">Room: {roomCode}</p>
              </div>
            </div>

            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-semibold"
            >
              Leave
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lobby */}
        {session?.status === 'lobby' && (
          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12">
              <div className="text-8xl mb-6">⏳</div>
              <h2 className="text-4xl font-bold text-white mb-4">Waiting to Start...</h2>
              <p className="text-xl text-gray-400 mb-8">The teacher will start the quiz soon</p>

              <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="text-6xl">👥</div>
                <span className="text-5xl font-bold text-white">{participantCount}</span>
                <span className="text-xl text-gray-400">players</span>
              </div>

              {/* My Info */}
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 inline-block">
                <p className="text-gray-300 mb-2">You're in as:</p>
                <p className="text-3xl font-bold text-white">{myData?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Playing */}
        {session?.status === 'playing' && currentQuestion && (
          <div>
            {/* Stats Bar */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <div>
                      <p className="text-xs text-gray-400">Your Score</p>
                      <p className="text-2xl font-bold text-white">{myData?.score || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Crown className="w-6 h-6 text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-400">Your Rank</p>
                      <p className="text-2xl font-bold text-white">#{myRank}</p>
                    </div>
                  </div>
                </div>

                {!hasAnswered && timeLeft !== null && (
                  <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-mono text-3xl font-bold ${
                    timeLeft <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Timer className="w-6 h-6" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Question */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
              <div className="mb-8">
                <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-bold">
                  Question {session.currentQuestion + 1} / {session.questions.length}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-12 text-center">
                {currentQuestion.question}
              </h2>

              {/* Answer Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const showResult = hasAnswered && answerResult;
                  const isCorrect = showResult && index === currentQuestion.correctAnswer;
                  const isMyWrongAnswer = showResult && isSelected && !answerResult.isCorrect;
                  const isDisabled = hasAnswered || selectedAnswer !== null;

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isDisabled}
                      className={`relative p-8 rounded-2xl border-4 transition-all transform ${
                        isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:scale-105 active:scale-95'
                      } ${
                        isCorrect
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-xl shadow-emerald-500/50'
                          : isMyWrongAnswer
                          ? 'bg-red-500/20 border-red-500 shadow-xl shadow-red-500/50'
                          : isSelected && !hasAnswered
                          ? 'bg-purple-500/20 border-purple-500 shadow-xl shadow-purple-500/50 scale-105'
                          : isDisabled
                          ? 'bg-slate-900/30 border-white/5'
                          : 'bg-slate-900/50 border-white/10 hover:border-purple-500/50 hover:bg-slate-900/70'
                      }`}
                    >
                      {isCorrect && (
                        <div className="absolute top-4 right-4 animate-bounce">
                          <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                      )}
                      {isMyWrongAnswer && (
                        <div className="absolute top-4 right-4 animate-pulse">
                          <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                      )}
                      <p className={`text-2xl font-bold transition ${
                        isDisabled && !isCorrect && !isMyWrongAnswer ? 'text-gray-500' : 'text-white'
                      }`}>
                        {option}
                      </p>
                      
                      {/* Lock indicator for disabled buttons */}
                      {isDisabled && !isCorrect && !isMyWrongAnswer && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-2xl">
                          <span className="text-4xl opacity-30">🔒</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Answer Feedback */}
            {hasAnswered && answerResult && (
              <div className={`bg-gradient-to-r ${
                answerResult.isCorrect
                  ? 'from-emerald-600/20 to-green-600/20 border-emerald-500'
                  : 'from-red-600/20 to-pink-600/20 border-red-500'
              } backdrop-blur-xl rounded-2xl border-2 p-8 text-center animate-scale-in`}>
                <div className="text-6xl mb-4 animate-bounce">
                  {answerResult.isCorrect ? '🎉' : '😅'}
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  {answerResult.isCorrect ? 'Correct!' : 'Not quite!'}
                </h3>
                {answerResult.isCorrect && (
                  <p className="text-xl text-white font-bold mb-3">
                    +{answerResult.points} points
                  </p>
                )}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-gray-300">Waiting for other players...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final Results */}
        {session?.status === 'results' && (
          <div>
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12 text-center mb-8">
              <div className="text-8xl mb-6">
                {myRank === 1 ? '👑' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎯'}
              </div>
              <h2 className="text-5xl font-bold text-white mb-4">
                {myRank === 1 ? 'You Won!' : 'Quiz Complete!'}
              </h2>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                #{myRank} Place
              </p>
              <p className="text-4xl font-bold text-white mb-2">{myData?.score || 0} points</p>
              <p className="text-gray-400">
                {Object.values(myData?.answers || {}).filter(a => a.isCorrect).length} / {session.questions.length} correct
              </p>
            </div>

            {/* Final Leaderboard */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Final Standings</h3>
              <div className="space-y-3">
                {Object.values(session.participants || {})
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10)
                  .map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        participant.id === user.uid
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-white w-8">
                          {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <p className="text-lg font-semibold text-white">{participant.name}</p>
                        {participant.id === user.uid && (
                          <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-xs font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">{participant.score}</p>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => navigate('/student-dashboard')}
                className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-bold text-lg flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LiveStudentSession;