import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  ArrowLeft,
  Mail,
  Calendar,
  Award,
  Trophy,
  Flame,
  BookOpen,
  Target,
  Edit2,
  Save,
  X,
  Camera,
  Shield,
  User,
  Users,
  BarChart3,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { database } from '../config/firebase';
import { ref, get, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { getStudentProfile } from '../services/studentService';
import { getTeacherProfile } from '../services/teacherService';

const StudentProfile = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);

      try {
        // Get role first
        const roleRef = ref(database, `users/${currentUser.uid}/role`);
        const roleSnap = await get(roleRef);
        const userRole = roleSnap.exists() ? roleSnap.val() : 'student';
        setRole(userRole);

        // Load profile according to role
        let profileResult;
        if (userRole === 'teacher') {
          profileResult = await getTeacherProfile(currentUser.uid);
        } else {
          profileResult = await getStudentProfile(currentUser.uid);
        }

        if (profileResult?.success) {
          setProfile(profileResult.data);
          setEditedName(profileResult.data.name || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSaveProfile = async () => {
  if (!editedName.trim()) {
    setError('Name cannot be empty');
    return;
  }

  setSaving(true);
  setError('');
  setSuccess('');

  try {
    await updateProfile(auth.currentUser, {
      displayName: editedName,
    });

    // FIX: Use backticks for template literal
    const userRef = ref(database, `users/${user.uid}`);
    await update(userRef, {
      name: editedName,
    });

    setProfile((prev) => ({ ...prev, name: editedName }));
    setSuccess('Profile updated successfully!');
    setIsEditing(false);

    setTimeout(() => setSuccess(''), 3000);
  } catch (err) {
    console.error('Error updating profile:', err);
    setError('Failed to update profile. Please try again.');
  } finally {
    setSaving(false);
  }
};
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStudentAchievement = (points = 0) => {
    if (points >= 1000) return { level: 'Master', color: 'from-purple-600 to-pink-600', icon: '👑' };
    if (points >= 500) return { level: 'Expert', color: 'from-blue-600 to-cyan-600', icon: '⭐' };
    if (points >= 200) return { level: 'Advanced', color: 'from-green-600 to-emerald-600', icon: '🚀' };
    if (points >= 50) return { level: 'Intermediate', color: 'from-yellow-600 to-orange-600', icon: '📈' };
    return { level: 'Beginner', color: 'from-gray-600 to-gray-700', icon: '🌱' };
  };

  const getTeacherAchievement = (quizCount = 0) => {
    if (quizCount >= 50) return { level: 'Master Educator', color: 'from-purple-600 to-pink-600', icon: '🏆' };
    if (quizCount >= 20) return { level: 'Experienced', color: 'from-blue-600 to-cyan-600', icon: '✨' };
    if (quizCount >= 5) return { level: 'Active Teacher', color: 'from-green-600 to-emerald-600', icon: '📚' };
    return { level: 'New Instructor', color: 'from-gray-600 to-gray-700', icon: '🌱' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="mt-4 text-gray-300 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isTeacher = role === 'teacher';
  const achievement = isTeacher
    ? getTeacherAchievement(profile?.teacherStats?.totalQuizzes || 0)
    : getStudentAchievement(profile?.stats?.totalPoints || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(isTeacher ? '/teacher-dashboard' : '/student-dashboard')}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition group"
            >
              <div className="p-2 bg-white/5 rounded-xl group-hover:bg-white/10 transition border border-white/10">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-medium">Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
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
        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 overflow-hidden mb-8">
          <div className={`h-32 bg-gradient-to-r ${achievement.color} relative`}>
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          <div className="relative px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 -mt-16">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center text-6xl font-bold text-white shadow-2xl border-4 border-slate-900">
                  {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-xl hover:bg-purple-700 transition shadow-lg border-2 border-slate-900">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left pt-4">
                {!isEditing ? (
                  <div>
                    <div className="flex items-center justify-center sm:justify-start space-x-3 mb-2">
                      <h2 className="text-3xl font-bold text-white">
                        {profile?.name || user?.displayName || (isTeacher ? 'Teacher' : 'Student')}
                      </h2>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10 group"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user?.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm capitalize">{role || 'student'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          Joined {formatDate(profile?.createdAt || new Date())}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                      placeholder="Enter your name"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold disabled:opacity-50 flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(profile?.name || '');
                          setError('');
                        }}
                        className="px-4 py-2 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Achievement Badge */}
              <div className="sm:ml-auto">
                <div className={`px-6 py-3 bg-gradient-to-r ${achievement.color} rounded-2xl shadow-lg border border-white/20`}>
                  <div className="text-center">
                    <div className="text-3xl mb-1">{achievement.icon}</div>
                    <p className="text-white font-bold text-lg">{achievement.level}</p>
                    <p className="text-white/80 text-xs">{isTeacher ? 'Educator' : 'Level'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Role-specific Stats */}
        {isTeacher ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-1">Total Quizzes</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {profile?.teacherStats?.totalQuizzes || 0}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-blue-400">
                {profile?.teacherStats?.totalStudents || 0}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-1">Avg Class Score</p>
              <p className="text-3xl font-bold text-emerald-400">
                {profile?.teacherStats?.averageClassScore || 0}%
              </p>
            </div>
          </div>
        ) : (
          // Original student stats grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Total Points</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {profile?.stats?.totalPoints || 0}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/50 transition">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <Target className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-orange-400">
                {profile?.stats?.streak || 0} days
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Completed</p>
              <p className="text-3xl font-bold text-blue-400">
                {profile?.stats?.completedAssignments || 0}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/30 hover:border-emerald-500/50 transition">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-sm text-gray-400 mb-1">Average Score</p>
              <p className="text-3xl font-bold text-emerald-400">
                {profile?.stats?.averageScore || 0}%
              </p>
            </div>
          </div>
        )}

        {/* You can keep/add the Badges section only for students if you want */}
        {!isTeacher && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Award className="w-6 h-6 text-yellow-400" />
              <h3 className="text-2xl font-bold text-white">Badges & Achievements</h3>
            </div>

            {profile?.badges && profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {profile.badges.map((badge, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-2xl p-4 text-center border border-yellow-500/30 hover:scale-105 transition group"
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition">
                      {badge.icon || '🏆'}
                    </div>
                    <p className="font-bold text-white text-sm mb-1">{badge.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(badge.earnedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-white/20">
                <div className="text-6xl mb-3">🎯</div>
                <p className="text-gray-400">Complete assignments to unlock badges!</p>
              </div>
            )}
          </div>
        )}

        {/* Account Information - common for both */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-blue-400" />
            <h3 className="text-2xl font-bold text-white">Account Information</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10">
              <div>
                <p className="text-sm text-gray-400 mb-1">Email Address</p>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
              <Mail className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10">
              <div>
                <p className="text-sm text-gray-400 mb-1">Account Type</p>
                <p className="text-white font-medium">{isTeacher ? 'Teacher' : 'Student'}</p>
              </div>
              <User className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10">
              <div>
                <p className="text-sm text-gray-400 mb-1">Member Since</p>
                <p className="text-white font-medium">
                  {formatDate(profile?.createdAt || new Date())}
                </p>
              </div>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;