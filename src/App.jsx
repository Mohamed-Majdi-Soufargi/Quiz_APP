import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentProfile from './pages/StudentProfile';
import MigrationPage from './pages/MigrationPage';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import CreateQuiz from './pages/CreateQuiz';
import EditQuiz from './pages/EditQuiz';
import LiveHostDashboard from './pages/LiveHostDashboard';
import LiveStudentSession from './pages/LiveStudentSession';
import QuizDetailsPage from './pages/QuizDetailsPage';
import AIQuizGenerator from './pages/AIQuizGenerator';
import SubmissionDetails from './pages/SubmissionDetails';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/migrate" element={<MigrationPage />} />
        <Route path="/assignment/:assignmentId" element={<QuizTaking />} />
        <Route path="/assignment/:assignmentId/results" element={<QuizResults />} />
        <Route path="/assignment/:assignmentId/review" element={<QuizResults />} />
        <Route path="/create-quiz" element={<CreateQuiz />} />
        <Route path="/quiz/:quizId/edit" element={<EditQuiz />} />
        <Route path="/quiz/:quizId/view" element={<QuizDetailsPage />} />  
        <Route path="/live-host/:quizId" element={<LiveHostDashboard />} />
        <Route path="/live-session/:roomCode" element={<LiveStudentSession />} />
        <Route path="/ai-quiz-generator" element={<AIQuizGenerator />} />
        <Route path="/submission/:submissionId" element={<SubmissionDetails />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;