import { Route, Routes } from "react-router-dom";
import { DifficultySelectRoute } from "./routes/DifficultySelectRoute.js";
import { LoginRoute } from "./routes/LoginRoute.js";
import { ProfileRoute } from "./routes/ProfileRoute.js";
import { PuzzleRoute } from "./routes/PuzzleRoute.js";
import { SignupRoute } from "./routes/SignupRoute.js";
import { TitleMenuRoute } from "./routes/TitleMenuRoute.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<TitleMenuRoute />} />
      <Route path="/play" element={<DifficultySelectRoute />} />
      <Route path="/puzzles/:id" element={<PuzzleRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/profile" element={<ProfileRoute />} />
    </Routes>
  );
}
