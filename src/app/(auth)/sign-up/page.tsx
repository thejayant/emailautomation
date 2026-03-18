import Link from "next/link";
import { redirect } from "next/navigation";
import { productContent } from "@/content/product";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { getServerPostAuthRedirectPath } from "@/lib/auth/redirects";
import { getSessionUser } from "@/lib/auth/session";

export default async function SignUpPage() {
  const user = await getSessionUser();

  if (user) {
    redirect(await getServerPostAuthRedirectPath(user.id));
  }

  return (
    <AuthShell
      badge={productContent.auth.signUp.badge}
      caption={productContent.auth.signUp.caption}
    >
      <AuthForm mode="sign-up" />
      <p className="text-center text-sm text-muted-foreground">
        {productContent.auth.signUp.switchPrompt}{" "}
        <Link href="/sign-in" className="font-semibold text-foreground transition hover:text-primary">
          {productContent.auth.signUp.switchLabel}
        </Link>
      </p>
    </AuthShell>
  );
}
