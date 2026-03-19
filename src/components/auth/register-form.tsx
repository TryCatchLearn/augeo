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
import { type RegisterFormValues, registerSchema } from "@/lib/schemas/auth";

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    console.log("register form submitted", values);
  };

  return (
    <AuthFormShell
      title="Create your account"
      description="Set up your profile to follow upcoming listings and join the bidding when auctions open."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Log in"
    >
      <form className="space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.displayName)}>
            <FieldLabel htmlFor="register-display-name">
              Display Name
            </FieldLabel>
            <FieldContent>
              <Input
                id="register-display-name"
                placeholder="How your name appears"
                aria-invalid={Boolean(errors.displayName)}
                {...register("displayName")}
              />
              <FieldDescription>
                This is the name shown on your public profile.
              </FieldDescription>
              <FieldError errors={[errors.displayName]} />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="register-password"
                type="password"
                placeholder="Create a password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <FieldError errors={[errors.password]} />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(errors.confirmPassword)}>
            <FieldLabel htmlFor="register-confirm-password">
              Confirm Password
            </FieldLabel>
            <FieldContent>
              <Input
                id="register-confirm-password"
                type="password"
                placeholder="Re-enter your password"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register("confirmPassword")}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          Create account
        </Button>
      </form>
    </AuthFormShell>
  );
}
