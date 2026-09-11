import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "./api.js";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate("/profile") });
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
      <button type="submit" disabled={login.isPending}>
        Log in
      </button>
      {login.isError && <p role="alert">Login failed. Check your credentials.</p>}
    </form>
  );
}
