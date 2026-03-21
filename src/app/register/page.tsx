import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getSession } from "@/features/auth/session";

export default async function RegisterPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}
