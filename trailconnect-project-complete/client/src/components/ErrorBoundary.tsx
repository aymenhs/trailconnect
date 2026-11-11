import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * The previous screen printed the raw stack trace to the user, in English only,
 * with "Reload Page" as the sole way out — so a deterministic error left the
 * person in a loop with no exit, and leaked internals along the way.
 *
 * The stack is now kept for development, the copy follows the interface
 * language, and there is always a route back to the home screen.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Nothing was reported anywhere, so crashes were invisible to whoever runs
    // the service. Keep it on the console until a collector is wired up.
    console.error("[ErrorBoundary] Unhandled error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // The boundary sits above LocaleProvider, so read the language off the
    // document rather than the context — a crash in the provider must not
    // crash the fallback too.
    const fr =
      typeof document === "undefined" ||
      document.documentElement.lang.startsWith("fr");

    const copy = fr
      ? {
          title: "Une erreur inattendue est survenue.",
          body: "Votre travail en cours n’a pas été perdu si vous l’aviez enregistré. Vous pouvez réessayer ou revenir à l’accueil.",
          retry: "Réessayer",
          home: "Retour à l’accueil",
          details: "Détails techniques",
        }
      : {
          title: "An unexpected error occurred.",
          body: "Anything you had saved is still there. You can try again or go back to the home screen.",
          retry: "Try again",
          home: "Back to home",
          details: "Technical details",
        };

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8fbf4] p-6">
        <div className="w-full max-w-lg rounded-[1.6rem] border border-[#dce9d8] bg-white p-7 text-center">
          <AlertTriangle
            size={40}
            className="mx-auto text-[#b87524]"
            aria-hidden="true"
          />
          <h1 className="mt-5 text-xl font-extrabold tracking-[-.04em] text-[#24513e]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed font-semibold text-[#647f71]">
            {copy.body}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d493a] px-4 text-sm font-extrabold text-white"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {copy.retry}
            </button>
            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cddcc7] bg-white px-4 text-sm font-extrabold text-[#3d6a53]"
            >
              <Home size={16} aria-hidden="true" />
              {copy.home}
            </a>
          </div>

          {import.meta.env.DEV && this.state.error ? (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs font-extrabold text-[#7b8f83]">
                {copy.details}
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#f3f7f1] p-3 text-[11px] leading-relaxed whitespace-break-spaces text-[#4d6a5c]">
                {this.state.error.stack}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
