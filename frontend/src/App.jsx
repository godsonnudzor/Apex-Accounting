import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  BrowserRouter,
} from "react-router-dom";
import Login from "./Pages/Login";
import SignUp from "./Pages/signUp";

function App() {

  return (
   <Router>
    <Routes>
       <Route index element={<Login/>}/>
       <Route path='/SignUp' element={<SignUp/>}/>
    </Routes>
   </Router>
  )
}

export default App
