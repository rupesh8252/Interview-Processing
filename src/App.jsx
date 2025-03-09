import React from "react";
import { Route, Routes } from "react-router-dom";
import SetupScreen from "./pages/SetupScreen";
import VideoInterviewApp from "./pages/VideoInterviewContainer";

function App() {
  return (
    <Routes>
      <Route path="/interview" element={<VideoInterviewApp />} />
      <Route path="/" element={<SetupScreen />} />
    </Routes>
  );
}

export default App;
