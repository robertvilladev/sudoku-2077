import { FormattedMessage } from "react-intl";
import { LoginForm } from "../features/auth/LoginForm.js";

export function LoginRoute() {
  return (
    <div>
      <h1>
        <FormattedMessage id="authLogIn" />
      </h1>
      <LoginForm />
    </div>
  );
}
