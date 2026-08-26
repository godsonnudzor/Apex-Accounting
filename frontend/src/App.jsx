import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";
import Deshboard from "./Pages/Deshboard";
import EmployeeDashboard from "./Pages/EmployeeDashboard";
import Bill from "./Pages/Bill";
import WriteCheque from "./Pages/WriteCheque";
import AuthProvider from "./context/authContext";
import Setting from "./Pages/Setting";
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/authContext";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return user.role === "admin" ? children : <Navigate to="/EmployeeDashboard" replace />;
}


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        <Route index element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<AdminRoute><Deshboard /></AdminRoute>} />
        <Route path="/EmployeeDashboard" element={<EmployeeDashboard />} />
        <Route path="/bill" element={<AdminRoute><Bill /></AdminRoute>} />
        <Route path="/write-cheque" element={<AdminRoute><WriteCheque /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><Setting /></AdminRoute>} />
        <Route path="/invoice" element={<AdminRoute><Bill /></AdminRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App
