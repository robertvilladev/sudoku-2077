import { FormattedMessage } from "react-intl";
import { SignupForm } from "../features/auth/SignupForm.js";

export function SignupRoute() {
  return (
    <div>
      <h1>
        <FormattedMessage id="authSignUp" />
      </h1>
      <SignupForm />
    </div>
  );
}
