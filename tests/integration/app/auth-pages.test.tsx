import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockSession } from "../../helpers/auth/session";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  requireSession: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
}));

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
  requireSession: hoisted.requireSession,
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    redirect: hoisted.redirect,
  };
});

vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => <div>Login form</div>,
}));

vi.mock("@/features/auth/components/register-form", () => ({
  RegisterForm: () => <div>Register form</div>,
}));

describe("auth and dashboard pages", () => {
  it("renders the login page for anonymous visitors", async () => {
    hoisted.getSession.mockResolvedValueOnce(null);

    const { default: LoginPage } = await import("@/app/login/page");

    render(await LoginPage());

    expect(screen.getByText("Login form")).toBeInTheDocument();
  });

  it("redirects authenticated users away from the login page", async () => {
    hoisted.getSession.mockResolvedValueOnce(createMockSession());

    const { default: LoginPage } = await import("@/app/login/page");

    await expect(LoginPage()).rejects.toThrow("redirected");
    expect(hoisted.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the register page for anonymous visitors", async () => {
    hoisted.getSession.mockResolvedValueOnce(null);

    const { default: RegisterPage } = await import("@/app/register/page");

    render(await RegisterPage());

    expect(screen.getByText("Register form")).toBeInTheDocument();
  });

  it("redirects authenticated users away from the register page", async () => {
    hoisted.getSession.mockResolvedValueOnce(createMockSession());

    const { default: RegisterPage } = await import("@/app/register/page");

    await expect(RegisterPage()).rejects.toThrow("redirected");
    expect(hoisted.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("protects and renders the dashboard page", async () => {
    const session = createMockSession();
    hoisted.requireSession.mockResolvedValueOnce(session);

    const { default: DashboardPage } = await import("@/app/dashboard/page");

    render(await DashboardPage());

    expect(hoisted.requireSession).toHaveBeenCalledWith("/dashboard");
    expect(screen.getByText(session.user.name)).toBeInTheDocument();
    expect(screen.getByText(session.user.email)).toBeInTheDocument();
  });
});
