"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
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
import { type LoginFormValues, loginSchema } from "@/lib/schemas/auth";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    console.log("login form submitted", values);
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

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          Sign in
        </Button>
      </form>
    </AuthFormShell>
  );
}
