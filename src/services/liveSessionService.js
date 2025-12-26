import { ref, set, get, update, onValue, push, remove } from 'firebase/database';
import { database } from '../config/firebase';

// Generate random room code
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create live session
export const createLiveSession = async (quizId, hostId, hostName) => {
  try {
    // Get quiz data
    const quizRef = ref(database, `assignments/${quizId}`);
    const quizSnapshot = await get(quizRef);
    
    if (!quizSnapshot.exists()) {
      return { success: false, error: 'Quiz not found' };
    }
    
    const quizData = quizSnapshot.val();
    const roomCode = generateRoomCode();
    
    // Create session
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const sessionData = {
      roomCode,
      hostId,
      hostName,
      quizId,
      quizTitle: quizData.title,
      questions: quizData.quiz.questions,
      currentQuestion: -1,
      status: 'lobby',
      participants: {},
      createdAt: new Date().toISOString(),
      settings: {
        questionTime: quizData.quiz.timeLimit ? Math.floor((quizData.quiz.timeLimit * 60) / quizData.quiz.questions.length) : 30,
        showLeaderboard: true
      }
    };
    
    await set(sessionRef, sessionData);
    
    return { success: true, roomCode, sessionData };
  } catch (error) {
    console.error('Error creating live session:', error);
    return { success: false, error: error.message };
  }
};

// Join live session
export const joinLiveSession = async (roomCode, studentId, studentName) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: 'Room not found' };
    }
    
    const session = snapshot.val();
    
    if (session.status === 'ended') {
      return { success: false, error: 'Session has ended' };
    }
    
    // Add participant
    const participantRef = ref(database, `liveSessions/${roomCode}/participants/${studentId}`);
    await set(participantRef, {
      id: studentId,
      name: studentName,
      score: 0,
      answers: {},
      joinedAt: new Date().toISOString(),
      status: 'active'
    });
    
    return { success: true, session };
  } catch (error) {
    console.error('Error joining session:', error);
    return { success: false, error: error.message };
  }
};

// Leave live session
export const leaveLiveSession = async (roomCode, studentId) => {
  try {
    const participantRef = ref(database, `liveSessions/${roomCode}/participants/${studentId}`);
    await remove(participantRef);
    return { success: true };
  } catch (error) {
    console.error('Error leaving session:', error);
    return { success: false, error: error.message };
  }
};

// Start quiz
export const startQuiz = async (roomCode) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    await update(sessionRef, {
      status: 'playing',
      currentQuestion: 0,
      questionStartTime: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error starting quiz:', error);
    return { success: false, error: error.message };
  }
};

// Move to next question
export const nextQuestion = async (roomCode, currentQuestionIndex) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: 'Session not found' };
    }
    
    const session = snapshot.val();
    const totalQuestions = session.questions.length;
    
    if (currentQuestionIndex + 1 >= totalQuestions) {
      // Quiz complete - save submissions for all participants
      await saveSessionSubmissions(roomCode);
      
      // End quiz
      await update(sessionRef, {
        status: 'results',
        currentQuestion: totalQuestions
      });
    } else {
      // Next question
      await update(sessionRef, {
        currentQuestion: currentQuestionIndex + 1,
        questionStartTime: new Date().toISOString()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error moving to next question:', error);
    return { success: false, error: error.message };
  }
};

// NEW FUNCTION: Save all participant scores as submissions
const saveSessionSubmissions = async (roomCode) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) return;
    
    const session = snapshot.val();
    const participants = session.participants || {};
    const quizId = session.quizId;
    const questions = session.questions;
    
    // Save submission for each participant
    for (const [studentId, participant] of Object.entries(participants)) {
      const submissionId = `${quizId}_${studentId}_${Date.now()}`;
      
      // Build results array (needed for QuizResults page)
      const results = [];
      const answers = {};
      
      for (let i = 0; i < questions.length; i++) {
        const userAnswer = participant.answers?.[i];
        const question = questions[i];
        
        if (userAnswer) {
          // User answered this question
          results.push({
            questionIndex: i,
            selectedAnswer: userAnswer.answer,
            correctAnswer: question.correctAnswer,
            isCorrect: userAnswer.isCorrect,
            points: userAnswer.points || 0
          });
          answers[i] = userAnswer.answer;
        } else {
          // User didn't answer - mark as incorrect
          results.push({
            questionIndex: i,
            selectedAnswer: null,
            correctAnswer: question.correctAnswer,
            isCorrect: false,
            points: 0
          });
          answers[i] = null;
        }
      }
      
      // Calculate totals
      const correctCount = results.filter(r => r.isCorrect).length;
      const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
      const earnedPoints = results.reduce((sum, r) => sum + r.points, 0);
      
      // Create submission matching the format expected by QuizResults
      const submission = {
        assignmentId: quizId,
        studentId: studentId,
        answers: answers,
        results: results, // THIS IS CRITICAL for QuizResults page
        score: score,
        totalPoints: totalPoints,
        earnedPoints: earnedPoints,
        submittedAt: new Date().toISOString(),
        status: 'graded',
        isLiveSession: true,
        roomCode: roomCode,
        feedback: score >= 60 
          ? `Great job! You scored ${score}% in the live session!` 
          : `You scored ${score}% in the live session. Keep practicing!`
      };
      
      // Save submission
      const submissionRef = ref(database, `submissions/${submissionId}`);
      await set(submissionRef, submission);
      
      console.log(`✅ Saved submission for student ${studentId}: ${score}% (${correctCount}/${questions.length} correct)`);
    }
    
    // Update assignment submissions count
    const assignmentRef = ref(database, `assignments/${quizId}`);
    const assignmentSnapshot = await get(assignmentRef);
    
    if (assignmentSnapshot.exists()) {
      const assignment = assignmentSnapshot.val();
      await update(assignmentRef, {
        submissionsCount: (assignment.submissionsCount || 0) + Object.keys(participants).length
      });
    }
    
    console.log(`✅ Saved ${Object.keys(participants).length} submissions from live session`);
  } catch (error) {
    console.error('❌ Error saving session submissions:', error);
  }
};

