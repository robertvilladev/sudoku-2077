import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../lib/auth/AuthContext.js";
import { server } from "../../test/msw/server.js";
import { SignupForm } from "./SignupForm.js";
import { TestIntlProvider } from "../../test/intl.js";

function renderSignupForm() {
  const queryClient = new QueryClient();
  return render(
    <TestIntlProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/signup"]}>
            <Routes>
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/profile" element={<p>profile</p>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </TestIntlProvider>
  );
}

describe("SignupForm", () => {
  it("translates the server's error code when signup fails", async () => {
    server.use(
      http.post("http://localhost:3000/api/auth/signup", () =>
        HttpResponse.json({ code: "AUTH_EMAIL_TAKEN", error: "Email already registered" }, { status: 409 })
      )
    );

    renderSignupForm();

    await userEvent.type(screen.getByLabelText(/email/i), "taken@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2222");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("An account with that email already exists.")
    );
  });

  it("falls back to a generic message when the error has no known code", async () => {
    server.use(
      http.post("http://localhost:3000/api/auth/signup", () =>
        HttpResponse.json({ oops: true }, { status: 502 })
      )
    );

    renderSignupForm();

    await userEvent.type(screen.getByLabelText(/email/i), "taken@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2222");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Signup failed. Try a different email.")
    );
  });
});
