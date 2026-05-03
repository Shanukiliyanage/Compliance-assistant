// Frontend route definitions for the ISO assessment flow.
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import AssessmentIntro from "./components/AssessmentIntro.jsx";
import SMEProfile from "./components/SMEProfile.jsx";
import QuestionsPage from "./components/QuestionsPage.jsx";
import Stage2Organizational from "./components/Stage2Organizational.jsx";
import Stage3People from "./components/Stage3People.jsx";
import Stage4Physical from "./components/Stage4Physical.jsx";
import Stage5Technological from "./components/Stage5Technological.jsx";
import Summary from "./components/Summary.jsx";
import RecommendationsPage from "./components/RecommendationsPage.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Intro */}
        <Route path="/" element={<AssessmentIntro />} />

        {/* SME Profile */}
        <Route path="/assessment/profile" element={<SMEProfile />} />

        {/* Stage 1 */}
        <Route path="/assessment/mandatory" element={<QuestionsPage />} />

        {/* Stage 2 */}
        <Route
          path="/assessment/organizational"
          element={<Stage2Organizational />}
        />

        {/* Stage 3 */}
        <Route path="/assessment/people" element={<Stage3People />} />

        {/* Stage 4 */}
        <Route path="/assessment/physical" element={<Stage4Physical />} />

        {/* Stage 5 */}
        <Route
          path="/assessment/technological"
          element={<Stage5Technological />}
        />

        {/* Summary */}
        <Route path="/assessment/summary/:assessmentId" element={<Summary />} />

        {/* Recommendations */}
        <Route
          path="/assessment/recommendations/:assessmentId"
          element={<RecommendationsPage />}
        />

        {/* Redirects */}
        <Route path="/assessment" element={<Navigate to="/" replace />} />
        <Route
          path="/assessment/management"
          element={<Navigate to="/assessment/mandatory" replace />}
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
