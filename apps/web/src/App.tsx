import { Route, Routes } from "react-router-dom";
import { DailyChallengeRoute } from "./routes/DailyChallengeRoute.js";
import { LoginRoute } from "./routes/LoginRoute.js";
import { ProfileRoute } from "./routes/ProfileRoute.js";
import { PuzzleRoute } from "./routes/PuzzleRoute.js";
import { SignupRoute } from "./routes/SignupRoute.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DailyChallengeRoute />} />
      <Route path="/puzzles/:id" element={<PuzzleRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/profile" element={<ProfileRoute />} />
    </Routes>
  );
}
