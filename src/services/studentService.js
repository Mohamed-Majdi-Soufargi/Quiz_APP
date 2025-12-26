import { ref, get, set, update, onValue, push, remove } from 'firebase/database';
import { database } from '../config/firebase';

// ==================== EXISTING FUNCTIONS (Enhanced) ====================

export const getStudentProfile = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: error.message };
  }
};

export const getStudentAssignments = async (userId) => {
  try {
    const assignmentsRef = ref(database, 'assignments');
    const snapshot = await get(assignmentsRef);
    
    if (snapshot.exists()) {
      const allAssignments = snapshot.val();
      const studentAssignments = Object.entries(allAssignments)
        .filter(([_, assignment]) => assignment.studentIds?.includes(userId))
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, data: studentAssignments };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return { success: false, error: error.message };
  }
};

export const getStudentSubmissions = async (userId) => {
  try {
    const submissionsRef = ref(database, 'submissions');
    const snapshot = await get(submissionsRef);
    
    if (snapshot.exists()) {
      const allSubmissions = snapshot.val();
      const studentSubmissions = Object.entries(allSubmissions)
        .filter(([_, submission]) => submission.studentId === userId)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      
      return { success: true, data: studentSubmissions };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return { success: false, error: error.message };
  }
};

export const subscribeToAssignments = (userId, callback) => {
  const assignmentsRef = ref(database, 'assignments');
  
  const unsubscribe = onValue(assignmentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const allAssignments = snapshot.val();
      const studentAssignments = Object.entries(allAssignments)
        .filter(([_, assignment]) => assignment.studentIds?.includes(userId))
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      callback(studentAssignments);
    } else {
      callback([]);
    }
  });
  
  return unsubscribe;
};

// ==================== NEW BADGE FUNCTIONS ====================

export const addBadge = async (userId, badge) => {
  try {
    const badgesRef = ref(database, `users/${userId}/badges`);
    const snapshot = await get(badgesRef);
    
    let badges = [];
    if (snapshot.exists()) {
      badges = snapshot.val() || [];
    }
    
    if (!badges.find(b => b.id === badge.id)) {
      badges.push({
        ...badge,
        earnedAt: new Date().toISOString()
      });
      await set(badgesRef, badges);
      
      // Add notification
      await addNotification(userId, {
        type: 'badge',
        title: '🏆 New Badge Earned!',
        message: `You earned the "${badge.name}" badge!`,
        actionUrl: '/profile'
      });
    }
    
    return { success: true, data: badges };
  } catch (error) {
    console.error('Error adding badge:', error);
    return { success: false, error: error.message };
  }
};

