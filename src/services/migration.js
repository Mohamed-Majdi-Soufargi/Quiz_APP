import { ref, get, update, set } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Database Migration Script
 * Run this ONCE to update your existing Firebase data structure
 */

export const migrateDatabase = async () => {
  console.log('🚀 Starting database migration...');
  
  try {
    // Step 1: Migrate Users
    await migrateUsers();
    
    // Step 2: Migrate Assignments
    await migrateAssignments();
    
    // Step 3: Create empty collections
    await createCollections();
    
    console.log('✅ Migration completed successfully!');
    return { success: true, message: 'Database migrated successfully' };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};

// Migrate all users (add stats, badges, teacherStats)
const migrateUsers = async () => {
  console.log('📝 Migrating users...');
  
  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);
  
  if (!snapshot.exists()) {
    console.log('⚠️ No users found');
    return;
  }
  
  const users = snapshot.val();
  const updates = {};
  let updateCount = 0;
  
  for (const [userId, userData] of Object.entries(users)) {
    if (userData.role === 'student') {
      // Add student stats if not exists
      if (!userData.stats) {
        updates[`users/${userId}/stats`] = {
          totalPoints: 0,
          streak: 0,
          completedAssignments: 0,
          averageScore: 0,
          lastActivityDate: new Date().toISOString()
        };
        updateCount++;
      }
      
      // Add badges array if not exists
      if (!userData.badges) {
        updates[`users/${userId}/badges`] = [];
        updateCount++;
      }
    } else if (userData.role === 'teacher') {
      // Add teacher stats if not exists
      if (!userData.teacherStats) {
        updates[`users/${userId}/teacherStats`] = {
          totalQuizzes: 0,
          totalStudents: 0,
          averageClassScore: 0
        };
        updateCount++;
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
    console.log(`✅ Updated ${updateCount} user fields`);
  } else {
    console.log('✅ All users already have required fields');
  }
};

// Migrate all assignments (add new fields)
const migrateAssignments = async () => {
  console.log('📝 Migrating assignments...');
  
  const assignmentsRef = ref(database, 'assignments');
  const snapshot = await get(assignmentsRef);
  
  if (!snapshot.exists()) {
    console.log('⚠️ No assignments found');
    return;
  }
  
  const assignments = snapshot.val();
  const updates = {};
  let updateCount = 0;
  
  for (const [assignmentId, assignmentData] of Object.entries(assignments)) {
    // Add createdAt if not exists
    if (!assignmentData.createdAt) {
      updates[`assignments/${assignmentId}/createdAt`] = new Date().toISOString();
      updateCount++;
    }
    
    // Add category if not exists
    if (!assignmentData.category) {
      updates[`assignments/${assignmentId}/category`] = 'General';
      updateCount++;
    }
    
    // Add difficulty if not exists
    if (!assignmentData.difficulty) {
      updates[`assignments/${assignmentId}/difficulty`] = 'medium';
      updateCount++;
    }
    
    // Add submissionsCount if not exists
    if (assignmentData.submissionsCount === undefined) {
      updates[`assignments/${assignmentId}/submissionsCount`] = 0;
      updateCount++;
    }
    
    // Add quiz enhancements if not exists
    if (assignmentData.quiz) {
      if (!assignmentData.quiz.timeLimit) {
        updates[`assignments/${assignmentId}/quiz/timeLimit`] = 30;
        updateCount++;
      }
      if (!assignmentData.quiz.passingScore) {
        updates[`assignments/${assignmentId}/quiz/passingScore`] = 60;
        updateCount++;
      }
      if (assignmentData.quiz.shuffleQuestions === undefined) {
        updates[`assignments/${assignmentId}/quiz/shuffleQuestions`] = false;
        updateCount++;
      }
      
      // Add type and explanation to questions
      if (assignmentData.quiz.questions) {
        assignmentData.quiz.questions.forEach((question, index) => {
          if (!question.type) {
            updates[`assignments/${assignmentId}/quiz/questions/${index}/type`] = 'multiple-choice';
            updateCount++;
          }
          if (!question.explanation) {
            updates[`assignments/${assignmentId}/quiz/questions/${index}/explanation`] = '';
            updateCount++;
          }
        });
      }
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
    console.log(`✅ Updated ${updateCount} assignment fields`);
  } else {
    console.log('✅ All assignments already have required fields');
  }
};

// Create empty collections for submissions, notifications, etc.
const createCollections = async () => {
  console.log('📝 Creating empty collections...');
  
  let createCount = 0;
  
  // Check if submissions exists
  const submissionsRef = ref(database, 'submissions');
  const submissionsSnapshot = await get(submissionsRef);
  if (!submissionsSnapshot.exists()) {
    await set(ref(database, 'submissions/_init'), { created: new Date().toISOString() });
    createCount++;
  }
  
  // Check if notifications exists
  const notificationsRef = ref(database, 'notifications');
  const notificationsSnapshot = await get(notificationsRef);
  if (!notificationsSnapshot.exists()) {
    await set(ref(database, 'notifications/_init'), { created: new Date().toISOString() });
    createCount++;
  }
  
  // Check if leaderboard exists
  const leaderboardRef = ref(database, 'leaderboard');
  const leaderboardSnapshot = await get(leaderboardRef);
  if (!leaderboardSnapshot.exists()) {
    await set(ref(database, 'leaderboard/weekly/_init'), { created: new Date().toISOString() });
    await set(ref(database, 'leaderboard/allTime/_init'), { created: new Date().toISOString() });
    createCount += 2;
  }
  
  // Check if liveSessions exists
  const liveSessionsRef = ref(database, 'liveSessions');
  const liveSessionsSnapshot = await get(liveSessionsRef);
  if (!liveSessionsSnapshot.exists()) {
    await set(ref(database, 'liveSessions/_init'), { created: new Date().toISOString() });
    createCount++;
  }
  
  if (createCount > 0) {
    console.log(`✅ Created ${createCount} new collections`);
  } else {
    console.log('✅ All collections already exist');
  }
};

// Helper function to test migration (call this from console)
export const testMigration = async () => {
  console.log('🧪 Testing migration...');
  
  try {
    // Check users structure
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      const userCount = Object.keys(users).length;
      console.log(`📊 Found ${userCount} users in database`);
      
      const sampleUser = Object.values(users)[0];
      console.log('Sample user structure:');
      console.log(JSON.stringify({
        hasStats: !!sampleUser?.stats,
        hasBadges: !!sampleUser?.badges,
        hasTeacherStats: !!sampleUser?.teacherStats,
        role: sampleUser?.role,
        name: sampleUser?.name,
        email: sampleUser?.email
      }, null, 2));
      
      // Show what's missing
      const usersNeedingMigration = Object.values(users).filter(u => {
        if (u.role === 'student') {
          return !u.stats || !u.badges;
        }
        if (u.role === 'teacher') {
          return !u.teacherStats;
        }
        return false;
      });
      
      if (usersNeedingMigration.length > 0) {
        console.log(`⚠️ ${usersNeedingMigration.length} users need migration`);
      } else {
        console.log('✅ All users are up to date');
      }
    } else {
      console.log('⚠️ No users found in database');
    }
    
    // Check assignments structure
    const assignmentsRef = ref(database, 'assignments');
    const assignmentsSnapshot = await get(assignmentsRef);
    
    if (assignmentsSnapshot.exists()) {
      const assignments = assignmentsSnapshot.val();
      const assignmentCount = Object.keys(assignments).length;
      console.log(`📊 Found ${assignmentCount} assignments in database`);
      
      const sampleAssignment = Object.values(assignments)[0];
      console.log('Sample assignment structure:');
      console.log(JSON.stringify({
        hasCreatedAt: !!sampleAssignment?.createdAt,
        hasCategory: !!sampleAssignment?.category,
        hasDifficulty: !!sampleAssignment?.difficulty,
        hasSubmissionsCount: sampleAssignment?.submissionsCount !== undefined,
        hasQuizEnhancements: !!(sampleAssignment?.quiz?.timeLimit && sampleAssignment?.quiz?.passingScore),
        title: sampleAssignment?.title,
        questionsCount: sampleAssignment?.quiz?.questions?.length || 0
      }, null, 2));
      
      // Show what's missing
      const assignmentsNeedingMigration = Object.values(assignments).filter(a => {
        return !a.createdAt || !a.category || !a.difficulty || a.submissionsCount === undefined;
      });
      
      if (assignmentsNeedingMigration.length > 0) {
        console.log(`⚠️ ${assignmentsNeedingMigration.length} assignments need migration`);
      } else {
        console.log('✅ All assignments are up to date');
      }
    } else {
      console.log('⚠️ No assignments found in database');
    }
    
    // Check collections
    const collections = ['submissions', 'notifications', 'leaderboard', 'liveSessions'];
    console.log('📊 Checking collections...');
    
    for (const collection of collections) {
      const collectionRef = ref(database, collection);
      const snapshot = await get(collectionRef);
      console.log(`${snapshot.exists() ? '✅' : '❌'} ${collection}: ${snapshot.exists() ? 'exists' : 'missing'}`);
    }
    
    console.log('✅ Test complete - check details above');
  } catch (error) {
    console.error('❌ Test error:', error.message);
    throw error;
  }
};