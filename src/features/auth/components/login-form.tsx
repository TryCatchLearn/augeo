"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/features/auth/client";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { type LoginFormValues, loginSchema } from "@/features/auth/schema";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, startRedirectTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const nextPath = searchParams.get("next") || "/dashboard";
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError("root", {
        message: error.message || "Unable to sign in with those credentials.",
      });
      return;
    }

    startRedirectTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  };

  return (
    <AuthFormShell
      title="Welcome back"
      description="Sign in to view watched lots, save favorites, and keep up with upcoming auctions."
      footerText="Need an account?"
      footerHref="/register"
      footerLinkLabel="Create one"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              <FieldDescription>
                Use the email associated with your account.
              </FieldDescription>
              <FieldError errors={[errors.email]} />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <FieldError errors={[errors.password]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldError errors={[errors.root]} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || isRedirecting}
        >
          Sign in
        </Button>
      </form>
    </AuthFormShell>
  );
}
