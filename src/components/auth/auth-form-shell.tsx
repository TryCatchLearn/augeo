import Link from "next/link";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthFormShellProps = {
  title: string;
  description: string;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
  children: ReactNode;
};

export function AuthFormShell({
  title,
  description,
  footerText,
  footerHref,
  footerLinkLabel,
  children,
}: AuthFormShellProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md border border-border/80 bg-card/90 shadow-2xl shadow-black/10">
        <CardHeader className="space-y-2 border-b border-border/80">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
        <CardFooter className="justify-center border-t-0 bg-transparent pt-0">
          <p className="text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link
              href={footerHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {footerLinkLabel}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  );
}
