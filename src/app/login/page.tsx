import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/features/auth/session";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
