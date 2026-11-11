import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocale } from "@/contexts/LocaleContext";
import { rememberPendingInvite } from "@/lib/pendingInvite";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

/**
 * Landing page of an invitation link. The community page has been copying
 * `/invite/<token>` links for a while, but no route answered them: every
 * invitation ended on a 404.
 */
export default function InvitePage() {
  const { locale } = useLocale();
  const { isAuthenticated, loading } = useAuth();
  const [, params] = useRoute("/invite/:token");
  const [, navigate] = useLocation();
  const token = params?.token ?? "";
  const preview = trpc.hiking.social.invitations.preview.useQuery(
    { token },
    { enabled: Boolean(token), retry: false }
  );
  const accept = trpc.hiking.social.invitations.accept.useMutation({
    onSuccess: () => {
      toast.success(
        locale === "fr"
          ? "Vous faites maintenant partie de son cercle."
          : "You are now part of their circle."
      );
      navigate("/communaute");
    },
    onError: error => toast.error(error.message),
  });
  const t =
    locale === "fr"
      ? {
          back: "Retour à TrailConnect",
          loading: "Chargement de l’invitation…",
          invalid: "Cette invitation n’est plus valable.",
          invalidHint:
            "Elle a peut-être expiré. Demandez un nouveau lien à la personne qui vous l’a envoyé.",
          title: (name: string) => `${name} vous invite sur TrailConnect`,
          someone: "Un membre",
          hint: "En acceptant, vous rejoignez son cercle : vous pourrez vous écrire et organiser des sorties ensemble.",
          accept: "Accepter l’invitation",
          login: "Se connecter pour accepter",
        }
      : {
          back: "Back to TrailConnect",
          loading: "Loading the invitation…",
          invalid: "This invitation is no longer valid.",
          invalidHint:
            "It may have expired. Ask the person who sent it for a new link.",
          title: (name: string) => `${name} invites you to TrailConnect`,
          someone: "A member",
          hint: "By accepting, you join their circle: you will be able to write to each other and plan outings together.",
          accept: "Accept the invitation",
          login: "Log in to accept",
        };

  const signInThenAccept = () => {
    // Sign-in always lands on "/": the token waits in the tab until then.
    rememberPendingInvite(token);
    startLogin();
  };

  const backLink = (
    <Link
      href="/"
      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#3f7459]"
    >
      <ArrowLeft size={14} />
      {t.back}
    </Link>
  );

  if (preview.isLoading)
    return (
      <main className="mx-auto max-w-xl p-6 text-sm font-bold text-[#607b6c]">
        {t.loading}
      </main>
    );
  if (!preview.data)
    return (
      <main className="mx-auto max-w-xl p-6">
        {backLink}
        <section className="mt-6 rounded-[1.7rem] border border-[#dce9d8] bg-white p-6">
          <h1 className="text-xl font-extrabold text-[#254938]">{t.invalid}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6c8678]">
            {t.invalidHint}
          </p>
        </section>
      </main>
    );

  const sender = preview.data;
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-[#f7faf5] px-5 pb-10 pt-6">
      {backLink}
      <section className="mt-5 rounded-[1.8rem] bg-[#224c3d] p-6 text-white shadow-[0_18px_36px_rgba(27,67,52,.18)]">
        <div className="grid size-16 place-items-center overflow-hidden rounded-[1.3rem] bg-[#dcebd7] text-xl font-black text-[#34634c]">
          {sender.senderAvatarUrl ? (
            <img src={sender.senderAvatarUrl} alt="" className="size-full object-cover" />
          ) : (
            (sender.senderName || "T").slice(0, 1).toUpperCase()
          )}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-[-.05em]">
          {t.title(sender.senderName || t.someone)}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#dcebd7]">{t.hint}</p>
        <button
          type="button"
          disabled={loading || accept.isPending}
          onClick={() =>
            isAuthenticated ? accept.mutate({ token }) : signInThenAccept()
          }
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-[#264a3a] disabled:opacity-60"
        >
          <UserPlus size={15} />
          {isAuthenticated ? t.accept : t.login}
        </button>
      </section>
    </main>
  );
}
