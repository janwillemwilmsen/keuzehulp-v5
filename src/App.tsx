import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuestionnaireEditor from './pages/admin/QuestionnaireEditor';
import ScoringRules from './pages/admin/ScoringRules';
import ContractTypesEditor from './pages/admin/ContractTypesEditor';
import BrandThemes from './pages/admin/BrandThemes';
import Login from './pages/admin/Login';
import WizardEntry from './pages/wizard/WizardEntry';
import WizardStep from './pages/wizard/WizardStep';
import WizardResults from './pages/wizard/WizardResults';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { WizardProvider } from './pages/wizard/WizardContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/questionnaires/:id" 
            element={
              <ProtectedRoute>
                <QuestionnaireEditor />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/admin/scoring-rules"
            element={
              <ProtectedRoute>
                <ScoringRules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/contract-types"
            element={
              <ProtectedRoute>
                <ContractTypesEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/brand-themes"
            element={
              <ProtectedRoute>
                <BrandThemes />
              </ProtectedRoute>
            }
          />
          
          {/* Wizard Routes */}
          <Route element={<WizardProvider><Outlet /></WizardProvider>}>
            <Route path="/keuzehulp/:id" element={<WizardEntry />} />
            <Route path="/keuzehulp/:id/q/:questionIndex" element={<WizardStep />} />
            <Route path="/keuzehulp/:id/results" element={<WizardResults />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
