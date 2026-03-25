import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";

const hoisted = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  useSearchParams: vi.fn(),
}));

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      push,
      refresh,
    }),
    useSearchParams: hoisted.useSearchParams,
  };
});

vi.mock("@/features/auth/client", () => ({
  authClient: {
    signIn: {
      email: hoisted.signInEmail,
    },
    signUp: {
      email: hoisted.signUpEmail,
    },
  },
}));

describe("auth forms", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    hoisted.signInEmail.mockReset();
    hoisted.signUpEmail.mockReset();
    hoisted.useSearchParams.mockReturnValue(
      new URLSearchParams("next=%2Fdashboard%2Flistings"),
    );
  });

  it("submits the login form and redirects to the next path", async () => {
    hoisted.signInEmail.mockResolvedValue({ error: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "seller@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(hoisted.signInEmail).toHaveBeenCalledWith({
        email: "seller@example.com",
        password: "secret123",
      });
    });
    expect(push).toHaveBeenCalledWith("/dashboard/listings");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the login error message returned by auth client", async () => {
    hoisted.signInEmail.mockResolvedValue({
      error: { message: "Unable to sign in with those credentials." },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "seller@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Unable to sign in with those credentials."),
    ).toBeInTheDocument();
  });

  it("submits the register form and redirects to the dashboard", async () => {
    hoisted.signUpEmail.mockResolvedValue({ error: null });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Augeo Seller" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "seller@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(hoisted.signUpEmail).toHaveBeenCalledWith({
        name: "Augeo Seller",
        email: "seller@example.com",
        password: "secret123",
      });
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows register validation and auth errors", async () => {
    hoisted.signUpEmail.mockResolvedValue({
      error: { message: "Unable to create your account right now." },
    });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Augeo Seller" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "seller@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Passwords do not match."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Unable to create your account right now."),
    ).toBeInTheDocument();
  });
});
