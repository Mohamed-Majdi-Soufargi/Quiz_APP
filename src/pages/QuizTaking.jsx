import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, Clock, Award, AlertCircle, ChevronLeft, ChevronRight, 
  CheckCircle, XCircle, Flag, ArrowLeft, Timer, Target, BookOpen
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ref, get, push, set } from 'firebase/database';
import { database } from '../config/firebase';

const QuizTaking = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auth check
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

  // Load assignment
  useEffect(() => {
    if (user) {
      loadAssignment();
    }
  }, [user, assignmentId]);

  // Timer
  useEffect(() => {
    if (quizStarted && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizStarted, timeLeft]);

  const loadAssignment = async () => {
    setLoading(true);
    try {
      const assignmentRef = ref(database, `assignments/${assignmentId}`);
      const snapshot = await get(assignmentRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAssignment(data);
        
        // Initialize answers array
        const numQuestions = data.quiz?.questions?.length || 0;
        setAnswers(new Array(numQuestions).fill(null));
        
        // Set timer if time limit exists
        if (data.quiz?.timeLimit) {
          setTimeLeft(data.quiz.timeLimit * 60); // Convert to seconds
        }
      } else {
        alert('Assignment not found');
        navigate('/student-dashboard');
      }
    } catch (error) {
      console.error('Error loading assignment:', error);
      alert('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
  };

  const handleAnswerSelect = (answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < assignment.quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleQuestionJump = (index) => {
    setCurrentQuestion(index);
  };

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const handleAutoSubmit = async () => {
    await handleFinalSubmit();
  };

  const calculateResults = () => {
    console.log('🔍 Calculating results...');
    console.log('Start time:', startTime);
    console.log('Current time:', Date.now());
    
    const questions = assignment.quiz.questions;
    let totalPoints = 0;
    let earnedPoints = 0;
    const results = [];

    questions.forEach((question, index) => {
      const selectedAnswer = answers[index];
      const isCorrect = selectedAnswer === question.correctAnswer;
      const points = question.points || 1;

      totalPoints += points;
      if (isCorrect) {
        earnedPoints += points;
      }

      results.push({
        questionIndex: index,
        selectedAnswer: selectedAnswer !== null ? selectedAnswer : -1,
        correctAnswer: question.correctAnswer,
        isCorrect,
        pointsEarned: isCorrect ? points : 0
      });
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    
    // Calculate time spent
    const timeSpentSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
    const timeSpentDisplay = timeSpentMinutes > 0 ? `${timeSpentMinutes} min` : `${timeSpentSeconds} sec`;

    console.log('Time spent seconds:', timeSpentSeconds);
    console.log('Time spent display:', timeSpentDisplay);

    // Generate feedback
    let feedback = '';
    if (score >= 90) {
      feedback = '🎉 Outstanding! You have mastered this material!';
    } else if (score >= 80) {
      feedback = '⭐ Excellent work! You have a strong understanding.';
    } else if (score >= 70) {
      feedback = '👍 Good job! You\'re on the right track.';
    } else if (score >= 60) {
      feedback = '👌 You passed! Review the material to improve further.';
    } else {
      feedback = '📚 Keep studying! You\'ll do better next time.';
    }

    const resultData = {
      score,
      earnedPoints,
      totalPoints,
      results,
      feedback,
      timeSpent: timeSpentDisplay,
      timeSpentSeconds
    };

    console.log('📊 Final calculated results:', resultData);

    return resultData;
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      console.log('🚀 Starting submission...');
      const calculatedResults = calculateResults();
      
      console.log('✅ Results calculated:', calculatedResults);
      
      // Create submission object
      const submissionData = {
        assignmentId,
        studentId: user.uid,
        studentName: user.displayName || user.email,
        studentEmail: user.email,
        submittedAt: new Date().toISOString(),
        ...calculatedResults
      };

      console.log('📦 Submission data to save:', submissionData);

      // Save to database
      const submissionsRef = ref(database, 'submissions');
      const newSubmissionRef = push(submissionsRef);
      await set(newSubmissionRef, submissionData);

      console.log('✅ Saved to submissions/', newSubmissionRef.key);

      // Also save under assignment
      const assignmentSubmissionRef = ref(database, `assignments/${assignmentId}/submissions/${user.uid}`);
      await set(assignmentSubmissionRef, {
        submissionId: newSubmissionRef.key,
        score: calculatedResults.score,
        submittedAt: submissionData.submittedAt
      });

      console.log('✅ Saved to assignments/', assignmentId);
      console.log('🎉 Navigation to results with data:', {
        id: newSubmissionRef.key,
        ...submissionData
      });

      // Navigate to results with the submission data
      navigate(`/assignment/${assignmentId}/results`, { 
        state: { 
          submission: {
            id: newSubmissionRef.key,
            ...submissionData
          }
        }
      });
    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      alert('An error occurred while submitting. Please try again.');
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    navigate('/student-dashboard');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return answers.filter(a => a !== null).length;
  };

  const getUnansweredCount = () => {
    return answers.filter(a => a === null).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Pre-Quiz Screen
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <button
            onClick={() => navigate('/student-dashboard')}
            className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 shadow-2xl">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{assignment?.title}</h1>
              <p className="text-gray-400">{assignment?.description}</p>
            </div>

            {/* Quiz Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 text-center">
                <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{assignment?.quiz?.questions?.length}</p>
                <p className="text-sm text-gray-400">Questions</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 text-center">
                <Timer className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {assignment?.quiz?.timeLimit ? `${assignment.quiz.timeLimit} min` : 'Unlimited'}
                </p>
                <p className="text-sm text-gray-400">Time Limit</p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 text-center">
                <Target className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{assignment?.quiz?.passingScore || 60}%</p>
                <p className="text-sm text-gray-400">Passing Score</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Instructions</span>
              </h3>
              <ul className="text-gray-300 space-y-2 text-sm">
                <li>• Read each question carefully before answering</li>
                <li>• You can navigate between questions using Previous/Next buttons</li>
                <li>• You can change your answers before submitting</li>
                {assignment?.quiz?.timeLimit && (
                  <li className="text-orange-400 font-semibold">• Quiz will auto-submit when time runs out</li>
                )}
                <li>• Click "Submit Quiz" when you're done to see your results</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition font-bold text-lg"
            >
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Interface
  const question = assignment.quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / assignment.quiz.questions.length) * 100;
  const isLastQuestion = currentQuestion === assignment.quiz.questions.length - 1;
  const selectedAnswer = answers[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Quiz Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Exit Quiz</span>
            </button>

            <div className="flex items-center space-x-4">
              {timeLeft !== null && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${
                  timeLeft < 300 ? 'bg-red-500/20 border-red-500/50 text-red-400' : 
                  timeLeft < 600 ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                  'bg-blue-500/20 border-blue-500/50 text-blue-400'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
              )}

              <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold">
                  {currentQuestion + 1} / {assignment.quiz.questions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Question Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          {/* Question */}
          <div className="mb-8">
            <div className="flex items-start space-x-3 mb-4">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-bold text-sm">
                Q{currentQuestion + 1}
              </span>
              <h2 className="text-2xl font-bold text-white flex-1">
                {question.question}
              </h2>
            </div>
            <p className="text-gray-400 text-sm ml-12">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-5 rounded-xl border-2 transition text-left flex items-center space-x-4 group ${
                  selectedAnswer === index
                    ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-900/50 border-white/10 hover:border-purple-500/50 hover:bg-slate-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedAnswer === index
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-600 group-hover:border-purple-400'
                }`}>
                  {selectedAnswer === index && (
                    <CheckCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className={`text-lg ${
                  selectedAnswer === index ? 'text-white font-semibold' : 'text-gray-300'
                }`}>
                  {option}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitClick}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/50 transition font-semibold flex items-center space-x-2"
              >
                <Flag className="w-5 h-5" />
                <span>Submit Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Question Navigator</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {assignment.quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => handleQuestionJump(index)}
                className={`aspect-square rounded-lg font-bold text-sm transition ${
                  index === currentQuestion
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                    : answers[index] !== null
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-700 text-gray-400 border border-white/10 hover:border-purple-500/50'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span className="text-gray-400">Answered: {getAnsweredCount()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-slate-700 rounded"></div>
              <span className="text-gray-400">Unanswered: {getUnansweredCount()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl border border-purple-500/30 p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl mb-4">
                <Flag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Submit Quiz?</h3>
              <p className="text-gray-400">You won't be able to change your answers after submitting</p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Questions:</span>
                <span className="text-white font-semibold">{assignment.quiz.questions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Answered:</span>
                <span className="text-emerald-400 font-semibold">{getAnsweredCount()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Unanswered:</span>
                <span className="text-red-400 font-semibold">{getUnansweredCount()}</span>
              </div>
              {timeLeft !== null && (
                <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                  <span className="text-gray-400">Time Remaining:</span>
                  <span className="text-blue-400 font-semibold">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>

            {getUnansweredCount() > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  You have {getUnansweredCount()} unanswered question{getUnansweredCount() > 1 ? 's' : ''}. 
                  These will be marked as incorrect.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold disabled:opacity-50"
              >
                Review Answers
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/50 transition font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl border border-purple-500/30 p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-2xl mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Exit Quiz?</h3>
              <p className="text-gray-400">Your progress will be lost if you exit now</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-6 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold"
              >
                Continue Quiz
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
              >
                Exit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTaking;