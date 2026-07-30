import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";

function App() {
  return (
    <Router>
      <Routes>
        <Route index element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </Router>
  );
}

export default App
