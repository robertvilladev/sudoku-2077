import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../test/msw/server.js";
import { AuthProvider, useAuth } from "./AuthContext.js";

const API_BASE_URL = "http://localhost:3000";

function AuthConsumer() {
  const { accessToken, user, isInitializing, login, logout } = useAuth();
  return (
    <div>
      <p>initializing: {String(isInitializing)}</p>
      <p>token: {accessToken ?? "none"}</p>
      <p>email: {user?.email ?? "none"}</p>
      <button onClick={() => login("manual-token", { id: "user-2", email: "manual@example.com" })}>
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderConsumer() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  it("starts logged out when there is no valid refresh cookie", async () => {
    renderConsumer();

    await waitFor(() => expect(screen.getByText("initializing: false")).toBeInTheDocument());
    expect(screen.getByText("token: none")).toBeInTheDocument();
  });

  it("restores a session from a valid refresh cookie on mount", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/auth/refresh`, () =>
        HttpResponse.json({
          accessToken: "restored-token",
          user: { id: "user-1", email: "player@example.com" },
        })
      )
    );

    renderConsumer();

    await waitFor(() => expect(screen.getByText("token: restored-token")).toBeInTheDocument());
    expect(screen.getByText("email: player@example.com")).toBeInTheDocument();
  });

  it("logout calls the endpoint and clears state", async () => {
    let logoutCalled = false;
    server.use(
      http.post(`${API_BASE_URL}/api/auth/logout`, () => {
        logoutCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderConsumer();
    await waitFor(() => expect(screen.getByText("initializing: false")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(screen.getByText("token: manual-token")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() => expect(screen.getByText("token: none")).toBeInTheDocument());
    expect(logoutCalled).toBe(true);
  });
});
