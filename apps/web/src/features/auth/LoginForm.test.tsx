import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider, useAuth } from "../../lib/auth/AuthContext.js";
import { LoginForm } from "./LoginForm.js";

function ProfileStub() {
  const { accessToken } = useAuth();
  return <p>token: {accessToken}</p>;
}

function renderLoginForm() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/profile" element={<ProfileStub />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("LoginForm", () => {
  it("logs in against the (mocked) auth endpoint and navigates to the profile page", async () => {
    renderLoginForm();

    await userEvent.type(screen.getByLabelText(/email/i), "player@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2222");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByText(/token: test-token/)).toBeInTheDocument());
  });
});
