import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { initAnalyticsConsent } from "./lib/analyticsConsent";
import "./index.css";

// Without a stale time every remount refetched, which made the app chatty and
// wasteful; a short window keeps data fresh without the storm.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

// Applies a previously recorded analytics choice; nothing loads without one.
initAnalyticsConsent();

/**
 * An expired session used to trigger a full-page redirect to the OAuth portal
 * from any failed request — the user was thrown out of the app mid-task with no
 * warning and no way to cancel, losing anything not yet saved.
 *
 * Now they are told, and they choose when to sign in again.
 */
let signInPromptShown = false;

const promptSignInIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (signInPromptShown) return;

  signInPromptShown = true;
  const fr = document.documentElement.lang.startsWith("fr");
  toast.error(fr ? "Votre session a expiré." : "Your session has expired.", {
    duration: Infinity,
    action: {
      label: fr ? "Se reconnecter" : "Sign in again",
      onClick: () => startLogin(),
    },
    onDismiss: () => {
      signInPromptShown = false;
    },
  });
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    promptSignInIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    promptSignInIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // The session travels in its HttpOnly cookie only. A Manus-era fallback
      // also read a copy of the token from sessionStorage — readable by any
      // script on the page — and sent it as a Bearer header.
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