// Submit answer for live session
export const submitLiveAnswer = async (roomCode, studentId, questionIndex, answer, timeSpent) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const snapshot = await get(sessionRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: 'Session not found' };
    }
    
    const session = snapshot.val();
    const question = session.questions[questionIndex];
    
    // Check participant exists
    const participantRef = ref(database, `liveSessions/${roomCode}/participants/${studentId}`);
    const participantSnapshot = await get(participantRef);
    
    if (!participantSnapshot.exists()) {
      return { success: false, error: 'Participant not found' };
    }
    
    const participant = participantSnapshot.val();
    
    // ⚠️ CRITICAL: Check if already answered this question
    if (participant.answers?.[questionIndex]) {
      console.warn(`Student ${studentId} already answered question ${questionIndex}`);
      return { 
        success: false, 
        error: 'Already answered',
        alreadyAnswered: true 
      };
    }
    
    const isCorrect = answer === question.correctAnswer;
    
    // Calculate points (faster = more points)
    let points = 0;
    if (isCorrect) {
      const maxTime = session.settings.questionTime;
      const timeBonus = Math.max(0, (maxTime - timeSpent) / maxTime);
      points = Math.round(question.points * (0.5 + 0.5 * timeBonus));
    }
    
    // Update participant answer and score
    const newScore = (participant.score || 0) + points;
    
    await update(participantRef, {
      score: newScore,
      [`answers/${questionIndex}`]: {
        answer,
        isCorrect,
        points,
        timeSpent,
        submittedAt: new Date().toISOString()
      }
    });
    
    return { success: true, isCorrect, points };
  } catch (error) {
    console.error('Error submitting answer:', error);
    return { success: false, error: error.message };
  }
};

// End live session - NOW SAVES SUBMISSIONS
export const endLiveSession = async (roomCode) => {
  try {
    // First, save all submissions
    await saveSessionSubmissions(roomCode);
    
    // Then mark session as ended
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    await update(sessionRef, {
      status: 'ended',
      endedAt: new Date().toISOString()
    });
    
    // Optional: Delete session after saving (or keep for history)
    // await remove(sessionRef);
    
    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to live session updates
export const subscribeLiveSession = (roomCode, callback) => {
  const sessionRef = ref(database, `liveSessions/${roomCode}`);
  
  const unsubscribe = onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

// Get leaderboard
export const getLeaderboard = async (roomCode) => {
  try {
    const participantsRef = ref(database, `liveSessions/${roomCode}/participants`);
    const snapshot = await get(participantsRef);
    
    if (!snapshot.exists()) {
      return { success: true, data: [] };
    }
    
    const participants = snapshot.val();
    const leaderboard = Object.values(participants)
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({ ...p, rank: index + 1 }));
    
    return { success: true, data: leaderboard };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return { success: false, error: error.message };
  }
};

// Check if room code exists
export const checkRoomExists = async (roomCode) => {
  try {
    const sessionRef = ref(database, `liveSessions/${roomCode}`);
    const snapshot = await get(sessionRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking room:', error);
    return false;
  }
};