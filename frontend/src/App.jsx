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


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        <Route index element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Deshboard />} />
        <Route path="/EmployeeDashboard" element={<EmployeeDashboard />} />
        <Route path="/bill" element={<Bill />} />
        <Route path="/write-cheque" element={<WriteCheque />} />
        <Route path="/invoice" element={<Bill />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App
