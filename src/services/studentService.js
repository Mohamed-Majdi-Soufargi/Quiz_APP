import { ref, get, set, update, onValue } from 'firebase/database';
import { database } from '../config/firebase';

// Get student profile data
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

// Get student's assignments
export const getStudentAssignments = async (userId) => {
  try {
    const assignmentsRef = ref(database, 'assignments');
    const snapshot = await get(assignmentsRef);
    
    if (snapshot.exists()) {
      const allAssignments = snapshot.val();
      // Filter assignments for this student
      const studentAssignments = Object.entries(allAssignments)
        .filter(([_, assignment]) => 
          assignment.studentIds?.includes(userId)
        )
        .map(([id, data]) => ({ id, ...data }));
      
      return { success: true, data: studentAssignments };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return { success: false, error: error.message };
  }
};

// Get student's submissions
export const getStudentSubmissions = async (userId) => {
  try {
    const submissionsRef = ref(database, 'submissions');
    const snapshot = await get(submissionsRef);
    
    if (snapshot.exists()) {
      const allSubmissions = snapshot.val();
      const studentSubmissions = Object.entries(allSubmissions)
        .filter(([_, submission]) => submission.studentId === userId)
        .map(([id, data]) => ({ id, ...data }));
      
      return { success: true, data: studentSubmissions };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return { success: false, error: error.message };
  }
};

// Update student streak
export const updateStreak = async (userId, newStreak) => {
  try {
    const userRef = ref(database, `users/${userId}/stats/streak`);
    await set(userRef, newStreak);
    return { success: true };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { success: false, error: error.message };
  }
};

// Add badge to student
export const addBadge = async (userId, badge) => {
  try {
    const badgesRef = ref(database, `users/${userId}/badges`);
    const snapshot = await get(badgesRef);
    
    let badges = [];
    if (snapshot.exists()) {
      badges = snapshot.val() || [];
    }
    
    // Add new badge if not already exists
    if (!badges.find(b => b.id === badge.id)) {
      badges.push({
        ...badge,
        earnedAt: new Date().toISOString()
      });
      await set(badgesRef, badges);
    }
    
    return { success: true, data: badges };
  } catch (error) {
    console.error('Error adding badge:', error);
    return { success: false, error: error.message };
  }
};

// Submit assignment
export const submitAssignment = async (assignmentId, userId, answers) => {
  try {
    // Create submission ID
    const submissionId = `${assignmentId}_${userId}_${Date.now()}`;
    const submissionRef = ref(database, `submissions/${submissionId}`);
    
    // Calculate score (simple implementation - you can enhance this)
    const assignmentRef = ref(database, `assignments/${assignmentId}`);
    const assignmentSnapshot = await get(assignmentRef);
    
    if (!assignmentSnapshot.exists()) {
      return { success: false, error: 'Assignment not found' };
    }
    
    const assignment = assignmentSnapshot.val();
    const quiz = assignment.quiz; // Assuming quiz data is embedded
    
    let correctAnswers = 0;
    const totalQuestions = quiz?.questions?.length || 0;
    
    if (quiz && quiz.questions) {
      answers.forEach((answer, index) => {
        if (answer === quiz.questions[index].correctAnswer) {
          correctAnswers++;
        }
      });
    }
    
    const score = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;
    
    // Create submission
    const submission = {
      assignmentId,
      studentId: userId,
      answers,
      score,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      feedback: `You scored ${score}% (${correctAnswers}/${totalQuestions} correct)`
    };
    
    await set(submissionRef, submission);
    
    // Update assignment submission count
    const submissionsCountRef = ref(database, 
      `assignments/${assignmentId}/submissions/${userId}`);
    await set(submissionsCountRef, {
      score,
      submittedAt: submission.submittedAt,
      attempts: 1
    });
    
    return { success: true, data: submission };
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return { success: false, error: error.message };
  }
};

// Listen to real-time updates for assignments
export const subscribeToAssignments = (userId, callback) => {
  const assignmentsRef = ref(database, 'assignments');
  
  const unsubscribe = onValue(assignmentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const allAssignments = snapshot.val();
      const studentAssignments = Object.entries(allAssignments)
        .filter(([_, assignment]) => 
          assignment.studentIds?.includes(userId)
        )
        .map(([id, data]) => ({ id, ...data }));
      
      callback(studentAssignments);
    } else {
      callback([]);
    }
  });
  
  return unsubscribe;
};