// Check and award badges based on achievements
export const checkAndAwardBadges = async (userId) => {
  try {
    const profile = await getStudentProfile(userId);
    if (!profile.success) return;
    
    const stats = profile.data.stats || {};
    const badges = profile.data.badges || [];
    
    // Define badge criteria
    const badgeCriteria = [
      { id: 'first_quiz', name: 'First Steps', icon: '🎯', condition: stats.completedAssignments >= 1 },
      { id: 'five_quizzes', name: 'Getting Started', icon: '📚', condition: stats.completedAssignments >= 5 },
      { id: 'ten_quizzes', name: 'Dedicated Learner', icon: '🚀', condition: stats.completedAssignments >= 10 },
      { id: 'perfect_score', name: 'Perfect Score', icon: '💯', condition: stats.averageScore === 100 },
      { id: 'high_achiever', name: 'High Achiever', icon: '⭐', condition: stats.averageScore >= 90 },
      { id: 'week_streak', name: 'Week Warrior', icon: '🔥', condition: stats.streak >= 7 },
      { id: 'month_streak', name: 'Consistency King', icon: '👑', condition: stats.streak >= 30 },
      { id: '100_points', name: 'Century', icon: '💰', condition: stats.totalPoints >= 100 },
      { id: '500_points', name: 'Point Master', icon: '💎', condition: stats.totalPoints >= 500 },
      { id: '1000_points', name: 'Legend', icon: '🏆', condition: stats.totalPoints >= 1000 }
    ];
    
    // Award new badges
    for (const badge of badgeCriteria) {
      if (badge.condition && !badges.find(b => b.id === badge.id)) {
        await addBadge(userId, { id: badge.id, name: badge.name, icon: badge.icon });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error checking badges:', error);
    return { success: false, error: error.message };
  }
};

// ==================== STATS FUNCTIONS ====================

export const updateStats = async (userId, statsUpdate) => {
  try {
    const statsRef = ref(database, `users/${userId}/stats`);
    await update(statsRef, {
      ...statsUpdate,
      lastActivityDate: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating stats:', error);
    return { success: false, error: error.message };
  }
};

export const updateStreak = async (userId) => {
  try {
    const statsRef = ref(database, `users/${userId}/stats`);
    const snapshot = await get(statsRef);
    
    let streak = 0;
    if (snapshot.exists()) {
      const stats = snapshot.val();
      const lastActivity = new Date(stats.lastActivityDate || 0);
      const today = new Date();
      const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak = (stats.streak || 0) + 1;
      } else if (diffDays === 0) {
        streak = stats.streak || 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    
    await update(statsRef, {
      streak,
      lastActivityDate: new Date().toISOString()
    });
    
    return { success: true, streak };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SUBMISSION FUNCTIONS ====================

export const submitAssignment = async (assignmentId, userId, answers) => {
  try {
    const submissionId = `${assignmentId}_${userId}_${Date.now()}`;
    
    // Get assignment details
    const assignmentRef = ref(database, `assignments/${assignmentId}`);
    const assignmentSnapshot = await get(assignmentRef);
    
    if (!assignmentSnapshot.exists()) {
      return { success: false, error: 'Assignment not found' };
    }
    
    const assignment = assignmentSnapshot.val();
    const quiz = assignment.quiz;
    
    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz?.questions?.length || 0;
    const results = [];
    
    if (quiz && quiz.questions) {
      quiz.questions.forEach((question, index) => {
        const isCorrect = answers[index] === question.correctAnswer;
        if (isCorrect) correctAnswers++;
        
        results.push({
          questionIndex: index,
          selectedAnswer: answers[index],
          correctAnswer: question.correctAnswer,
          isCorrect,
          points: isCorrect ? question.points : 0
        });
      });
    }
    
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = results.reduce((sum, r) => sum + r.points, 0);
    
    // Create submission
    const submission = {
      assignmentId,
      studentId: userId,
      answers,
      results,
      score,
      totalPoints,
      earnedPoints,
      submittedAt: new Date().toISOString(),
      status: 'graded',
      feedback: score >= (quiz.passingScore || 60) 
        ? `Great job! You passed with ${score}%` 
        : `You scored ${score}%. Keep practicing!`
    };
    
    // Save submission
    const submissionRef = ref(database, `submissions/${submissionId}`);
    await set(submissionRef, submission);
    
    // Update assignment submissions count
    await update(ref(database, `assignments/${assignmentId}`), {
      submissionsCount: (assignment.submissionsCount || 0) + 1
    });
    
    // Update student stats
    const profileResult = await getStudentProfile(userId);
    if (profileResult.success) {
      const currentStats = profileResult.data.stats || {};
      const completedCount = (currentStats.completedAssignments || 0) + 1;
      const totalScore = ((currentStats.averageScore || 0) * (completedCount - 1) + score) / completedCount;
      
      await updateStats(userId, {
        totalPoints: (currentStats.totalPoints || 0) + earnedPoints,
        completedAssignments: completedCount,
        averageScore: Math.round(totalScore)
      });
      
      // Update streak
      await updateStreak(userId);
      
      // Check and award badges
      await checkAndAwardBadges(userId);
    }
    
    return { success: true, data: submission };
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return { success: false, error: error.message };
  }
};

export const getSubmissionDetails = async (submissionId) => {
  try {
    const submissionRef = ref(database, `submissions/${submissionId}`);
    const snapshot = await get(submissionRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: 'Submission not found' };
  } catch (error) {
    console.error('Error fetching submission:', error);
    return { success: false, error: error.message };
  }
};

// ==================== NOTIFICATION FUNCTIONS ====================

export const addNotification = async (userId, notification) => {
  try {
    const notificationId = `notif_${Date.now()}`;
    const notificationRef = ref(database, `notifications/${userId}/${notificationId}`);
    
    await set(notificationRef, {
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error adding notification:', error);
    return { success: false, error: error.message };
  }
};

export const getNotifications = async (userId) => {
  try {
    const notificationsRef = ref(database, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (snapshot.exists()) {
      const notifications = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, data: notifications };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message };
  }
};

export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = ref(database, `notifications/${userId}/${notificationId}`);
    await update(notificationRef, { read: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

// ==================== LEADERBOARD FUNCTIONS ====================

export const updateLeaderboard = async (userId, points) => {
  try {
    const profile = await getStudentProfile(userId);
    if (!profile.success) return { success: false };
    
    const userData = {
      name: profile.data.name,
      points: points,
      updatedAt: new Date().toISOString()
    };
    
    // Update weekly leaderboard
    await set(ref(database, `leaderboard/weekly/${userId}`), userData);
    
    // Update all-time leaderboard
    await set(ref(database, `leaderboard/allTime/${userId}`), userData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return { success: false, error: error.message };
  }
};

export const getLeaderboard = async (type = 'weekly', limit = 10) => {
  try {
    const leaderboardRef = ref(database, `leaderboard/${type}`);
    const snapshot = await get(leaderboardRef);
    
    if (snapshot.exists()) {
      const leaderboard = Object.entries(snapshot.val())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.points - a.points)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      
      return { success: true, data: leaderboard };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { success: false, error: error.message };
  }
};