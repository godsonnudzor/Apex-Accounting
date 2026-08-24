import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";
import Deshboard from "./Pages/Deshboard";
import EmployeeDashboard from "./Pages/EmployeeDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route index element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Deshboard />} />
        <Route path="/EmployeeDashboard" element={<EmployeeDashboard />} />
      </Routes>
    </Router>
  );
}

export default App
