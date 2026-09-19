import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient.js";
import { useSignup } from "./api.js";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signup = useSignup();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    signup.mutate({ email, password }, { onSuccess: () => navigate("/profile") });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </label>
      <button type="submit" disabled={signup.isPending}>
        Sign up
      </button>
      {signup.isError && (
        <p role="alert">
          {signup.error instanceof ApiError ? signup.error.message : "Signup failed. Try a different email."}
        </p>
      )}
    </form>
  );
}
