import { useState, type FormEvent } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "../../lib/i18n/errorMessage.js";
import { useSignup } from "./api.js";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signup = useSignup();
  const navigate = useNavigate();
  const intl = useIntl();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    signup.mutate({ email, password }, { onSuccess: () => navigate("/profile") });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <FormattedMessage id="authEmail" />
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label>
        <FormattedMessage id="authPassword" />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </label>
      <button type="submit" disabled={signup.isPending}>
        <FormattedMessage id="authSignUp" />
      </button>
      {signup.isError && <p role="alert">{errorMessage(intl, signup.error, "authSignupFailed")}</p>}
    </form>
  );
}
