import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, Users, Play, ChevronRight, Trophy, Timer, X, 
  CheckCircle, XCircle, Crown, Medal, Award
} from 'lucide-react';
import { auth } from '../config/firebase';
import {
  createLiveSession,
  startQuiz,
  nextQuestion,
  endLiveSession,
  subscribeLiveSession,
  getLeaderboard
} from '../services/liveSessionService';
import { getQuizDetails } from '../services/teacherService';

const LiveHostDashboard = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [session, setSession] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showResults, setShowResults] = useState(false);

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
    if (!user || !quizId) return;

    let sessionUnsubscribe;

    const initSession = async () => {
      setLoading(true);
      try {
        // Get quiz details
        const quizResult = await getQuizDetails(quizId);
        if (!quizResult.success) {
          alert('Quiz not found');
          navigate('/teacher-dashboard');
          return;
        }
        
        console.log('Quiz loaded:', quizResult.data);
        setQuiz(quizResult.data);
        
        // Create live session
        const result = await createLiveSession(
          quizId,
          user.uid,
          user.displayName || user.email?.split('@')[0] || 'Teacher'
        );
        
        if (result.success) {
          console.log('Session created:', result.roomCode);
          setRoomCode(result.roomCode);
          
          // Subscribe to session updates
          sessionUnsubscribe = subscribeLiveSession(result.roomCode, (sessionData) => {
            if (sessionData) {
              console.log('Session update:', sessionData);
              setSession(sessionData);
              
              // Update participants
              if (sessionData.participants) {
                const participantsList = Object.values(sessionData.participants);
                setParticipants(participantsList);
                
                // Update leaderboard
                const sorted = [...participantsList].sort((a, b) => b.score - a.score);
                setLeaderboard(sorted);
              }
            }
          });
        } else {
          alert('Failed to create session: ' + (result.error || 'Unknown error'));
          navigate('/teacher-dashboard');
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        alert('Error: ' + error.message);
        navigate('/teacher-dashboard');
      } finally {
        setLoading(false);
      }
    };

    initSession();

    return () => {
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
      }
    };
  }, [user, quizId, navigate]);

  // Timer for questions - FIXED
  useEffect(() => {
    if (session?.status === 'playing' && session.currentQuestion >= 0 && !showResults) {
      const questionTime = session.settings.questionTime || 30;
      setTimeLeft(questionTime);
      
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Don't auto-advance - let teacher control it
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [session?.currentQuestion, session?.status, showResults]);

  const handleStartQuiz = async () => {
    if (participants.length === 0) {
      alert('Wait for at least one participant to join!');
      return;
    }
    
    console.log('Starting quiz...');
    const result = await startQuiz(roomCode);
    if (!result.success) {
      alert('Failed to start quiz: ' + (result.error || 'Unknown error'));
    }
  };

  const handleNextQuestion = async () => {
    console.log('Moving to next question...');
    setShowResults(false);
    const result = await nextQuestion(roomCode, session.currentQuestion);
    if (!result.success) {
      alert('Failed to move to next question');
    }
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this session? All participants will be disconnected.')) {
      const result = await endLiveSession(roomCode);
      if (result.success) {
        alert('Session ended successfully');
        navigate('/teacher-dashboard');
      } else {
        alert('Failed to end session: ' + (result.error || 'Unknown error'));
      }
    }
  };

  const getCurrentQuestion = () => {
    if (!session || session.currentQuestion < 0) return null;
    return session.questions[session.currentQuestion];
  };

  const getAnswerStats = () => {
    if (!participants.length) return { total: 0, answered: 0, correct: 0 };
    
    const currentQ = session.currentQuestion;
    const answered = participants.filter(p => p.answers?.[currentQ]).length;
    const correct = participants.filter(p => p.answers?.[currentQ]?.isCorrect).length;
    
    return { total: participants.length, answered, correct };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Creating live session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!loading && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Failed to Create Session</h2>
          <p className="text-gray-400 mb-6">There was an error creating the live session.</p>
          <button
            onClick={() => navigate('/teacher-dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const stats = getAnswerStats();
  const progress = session ? ((session.currentQuestion + 1) / session.questions.length) * 100 : 0;

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
                <h1 className="text-xl font-bold text-white">{quiz?.title}</h1>
                <p className="text-sm text-gray-400">Live Session Host</p>
              </div>
            </div>

            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-semibold flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>End Session</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lobby Screen */}
        {session?.status === 'lobby' && (
          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12 mb-8">
              <div className="text-8xl mb-6">🎮</div>
              <h2 className="text-4xl font-bold text-white mb-4">Waiting for Players...</h2>
              
              {/* Room Code Display */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 inline-block">
                <p className="text-white text-sm mb-2">Room Code:</p>
                <p className="text-white text-7xl font-black tracking-[0.3em]">{roomCode}</p>
              </div>

              <p className="text-gray-400 mb-8">Students can join using this room code</p>

              <div className="flex items-center justify-center space-x-4 mb-8">
                <Users className="w-8 h-8 text-blue-400" />
                <span className="text-5xl font-bold text-white">{participants.length}</span>
                <span className="text-gray-400 text-xl">participants</span>
              </div>

              {participants.length > 0 && (
                <button
                  onClick={handleStartQuiz}
                  className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/50 transition font-bold text-2xl flex items-center space-x-3 mx-auto"
                >
                  <Play className="w-8 h-8" />
                  <span>Start Quiz</span>
                </button>
              )}
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Players in Lobby</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="bg-slate-900/50 rounded-xl p-4 text-center border border-white/10"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                        {participant.name[0]?.toUpperCase() || '?'}
                      </div>
                      <p className="text-white text-sm font-semibold truncate">{participant.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions for Students */}
            <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">💡</div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-blue-400 mb-2">How Students Can Join:</h4>
                  <ol className="space-y-2 text-gray-300">
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-blue-400">1.</span>
                      <span>Students go to their dashboard and click "Live Session"</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-blue-400">2.</span>
                      <span>They enter the room code: <strong className="text-white">{roomCode}</strong></span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-blue-400">3.</span>
                      <span>They'll appear in the player list above</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="font-bold text-blue-400">4.</span>
                      <span>Click "Start Quiz" when everyone has joined!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playing Screen */}
        {session?.status === 'playing' && currentQuestion && !showResults && (
          <div>
            {/* Progress & Timer */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="text-white font-bold">
                    Question {session.currentQuestion + 1} / {session.questions.length}
                  </span>
                  <span className="text-gray-400">
                    {stats.answered} / {stats.total} answered
                  </span>
                </div>
                
                {timeLeft !== null && (
                  <div className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-mono text-3xl font-bold ${
                    timeLeft <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Timer className="w-6 h-6" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>

              <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question Display */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12 mb-8">
              <h2 className="text-4xl font-bold text-white text-center mb-12">
                {currentQuestion.question}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 border-2 border-white/10 rounded-2xl p-8 text-center"
                  >
                    <p className="text-2xl font-bold text-white">{option}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleShowResults}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-bold text-lg"
              >
                Show Results
              </button>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {(showResults || session?.status === 'results') && currentQuestion && (
          <div>
            {/* Answer Breakdown */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                Question {session.currentQuestion + 1} Results
              </h2>

              <div className="max-w-2xl mx-auto mb-8">
                <p className="text-xl text-white mb-6 text-center font-semibold">
                  {currentQuestion.question}
                </p>

                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const answeredCount = participants.filter(
                      p => p.answers?.[session.currentQuestion]?.answer === index
                    ).length;
                    const percentage = participants.length > 0
                      ? Math.round((answeredCount / participants.length) * 100)
                      : 0;

                    return (
                      <div
                        key={index}
                        className={`relative p-6 rounded-2xl border-2 ${
                          isCorrect
                            ? 'bg-emerald-500/20 border-emerald-500'
                            : 'bg-slate-900/50 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {isCorrect && <CheckCircle className="w-6 h-6 text-emerald-400" />}
                            <span className={`text-lg font-semibold ${
                              isCorrect ? 'text-emerald-400' : 'text-white'
                            }`}>
                              {option}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-white">
                            {answeredCount} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Total Answers</p>
                  <p className="text-3xl font-bold text-white">{stats.answered}</p>
                </div>
                <div className="bg-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Correct</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.correct}</p>
                </div>
                <div className="bg-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Incorrect</p>
                  <p className="text-3xl font-bold text-red-400">{stats.answered - stats.correct}</p>
                </div>
              </div>

              {/* Next Button */}
              <div className="flex justify-center">
                {session.currentQuestion + 1 < session.questions.length ? (
                  <button
                    onClick={handleNextQuestion}
                    className="px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-purple-500/50 transition font-bold text-xl flex items-center space-x-3"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => nextQuestion(roomCode, session.currentQuestion)}
                    className="px-12 py-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/50 transition font-bold text-xl flex items-center space-x-3"
                  >
                    <Trophy className="w-6 h-6" />
                    <span>Show Final Results</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Final Results */}
        {session?.status === 'results' && (
          <div>
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12 text-center mb-8">
              <div className="text-8xl mb-6">🏆</div>
              <h2 className="text-5xl font-bold text-white mb-4">Quiz Complete!</h2>
              <p className="text-xl text-gray-400">Here are the final results</p>
            </div>

            {/* Leaderboard */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <h3 className="text-3xl font-bold text-white mb-8 text-center">🎯 Final Leaderboard</h3>
              
              <div className="space-y-4 max-w-3xl mx-auto">
                {leaderboard.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-6 rounded-2xl ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500' :
                      index === 1 ? 'bg-slate-700/50 border-2 border-gray-400' :
                      index === 2 ? 'bg-orange-900/20 border-2 border-orange-700' :
                      'bg-slate-900/50 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">
                        {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-xl font-bold text-white">
                        {participant.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{participant.name}</p>
                        <p className="text-sm text-gray-400">
                          {Object.values(participant.answers || {}).filter(a => a.isCorrect).length} / {session.questions.length} correct
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-white">{participant.score}</p>
                      <p className="text-sm text-gray-400">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Leaderboard Sidebar */}
        {session?.status === 'playing' && (
          <div className="fixed top-20 right-4 w-80 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Live Leaderboard</span>
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leaderboard.slice(0, 10).map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 font-bold w-6">{index + 1}</span>
                    <p className="text-white text-sm font-semibold truncate max-w-32">
                      {participant.name}
                    </p>
                  </div>
                  <p className="text-purple-400 font-bold">{participant.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveHostDashboard;