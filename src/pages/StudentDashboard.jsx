import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { logout } from '../services/authService';
import {
  getStudentProfile,
  getStudentAssignments,
  getStudentSubmissions,
  subscribeToAssignments
} from '../services/studentService';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments'); // assignments, live, stats
  const [roomCode, setRoomCode] = useState('');

  // Check authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadStudentData(currentUser.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Load student data
  const loadStudentData = async (userId) => {
    setLoading(true);
    try {
      // Get profile
      const profileResult = await getStudentProfile(userId);
      if (profileResult.success) {
        setProfile(profileResult.data);
      }

      // Get assignments
      const assignmentsResult = await getStudentAssignments(userId);
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data);
      }

      // Get submissions
      const submissionsResult = await getStudentSubmissions(userId);
      if (submissionsResult.success) {
        setSubmissions(submissionsResult.data);
      }

      // Subscribe to real-time assignment updates
      const unsubscribe = subscribeToAssignments(userId, (updatedAssignments) => {
        setAssignments(updatedAssignments);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/login');
    }
  };

  // Get assignment status
  const getAssignmentStatus = (assignment) => {
    const submission = submissions.find(s => s.assignmentId === assignment.id);
    if (submission) return 'submitted';

    const deadline = new Date(assignment.deadline);
    const now = new Date();
    const hoursUntilDue = (deadline - now) / (1000 * 60 * 60);

    if (now > deadline) return 'overdue';
    if (hoursUntilDue < 24) return 'due-soon';
    return 'assigned';
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'bg-green-100 text-green-800',
      'due-soon': 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      assigned: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      submitted: 'Submitted',
      'due-soon': 'Due Soon',
      overdue: 'Overdue',
      assigned: 'Assigned'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle join live session
  const handleJoinLive = () => {
    if (roomCode.trim()) {
      navigate(`/live-session/${roomCode}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-purple-600">QuizMaster</h1>
              <span className="text-sm text-gray-500">Student Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.name || user?.displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="text-3xl font-bold text-purple-600">
                  {profile?.stats?.totalPoints || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">
                  {profile?.stats?.streak || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assignments</p>
                <p className="text-3xl font-bold text-blue-600">{assignments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Badges Earned</p>
                <p className="text-3xl font-bold text-green-600">
                  {profile?.badges?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'assignments'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Assignments ({assignments.length})
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'live'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎮 Join Live Session
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'stats'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 My Stats
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">My Assignments</h2>
                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl">📚</span>
                    <p className="mt-4 text-gray-500">No assignments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => {
                      const status = getAssignmentStatus(assignment);
                      const submission = submissions.find(s => s.assignmentId === assignment.id);
                      
                      return (
                        <div
                          key={assignment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {assignment.title || 'Untitled Assignment'}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {assignment.description || 'No description'}
                              </p>
                            </div>
                            {getStatusBadge(status)}
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>⏰ Due: {formatDate(assignment.deadline)}</span>
                              <span>❓ {assignment.quiz?.questions?.length || 0} Questions</span>
                              {submission && (
                                <span className="text-green-600 font-semibold">
                                  ✓ Score: {submission.score}%
                                </span>
                              )}
                            </div>
                            
                            {status !== 'submitted' && status !== 'overdue' && (
                              <button
                                onClick={() => navigate(`/assignment/${assignment.id}`)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                              >
                                Start Assignment
                              </button>
                            )}
                            
                            {status === 'submitted' && (
                              <button
                                onClick={() => navigate(`/assignment/${assignment.id}/review`)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                              >
                                View Results
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Live Session Tab */}
            {activeTab === 'live' && (
              <div className="max-w-md mx-auto text-center py-8">
                <span className="text-6xl">🎮</span>
                <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Join Live Quiz Session</h2>
                <p className="text-gray-600 mb-6">Enter the room code provided by your teacher</p>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter Room Code (e.g., ABC123)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-center text-2xl font-bold tracking-widest"
                    maxLength={6}
                  />
                  
                  <button
                    onClick={handleJoinLive}
                    disabled={!roomCode.trim()}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
                  >
                    Join Session
                  </button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Room codes are usually 6 characters long and are case-insensitive
                  </p>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">My Statistics</h2>
                
                {/* Badges Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏅 Badges Earned</h3>
                  {profile?.badges?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profile.badges.map((badge, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg p-4 text-center"
                        >
                          <span className="text-4xl">{badge.icon || '🏆'}</span>
                          <p className="mt-2 font-semibold text-gray-900">{badge.name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(badge.earnedAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <span className="text-4xl">🎯</span>
                      <p className="mt-2 text-gray-500">Complete assignments to earn badges!</p>
                    </div>
                  )}
                </div>

                {/* Recent Submissions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Recent Performance</h3>
                  {submissions.length > 0 ? (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map((submission) => (
                        <div
                          key={submission.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              Assignment {submission.assignmentId.slice(0, 8)}...
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(submission.submittedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              submission.score >= 80 ? 'text-green-600' :
                              submission.score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {submission.score}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <span className="text-4xl">📊</span>
                      <p className="mt-2 text-gray-500">No submissions yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;