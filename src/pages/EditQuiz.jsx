import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Brain, Save, ArrowLeft, Trash2, Plus, Check, AlertCircle, X
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ref, update, get } from 'firebase/database';
import { database } from '../config/firebase';
import { getQuizDetails } from '../services/teacherService';

const EditQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadQuiz();
        loadStudents();
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate, quizId]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const result = await getQuizDetails(quizId);
      if (result.success) {
        setQuiz(result.data);
      } else {
        alert('Quiz not found');
        navigate('/teacher-dashboard');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const students = Object.entries(users)
          .filter(([_, user]) => user.role === 'student')
          .map(([id, data]) => ({ id, ...data }));
        setAllStudents(students);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const handleSave = async () => {
    if (!quiz.title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    // Validate questions
    for (let i = 0; i < quiz.quiz.questions.length; i++) {
      const q = quiz.quiz.questions[i];
      if (!q.question.trim()) {
        alert(`Question ${i + 1} is empty`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert(`Question ${i + 1} has empty options`);
        return;
      }
      if (q.correctAnswer === null) {
        alert(`Question ${i + 1} has no correct answer selected`);
        return;
      }
    }

    setSaving(true);
    try {
      const assignmentRef = ref(database, `assignments/${quizId}`);
      await update(assignmentRef, quiz);
      
      alert('Quiz updated successfully! 🎉');
      navigate('/teacher-dashboard');
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuizChange = (field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const handleQuizSettingsChange = (field, value) => {
    setQuiz(prev => ({
      ...prev,
      quiz: { ...prev.quiz, [field]: value }
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...quiz.quiz.questions];
    newQuestions[index][field] = value;
    setQuiz(prev => ({
      ...prev,
      quiz: { ...prev.quiz, questions: newQuestions }
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...quiz.quiz.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuiz(prev => ({
      ...prev,
      quiz: { ...prev.quiz, questions: newQuestions }
    }));
  };

  const addQuestion = () => {
    setQuiz(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: [...prev.quiz.questions, {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: null,
          points: 10,
          explanation: '',
          type: 'multiple-choice'
        }]
      }
    }));
  };

  const removeQuestion = (index) => {
    if (quiz.quiz.questions.length > 1) {
      setQuiz(prev => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          questions: prev.quiz.questions.filter((_, i) => i !== index)
        }
      }));
    }
  };

  const toggleStudent = (studentId) => {
    const newStudentIds = quiz.studentIds.includes(studentId)
      ? quiz.studentIds.filter(id => id !== studentId)
      : [...quiz.studentIds, studentId];
    handleQuizChange('studentIds', newStudentIds);
  };

  if (loading || !quiz) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/teacher-dashboard')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Edit Quiz</h1>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/50 transition font-semibold flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Quiz Title *</label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => handleQuizChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
              <textarea
                value={quiz.description}
                onChange={(e) => handleQuizChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Deadline *</label>
                <input
                  type="datetime-local"
                  value={quiz.deadline}
                  onChange={(e) => handleQuizChange('deadline', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Time Limit (min)</label>
                <input
                  type="number"
                  value={quiz.quiz.timeLimit}
                  onChange={(e) => handleQuizSettingsChange('timeLimit', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Passing Score (%)</label>
                <input
                  type="number"
                  value={quiz.quiz.passingScore}
                  onChange={(e) => handleQuizSettingsChange('passingScore', parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Questions</h2>
            <p className="text-sm text-gray-400">{quiz.quiz.questions.length} questions</p>
          </div>

          <div className="space-y-6">
            {quiz.quiz.questions.map((question, qIndex) => (
              <div key={qIndex} className="bg-slate-900/50 rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-bold text-sm">
                    Question {qIndex + 1}
                  </span>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    disabled={quiz.quiz.questions.length === 1}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={question.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    placeholder="Enter question..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  />

                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-3">
                        <button
                          onClick={() => handleQuestionChange(qIndex, 'correctAnswer', optIndex)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                            question.correctAnswer === optIndex
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-600 hover:border-emerald-400'
                          }`}
                        >
                          {question.correctAnswer === optIndex && <Check className="w-5 h-5 text-white" />}
                        </button>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none transition"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)}
                      placeholder="Points"
                      className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none transition"
                    />
                    <input
                      type="text"
                      value={question.explanation}
                      onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                      placeholder="Explanation (optional)"
                      className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="w-full mt-6 py-4 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center justify-center space-x-2 border-2 border-dashed border-white/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Question</span>
          </button>
        </div>

        {/* Assigned Students */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Assigned Students ({quiz.studentIds?.length || 0})</h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allStudents.map(student => (
              <label
                key={student.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                  quiz.studentIds?.includes(student.id)
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-slate-900/50 border-white/10 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center font-bold text-white">
                    {student.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{student.name}</p>
                    <p className="text-sm text-gray-400">{student.email}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={quiz.studentIds?.includes(student.id)}
                  onChange={() => toggleStudent(student.id)}
                  className="w-5 h-5"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuiz;