import Link from "next/link";
import { redirect } from "next/navigation";
import { productContent } from "@/content/product";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/forms/auth-form";
import { getServerPostAuthRedirectPath } from "@/lib/auth/redirects";
import { getSessionUser } from "@/lib/auth/session";

export default async function SignInPage() {
  const user = await getSessionUser();

  if (user) {
    redirect(await getServerPostAuthRedirectPath(user.id));
  }

  return (
    <AuthShell
      badge={productContent.auth.signIn.badge}
      caption={productContent.auth.signIn.caption}
    >
      <AuthForm mode="sign-in" />
      <p className="text-center text-sm text-muted-foreground">
        {productContent.auth.signIn.switchPrompt}{" "}
        <Link href="/sign-up" className="font-semibold text-foreground transition hover:text-primary">
          {productContent.auth.signIn.switchLabel}
        </Link>
      </p>
    </AuthShell>
  );
}
