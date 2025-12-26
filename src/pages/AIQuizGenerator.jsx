import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, Sparkles, ArrowLeft, Loader, CheckCircle, AlertCircle,
  BookOpen, Zap, FileText, Edit2, Save
} from 'lucide-react';
import { auth } from '../config/firebase';
import { generateQuizWithAI, generateFromText } from '../services/aiQuizService';
import { ref, push, set, get } from 'firebase/database';
import { database } from '../config/firebase';

const AIQuizGenerator = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1); // 1: Input, 2: Generating, 3: Review
  const [mode, setMode] = useState('topic'); // topic or text
  
  // Form data
  const [topic, setTopic] = useState('');
  const [customText, setCustomText] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [gradeLevel, setGradeLevel] = useState('high-school');
  
  // Generated data
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Quiz metadata
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [deadline, setDeadline] = useState('');

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

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setStep(2);

    try {
      let result;
      
      if (mode === 'topic') {
        if (!topic.trim()) {
          setError('Please enter a topic');
          setGenerating(false);
          setStep(1);
          return;
        }
        
        result = await generateQuizWithAI({
          topic,
          difficulty,
          numQuestions,
          gradeLevel
        });
      } else {
        if (!customText.trim()) {
          setError('Please enter some text');
          setGenerating(false);
          setStep(1);
          return;
        }
        
        result = await generateFromText(customText, numQuestions);
      }

      if (result.success) {
        setQuestions(result.questions);
        setQuizTitle(mode === 'topic' ? `${topic} - AI Generated Quiz` : 'AI Generated Quiz');
        setQuizDescription(`Auto-generated quiz about ${mode === 'topic' ? topic : 'provided content'}`);
        setStep(3);
      } else {
        setError(result.error || 'Failed to generate quiz');
        setStep(1);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError('An error occurred while generating the quiz');
      setStep(1);
    } finally {
      setGenerating(false);
    }
  };

  const handleQuestionEdit = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionEdit = (qIndex, optIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const handlePublish = async () => {
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title');
      return;
    }
    if (!deadline) {
      alert('Please set a deadline');
      return;
    }
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    try {
      const assignmentsRef = ref(database, 'assignments');
      const newAssignmentRef = push(assignmentsRef);
      
      const assignmentData = {
        title: quizTitle,
        description: quizDescription,
        category: 'AI Generated',
        difficulty,
        deadline,
        hostId: user.uid,
        studentIds: selectedStudents,
        quiz: {
          questions: questions,
          timeLimit: 30,
          passingScore: 60,
          shuffleQuestions: false,
          shuffleAnswers: false
        },
        status: 'open',
        submissionsCount: 0,
        createdAt: new Date().toISOString(),
        aiGenerated: true
      };

      await set(newAssignmentRef, assignmentData);
      alert('AI-Generated Quiz published successfully! 🤖✨');
      navigate('/teacher-dashboard');
    } catch (error) {
      console.error('Error publishing quiz:', error);
      alert('Failed to publish quiz');
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
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
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AI Quiz Generator</h1>
                <p className="text-xs text-gray-400">Powered by Claude AI</p>
              </div>
            </div>

            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Input */}
        {step === 1 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Generate Quiz with AI</h2>
              <p className="text-gray-400">Let AI create amazing quiz questions for you</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-300 mb-3">Generation Mode</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('topic')}
                  className={`p-6 rounded-2xl border-2 transition ${
                    mode === 'topic'
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-slate-900/50 border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <BookOpen className="w-8 h-8 text-purple-400 mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">From Topic</h3>
                  <p className="text-sm text-gray-400">Generate questions based on a topic</p>
                </button>

                <button
                  onClick={() => setMode('text')}
                  className={`p-6 rounded-2xl border-2 transition ${
                    mode === 'text'
                      ? 'bg-purple-500/20 border-purple-500'
                      : 'bg-slate-900/50 border-white/10 hover:border-purple-500/50'
                  }`}
                >
                  <FileText className="w-8 h-8 text-purple-400 mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">From Text</h3>
                  <p className="text-sm text-gray-400">Generate from your own content</p>
                </button>
              </div>
            </div>

            {/* Topic Mode */}
            {mode === 'topic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    What topic should the quiz cover? *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, World War II, Python Programming"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Questions</label>
                    <input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      min="1"
                      max="20"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Grade Level</label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                    >
                      <option value="elementary">Elementary</option>
                      <option value="middle-school">Middle School</option>
                      <option value="high-school">High School</option>
                      <option value="college">College</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Text Mode */}
            {mode === 'text' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Paste your content here *
                  </label>
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Paste an article, lesson content, or any text you want to generate questions from..."
                    rows={10}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Number of Questions</label>
                  <input
                    type="number"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    min="1"
                    max="15"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition font-bold text-lg flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              <Zap className="w-6 h-6" />
              <span>Generate Quiz with AI</span>
            </button>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 2 && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full mb-6 animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">AI is generating your quiz...</h2>
            <p className="text-gray-400 mb-8">This may take a few seconds</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Publish */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-6 flex items-center space-x-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-lg font-bold text-emerald-400">Quiz Generated Successfully!</h3>
                <p className="text-emerald-300 text-sm">Review and edit the questions below, then publish</p>
              </div>
            </div>

            {/* Quiz Metadata */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Quiz Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Quiz Title *</label>
                  <input
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                  <textarea
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Deadline *</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Generated Questions */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Generated Questions ({questions.length})</h3>
              
              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-bold text-sm">
                        Q{qIndex + 1}
                      </span>
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </div>

                    <textarea
                      value={q.question}
                      onChange={(e) => handleQuestionEdit(qIndex, 'question', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white mb-4 focus:border-purple-500 focus:outline-none transition"
                    />

                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            q.correctAnswer === optIndex
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-600'
                          }`}>
                            {q.correctAnswer === optIndex && <CheckCircle className="w-5 h-5 text-white" />}
                          </div>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionEdit(qIndex, optIndex, e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none transition"
                          />
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-blue-300">
                          <span className="font-semibold">Explanation: </span>
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Student Selection */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Assign to Students</h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allStudents.map(student => (
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
                      className="w-5 h-5"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Publish Button */}
            <div className="flex space-x-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-8 py-4 bg-slate-700 text-gray-300 rounded-xl hover:bg-slate-600 transition font-bold text-lg"
              >
                Start Over
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition font-bold text-lg flex items-center justify-center space-x-3"
              >
                <Save className="w-6 h-6" />
                <span>Publish AI Quiz</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIQuizGenerator;