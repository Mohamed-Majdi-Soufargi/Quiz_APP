import { ref, get, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';

// ==================== TEACHER PROFILE ====================

export const getTeacherProfile = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: 'Teacher not found' };
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== QUIZ MANAGEMENT ====================

export const getTeacherQuizzes = async (userId) => {
  try {
    const assignmentsRef = ref(database, 'assignments');
    const snapshot = await get(assignmentsRef);
    
    if (snapshot.exists()) {
      const allAssignments = snapshot.val();
      // Support both 'hostId' (old) and 'createdBy' (new) fields
      const teacherQuizzes = Object.entries(allAssignments)
        .filter(([_, assignment]) => 
          assignment.hostId === userId || assignment.createdBy === userId
        )
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, data: teacherQuizzes };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return { success: false, error: error.message };
  }
};

export const getQuizDetails = async (quizId) => {
  try {
    const assignmentRef = ref(database, `assignments/${quizId}`);
    const snapshot = await get(assignmentRef);
    
    if (snapshot.exists()) {
      return { success: true, data: { id: quizId, ...snapshot.val() } };
    }
    return { success: false, error: 'Quiz not found' };
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return { success: false, error: error.message };
  }
};

export const createQuiz = async (teacherId, quizData) => {
  try {
    const quizId = `quiz_${Date.now()}`;
    const assignmentRef = ref(database, `assignments/${quizId}`);
    
    const newQuiz = {
      ...quizData,
      id: quizId,
      createdBy: teacherId,
      hostId: teacherId, // Keep for backwards compatibility
      createdAt: new Date().toISOString(),
      submissionsCount: 0,
      studentIds: quizData.studentIds || []
    };
    
    await set(assignmentRef, newQuiz);
    
    // Update teacher stats
    await updateTeacherStats(teacherId, { totalQuizzes: 1 });
    
    return { success: true, data: newQuiz };
  } catch (error) {
    console.error('Error creating quiz:', error);
    return { success: false, error: error.message };
  }
};

