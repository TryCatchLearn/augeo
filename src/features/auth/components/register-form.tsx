"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import {
  type RegisterFormValues,
  registerSchema,
} from "@/features/auth/schema";

export function RegisterForm() {
  const router = useRouter();
  const [isRedirecting, startRedirectTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
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

  const onSubmit = async (values: RegisterFormValues) => {
    const { error } = await authClient.signUp.email({
      name: values.displayName,
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError("root", {
        message: error.message || "Unable to create your account right now.",
      });
      return;
    }

    startRedirectTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
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

        <FieldError errors={[errors.root]} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || isRedirecting}
        >
          Create account
        </Button>
      </form>
    </AuthFormShell>
  );
}
