import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { PageLoader } from './components/ui/LoadingSpinner.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Auth
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Landing from './pages/Landing.jsx';

// Dashboards
import StudentOverview from './pages/student/Overview.jsx';
import TraderOverview from './pages/trader/Overview.jsx';
import MentorOverview from './pages/mentor/Overview.jsx';
import InstituteOverview from './pages/institute/Overview.jsx';
import InstituteCohorts from './pages/institute/Cohorts.jsx';
import InstituteStudents from './pages/institute/Students.jsx';
import InstituteMentors from './pages/institute/Mentors.jsx';

// Student-specific
import MyMentors from './pages/student/MyMentors.jsx';

// Mentor-specific
import MentorInvitations from './pages/mentor/Invitations.jsx';
import MentorStudents, { MentorFeedbackPage } from './pages/mentor/Students.jsx';

// Shared modules
import TradingJournal from './pages/shared/TradingJournal.jsx';
import DemoTradingLab from './pages/shared/DemoTradingLab.jsx';
import FictionalMarket from './pages/shared/FictionalMarket.jsx';
import HistoricalPractice from './pages/shared/HistoricalPractice.jsx';
import RiskCalculator from './pages/shared/RiskCalculator.jsx';
import AICoach from './pages/shared/AICoach.jsx';
import Tests from './pages/shared/Tests.jsx';
import Assignments from './pages/shared/Assignments.jsx';
import LearningHub from './pages/shared/LearningHub.jsx';
import TradingDictionary from './pages/shared/TradingDictionary.jsx';
import PracticalScenarios from './pages/shared/PracticalScenarios.jsx';
import Analytics from './pages/shared/Analytics.jsx';
import Disputes from './pages/shared/Disputes.jsx';
import Settings from './pages/shared/Settings.jsx';

// ── Route guards ─────────────────────────────────────────────────────────────

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) {
    const defaults = { STUDENT: '/student', TRADER: '/trader', MENTOR: '/mentor', INSTITUTE: '/institute' };
    return <Navigate to={defaults[user.role] ?? '/login'} replace />;
  }
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Landing />;
  const defaults = { STUDENT: '/student', TRADER: '/trader', MENTOR: '/mentor', INSTITUTE: '/institute' };
  return <Navigate to={defaults[user.role] ?? '/login'} replace />;
}

// ── Routing ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* STUDENT */}
      <Route path="/student" element={<ProtectedRoute roles={['STUDENT']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<StudentOverview />} />
        <Route path="trading-lab" element={<DemoTradingLab />} />
        <Route path="fictional-market" element={<FictionalMarket />} />
        <Route path="historical-practice" element={<HistoricalPractice />} />
        <Route path="practical-scenarios" element={<PracticalScenarios />} />
        <Route path="practical-scenarios/:scenarioId" element={<PracticalScenarios />} />
        <Route path="journal" element={<TradingJournal />} />
        <Route path="risk" element={<RiskCalculator />} />
        <Route path="ai-coach" element={<AICoach />} />
        <Route path="tests" element={<Tests />} />
        <Route path="learning" element={<LearningHub />} />
        <Route path="dictionary" element={<TradingDictionary />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="mentors" element={<MyMentors />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* TRADER */}
      <Route path="/trader" element={<ProtectedRoute roles={['TRADER']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<TraderOverview />} />
        <Route path="trading-lab" element={<DemoTradingLab />} />
        <Route path="fictional-market" element={<FictionalMarket />} />
        <Route path="historical-practice" element={<HistoricalPractice />} />
        <Route path="practical-scenarios" element={<PracticalScenarios />} />
        <Route path="practical-scenarios/:scenarioId" element={<PracticalScenarios />} />
        <Route path="journal" element={<TradingJournal />} />
        <Route path="risk" element={<RiskCalculator />} />
        <Route path="ai-coach" element={<AICoach />} />
        <Route path="tests" element={<Tests />} />
        <Route path="learning" element={<LearningHub />} />
        <Route path="dictionary" element={<TradingDictionary />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* MENTOR */}
      <Route path="/mentor" element={<ProtectedRoute roles={['MENTOR']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<MentorOverview />} />
        <Route path="students" element={<MentorStudents />} />
        <Route path="invitations" element={<MentorInvitations />} />
        <Route path="tests" element={<Tests />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="dictionary" element={<TradingDictionary />} />
        <Route path="historical-practice" element={<HistoricalPractice />} />
        <Route path="practical-scenarios" element={<PracticalScenarios />} />
        <Route path="practical-scenarios/:scenarioId" element={<PracticalScenarios />} />
        <Route path="trade-reviews" element={<MentorStudents />} />
        <Route path="findings" element={<Disputes />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="feedback" element={<MentorFeedbackPage />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* INSTITUTE */}
      <Route path="/institute" element={<ProtectedRoute roles={['INSTITUTE']}><AppLayout /></ProtectedRoute>}>
        <Route index element={<InstituteOverview />} />
        <Route path="mentors" element={<InstituteMentors />} />
        <Route path="students" element={<InstituteStudents />} />
        <Route path="cohorts" element={<InstituteCohorts />} />
        <Route path="invitations" element={<MentorInvitations />} />
        <Route path="assessments" element={<Tests />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="dictionary" element={<TradingDictionary />} />
        <Route path="historical-practice" element={<HistoricalPractice />} />
        <Route path="practical-scenarios" element={<PracticalScenarios />} />
        <Route path="practical-scenarios/:scenarioId" element={<PracticalScenarios />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