export const updateQuiz = async (quizId, updates) => {
  try {
    const assignmentRef = ref(database, `assignments/${quizId}`);
    await update(assignmentRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating quiz:', error);
    return { success: false, error: error.message };
  }
};

export const updateQuizStatus = async (quizId, status) => {
  try {
    const assignmentRef = ref(database, `assignments/${quizId}`);
    await update(assignmentRef, { 
      status,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating quiz status:', error);
    return { success: false, error: error.message };
  }
};

export const deleteQuiz = async (quizId, teacherId) => {
  try {
    const assignmentRef = ref(database, `assignments/${quizId}`);
    await remove(assignmentRef);
    
    // Update teacher stats if teacherId provided
    if (teacherId) {
      await updateTeacherStats(teacherId, { totalQuizzes: -1 });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return { success: false, error: error.message };
  }
};

// ==================== STUDENT MANAGEMENT ====================

export const getTeacherStudents = async (teacherId = null) => {
  try {
    if (teacherId) {
      // Get students assigned to teacher's quizzes
      const assignmentsResult = await getTeacherQuizzes(teacherId);
      if (!assignmentsResult.success) return { success: true, data: [] };
      
      // Collect unique student IDs
      const studentIds = new Set();
      assignmentsResult.data.forEach(assignment => {
        (assignment.studentIds || []).forEach(id => studentIds.add(id));
      });
      
      // Fetch student details
      const students = [];
      for (const studentId of studentIds) {
        const userRef = ref(database, `users/${studentId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const studentData = snapshot.val();
          students.push({
            id: studentId,
            ...studentData,
            completedQuizzes: studentData.stats?.completedAssignments || 0,
            averageScore: studentData.stats?.averageScore || 0,
            lastActive: studentData.stats?.lastActivityDate || new Date().toISOString()
          });
        }
      }
      
      return { success: true, data: students };
    } else {
      // Get all students (for dropdown/selection)
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const students = Object.entries(users)
          .filter(([_, user]) => user.role === 'student')
          .map(([id, data]) => ({ id, ...data }));
        
        return { success: true, data: students };
      }
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    return { success: false, error: error.message };
  }
};

export const assignQuizToStudents = async (quizId, studentIds) => {
  try {
    const assignmentRef = ref(database, `assignments/${quizId}`);
    await update(assignmentRef, {
      studentIds: studentIds,
      updatedAt: new Date().toISOString()
    });
    
    // Create notifications for each student
    for (const studentId of studentIds) {
      await addNotificationForStudent(studentId, {
        type: 'assignment',
        title: '📝 New Assignment',
        message: 'You have a new quiz assignment!',
        actionUrl: `/assignment/${quizId}`
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error assigning quiz:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SUBMISSIONS & GRADING ====================

export const getRecentSubmissions = async (userId, limit = 10) => {
  try {
    const submissionsRef = ref(database, 'submissions');
    const snapshot = await get(submissionsRef);
    
    if (!snapshot.exists()) {
      return { success: true, data: [] };
    }

    // Get teacher's assignments first
    const assignmentsRef = ref(database, 'assignments');
    const assignmentsSnapshot = await get(assignmentsRef);
    
    if (!assignmentsSnapshot.exists()) {
      return { success: true, data: [] };
    }

    const assignments = assignmentsSnapshot.val();
    const teacherAssignmentIds = Object.entries(assignments)
      .filter(([_, assignment]) => 
        assignment.hostId === userId || assignment.createdBy === userId
      )
      .map(([id]) => id);

    // Filter submissions for teacher's assignments
    const allSubmissions = snapshot.val();
    const teacherSubmissions = [];
    
    for (const [submissionId, submission] of Object.entries(allSubmissions)) {
      if (teacherAssignmentIds.includes(submission.assignmentId)) {
        // Get student name
        const studentRef = ref(database, `users/${submission.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentName = studentSnapshot.exists() 
          ? studentSnapshot.val().name 
          : 'Unknown Student';
        
        // Get quiz title
        const quiz = assignments[submission.assignmentId];
        const quizTitle = quiz ? quiz.title : 'Unknown Quiz';
        
        teacherSubmissions.push({
          id: submissionId,
          ...submission,
          studentName,
          quizTitle
        });
      }
    }
    
    // Sort by submission date and limit
    teacherSubmissions.sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    
    return { 
      success: true, 
      data: teacherSubmissions.slice(0, limit) 
    };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return { success: false, error: error.message };
  }
};

export const getQuizSubmissions = async (quizId) => {
  try {
    const submissionsRef = ref(database, 'submissions');
    const snapshot = await get(submissionsRef);
    
    if (!snapshot.exists()) {
      return { success: true, data: [] };
    }
    
    const allSubmissions = snapshot.val();
    const quizSubmissions = [];
    
    for (const [submissionId, submission] of Object.entries(allSubmissions)) {
      if (submission.assignmentId === quizId) {
        // Get student details
        const studentRef = ref(database, `users/${submission.studentId}`);
        const studentSnapshot = await get(studentRef);
        const studentData = studentSnapshot.exists() 
          ? studentSnapshot.val() 
          : { name: 'Unknown Student', email: '' };
        
        quizSubmissions.push({
          id: submissionId,
          ...submission,
          studentName: studentData.name,
          studentEmail: studentData.email
        });
      }
    }
    
    // Sort by submission date
    quizSubmissions.sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    
    return { success: true, data: quizSubmissions };
  } catch (error) {
    console.error('Error fetching quiz submissions:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ANALYTICS ====================

export const getQuizAnalytics = async (quizId) => {
  try {
    const submissionsResult = await getQuizSubmissions(quizId);
    if (!submissionsResult.success || submissionsResult.data.length === 0) {
      return {
        success: true,
        data: {
          totalSubmissions: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
          scoreDistribution: []
        }
      };
    }
    
    const submissions = submissionsResult.data;
    const scores = submissions.map(s => s.score);
    
    const analytics = {
      totalSubmissions: submissions.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
      scoreDistribution: [
        { range: '0-20', count: scores.filter(s => s >= 0 && s < 20).length },
        { range: '20-40', count: scores.filter(s => s >= 20 && s < 40).length },
        { range: '40-60', count: scores.filter(s => s >= 40 && s < 60).length },
        { range: '60-80', count: scores.filter(s => s >= 60 && s < 80).length },
        { range: '80-100', count: scores.filter(s => s >= 80 && s <= 100).length }
      ],
      recentSubmissions: submissions.slice(0, 5)
    };
    
    return { success: true, data: analytics };
  } catch (error) {
    console.error('Error calculating analytics:', error);
    return { success: false, error: error.message };
  }
};

export const getTeacherAnalytics = async (teacherId) => {
  try {
    const quizzesResult = await getTeacherQuizzes(teacherId);
    const studentsResult = await getTeacherStudents(teacherId);
    const submissionsResult = await getRecentSubmissions(teacherId, 1000);
    
    if (!quizzesResult.success || !studentsResult.success || !submissionsResult.success) {
      return { success: false, error: 'Failed to fetch analytics data' };
    }
    
    const quizzes = quizzesResult.data;
    const students = studentsResult.data;
    const submissions = submissionsResult.data;
    
    const analytics = {
      overview: {
        totalQuizzes: quizzes.length,
        totalStudents: students.length,
        totalSubmissions: submissions.length,
        averageClassScore: students.length > 0
          ? Math.round(students.reduce((sum, s) => sum + (s.averageScore || 0), 0) / students.length)
          : 0
      },
      recentActivity: submissions.slice(0, 10),
      topPerformers: students
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
        .slice(0, 5),
      quizPerformance: quizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        submissions: submissions.filter(s => s.assignmentId === quiz.id).length,
        averageScore: calculateAverageScore(submissions, quiz.id)
      }))
    };
    
    return { success: true, data: analytics };
  } catch (error) {
    console.error('Error fetching teacher analytics:', error);
    return { success: false, error: error.message };
  }
};

// ==================== HELPER FUNCTIONS ====================

const updateTeacherStats = async (teacherId, updates) => {
  try {
    const statsRef = ref(database, `users/${teacherId}/teacherStats`);
    const snapshot = await get(statsRef);
    
    const currentStats = snapshot.exists() ? snapshot.val() : {
      totalQuizzes: 0,
      totalStudents: 0,
      averageClassScore: 0
    };
    
    const newStats = {
      ...currentStats,
      totalQuizzes: Math.max(0, (currentStats.totalQuizzes || 0) + (updates.totalQuizzes || 0))
    };
    
    await set(statsRef, newStats);
    return { success: true };
  } catch (error) {
    console.error('Error updating teacher stats:', error);
    return { success: false, error: error.message };
  }
};

const addNotificationForStudent = async (studentId, notification) => {
  try {
    const notificationId = `notif_${Date.now()}`;
    const notificationRef = ref(database, `notifications/${studentId}/${notificationId}`);
    
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

const calculateAverageScore = (submissions, quizId) => {
  const quizSubmissions = submissions.filter(s => s.assignmentId === quizId);
  if (quizSubmissions.length === 0) return 0;
  
  const totalScore = quizSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
  return Math.round(totalScore / quizSubmissions.length);
};