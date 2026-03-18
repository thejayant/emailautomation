import Link from "next/link";
import { productContent } from "@/content/product";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const mode = params.mode === "update" ? "update-password" : "forgot-password";
  const copy =
    mode === "update-password"
      ? productContent.auth.updatePassword
      : productContent.auth.forgotPassword;

  return (
    <AuthShell
      badge={copy.badge}
      caption={copy.caption}
    >
      <AuthForm mode={mode} />
      <p className="text-center text-sm text-muted-foreground">
        {copy.switchPrompt}{" "}
        <Link href="/sign-in" className="font-semibold text-foreground transition hover:text-primary">
          {copy.switchLabel}
        </Link>
      </p>
    </AuthShell>
  );
}
