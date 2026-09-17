import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../lib/auth/AuthContext.js";
import { server } from "../../test/msw/server.js";
import { SignupForm } from "./SignupForm.js";

function renderSignupForm() {
  const queryClient = new QueryClient();
  return render(
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
  );
}

describe("SignupForm", () => {
  it("shows the server's error message when signup fails", async () => {
    server.use(
      http.post("http://localhost:3000/api/auth/signup", () =>
        HttpResponse.json({ error: "Email already registered" }, { status: 409 })
      )
    );

    renderSignupForm();

    await userEvent.type(screen.getByLabelText(/email/i), "taken@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2222");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Email already registered"));
  });
});
