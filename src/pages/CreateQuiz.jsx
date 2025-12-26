import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Plus, Trash2, Edit2, Save, ArrowLeft, ArrowRight, 
  BookOpen, Clock, Target, Users, Eye, CheckCircle, AlertCircle,
  X, Check, Sparkles
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ref, push, set, get } from 'firebase/database';
import { database } from '../config/firebase';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Questions, 3: Students, 4: Preview
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);

  // Quiz Data
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'medium',
    deadline: '',
    timeLimit: 30,
    passingScore: 60,
    shuffleQuestions: false,
    shuffleAnswers: false,
  });

  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: null,
      points: 10,
      explanation: '',
      type: 'multiple-choice'
    }
  ]);

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadStudents();
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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

  const handleQuizDataChange = (field, value) => {
    setQuizData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: null,
      points: 10,
      explanation: '',
      type: 'multiple-choice'
    }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const duplicateQuestion = (index) => {
    const newQuestion = { ...questions[index] };
    setQuestions([...questions.slice(0, index + 1), newQuestion, ...questions.slice(index + 1)]);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(allStudents.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!quizData.title.trim()) {
        alert('Please enter a quiz title');
        return false;
      }
      if (!quizData.deadline) {
        alert('Please set a deadline');
        return false;
      }
    }
    
    if (currentStep === 2) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) {
          alert(`Question ${i + 1} is empty`);
          return false;
        }
        if (q.options.some(opt => !opt.trim())) {
          alert(`Question ${i + 1} has empty options`);
          return false;
        }
        if (q.correctAnswer === null) {
          alert(`Question ${i + 1} has no correct answer selected`);
          return false;
        }
      }
    }
    
    if (currentStep === 3) {
      if (selectedStudents.length === 0) {
        alert('Please select at least one student');
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handlePublish = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      const assignmentsRef = ref(database, 'assignments');
      const newAssignmentRef = push(assignmentsRef);
      
      const assignmentData = {
        ...quizData,
        hostId: user.uid,
        studentIds: selectedStudents,
        quiz: {
          questions: questions,
          timeLimit: quizData.timeLimit,
          passingScore: quizData.passingScore,
          shuffleQuestions: quizData.shuffleQuestions,
          shuffleAnswers: quizData.shuffleAnswers
        },
        status: 'open',
        submissionsCount: 0,
        createdAt: new Date().toISOString()
      };

      await set(newAssignmentRef, assignmentData);

      alert('Quiz published successfully! 🎉');
      navigate('/teacher-dashboard');
    } catch (error) {
      console.error('Error publishing quiz:', error);
      alert('Failed to publish quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = allStudents.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  };

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
              <div>
                <h1 className="text-xl font-bold text-white">Create New Quiz</h1>
                <p className="text-xs text-gray-400">Step {step} of 4</p>
              </div>
            </div>

            <div className="w-32"></div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {['Basic Info', 'Questions', 'Students', 'Preview'].map((label, index) => (
                <div
                  key={index}
                  className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    step > index + 1 ? 'bg-emerald-500 border-emerald-500' :
                    step === index + 1 ? 'bg-purple-500 border-purple-500' :
                    'bg-slate-700 border-slate-600'
                  }`}>
                    {step > index + 1 ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step === index + 1 ? 'text-white' : 'text-gray-500'
                  } hidden sm:inline`}>
                    {label}
                  </span>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-4 rounded ${
                      step > index + 1 ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Basic Information</h2>
              <p className="text-gray-400">Set up the fundamental details of your quiz</p>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={quizData.title}
                  onChange={(e) => handleQuizDataChange('title', e.target.value)}
                  placeholder="e.g., Chapter 5: Photosynthesis Quiz"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => handleQuizDataChange('description', e.target.value)}
                  placeholder="Brief description of what this quiz covers..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
              </div>

              {/* Category & Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={quizData.category}
                    onChange={(e) => handleQuizDataChange('category', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  >
                    <option>General</option>
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>History</option>
                    <option>English</option>
                    <option>Programming</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={quizData.difficulty}
                    onChange={(e) => handleQuizDataChange('difficulty', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={quizData.deadline}
                  onChange={(e) => handleQuizDataChange('deadline', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
              </div>

              {/* Quiz Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={quizData.timeLimit}
                    onChange={(e) => handleQuizDataChange('timeLimit', parseInt(e.target.value))}
                    min="1"
                    max="180"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for unlimited time</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={quizData.passingScore}
                    onChange={(e) => handleQuizDataChange('passingScore', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10 cursor-pointer hover:border-purple-500/50 transition">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-6 rounded-full transition ${
                      quizData.shuffleQuestions ? 'bg-purple-500' : 'bg-slate-600'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition transform ${
                        quizData.shuffleQuestions ? 'translate-x-6' : 'translate-x-0.5'
                      } mt-0.5`}></div>
                    </div>
                    <span className="text-white font-medium">Shuffle Questions</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quizData.shuffleQuestions}
                    onChange={(e) => handleQuizDataChange('shuffleQuestions', e.target.checked)}
                    className="hidden"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/10 cursor-pointer hover:border-purple-500/50 transition">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-6 rounded-full transition ${
                      quizData.shuffleAnswers ? 'bg-purple-500' : 'bg-slate-600'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full transition transform ${
                        quizData.shuffleAnswers ? 'translate-x-6' : 'translate-x-0.5'
                      } mt-0.5`}></div>
                    </div>
                    <span className="text-white font-medium">Shuffle Answer Options</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={quizData.shuffleAnswers}
                    onChange={(e) => handleQuizDataChange('shuffleAnswers', e.target.checked)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center space-x-2"
              >
                <span>Continue to Questions</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Add Questions</h2>
                  <p className="text-gray-400">Create engaging questions for your quiz</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Questions</p>
                  <p className="text-3xl font-bold text-purple-400">{questions.length}</p>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div
                    key={qIndex}
                    className="bg-slate-900/50 rounded-2xl border border-white/10 p-6"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-bold text-sm">
                        Question {qIndex + 1}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => duplicateQuestion(qIndex)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                          title="Duplicate"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          disabled={questions.length === 1}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Question Text *
                      </label>
                      <textarea
                        value={question.question}
                        onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                        placeholder="Enter your question here..."
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                      />
                    </div>

                    {/* Options */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Answer Options *
                      </label>
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
                              {question.correctAnswer === optIndex && (
                                <Check className="w-5 h-5 text-white" />
                              )}
                            </button>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Click the circle to mark the correct answer</p>
                    </div>

                    {/* Points & Explanation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Points
                        </label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Explanation (Optional)
                        </label>
                        <input
                          type="text"
                          value={question.explanation}
                          onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                          placeholder="Explain the correct answer..."
                          className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <button
                onClick={addQuestion}
                className="w-full mt-6 py-4 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center justify-center space-x-2 border-2 border-dashed border-white/20"
              >
                <Plus className="w-5 h-5" />
                <span>Add Another Question</span>
              </button>

              {/* Stats */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-400">Total Points:</span>
                  <span className="text-white font-bold text-lg">{getTotalPoints()}</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={prevStep}
                className="px-8 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center space-x-2"
              >
                <span>Continue to Students</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Students */}
        {step === 3 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Assign to Students</h2>
              <p className="text-gray-400">Select which students should take this quiz</p>
            </div>

            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students by name or email..."
                  className="w-full px-4 py-3 pl-10 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllStudents}
                  className="px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition font-semibold"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllStudents}
                  className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Selected Count */}
            <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Selected Students:</span>
                <span className="text-2xl font-bold text-purple-400">{selectedStudents.length}</span>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map(student => (
                <label
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedStudents.includes(student.id)
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
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="w-5 h-5 rounded border-2 border-gray-600 checked:bg-purple-500 checked:border-purple-500"
                  />
                </label>
              ))}
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No students found</p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={prevStep}
                className="px-8 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl hover:shadow-purple-500/50 transition font-semibold flex items-center space-x-2"
              >
                <span>Preview Quiz</span>
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Publish */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Preview & Publish</h2>
                <p className="text-gray-400">Review your quiz before publishing</p>
              </div>

              {/* Quiz Info Summary */}
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-white mb-4">{quizData.title}</h3>
                <p className="text-gray-300 mb-4">{quizData.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-400">Questions</p>
                    <p className="text-xl font-bold text-white">{questions.length}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <Clock className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-400">Time Limit</p>
                    <p className="text-xl font-bold text-white">{quizData.timeLimit}m</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <Target className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-400">Pass Score</p>
                    <p className="text-xl font-bold text-white">{quizData.passingScore}%</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <Users className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-400">Students</p>
                    <p className="text-xl font-bold text-white">{selectedStudents.length}</p>
                  </div>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="space-y-4 mb-6">
                <h4 className="text-lg font-bold text-white">Questions Preview</h4>
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                        Q{index + 1}
                      </span>
                      <p className="text-white font-medium flex-1">{question.question}</p>
                      <span className="text-sm text-gray-400">{question.points}pts</span>
                    </div>
                    <div className="ml-8 space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded text-sm ${
                            question.correctAnswer === optIndex
                              ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                              : 'text-gray-400'
                          }`}
                        >
                          {option} {question.correctAnswer === optIndex && '✓'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Students Preview */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-white mb-3">Assigned Students ({selectedStudents.length})</h4>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedStudents.map(studentId => {
                      const student = allStudents.find(s => s.id === studentId);
                      return student ? (
                        <span
                          key={studentId}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm"
                        >
                          {student.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold mb-1">Ready to publish?</p>
                  <p className="text-sm text-amber-300">
                    Once published, students will be able to see and take this quiz. 
                    You can edit or delete it later if needed.
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="px-8 py-3 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-semibold flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{loading ? 'Publishing...' : 'Publish Quiz'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuiz;