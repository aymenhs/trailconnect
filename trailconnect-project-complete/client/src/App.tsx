import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { LEGAL_PATHS, VIEWS, VIEW_PATHS } from "@/lib/navigation";
import { Route, Switch } from "wouter";
import { ConsentBanner } from "./components/ConsentBanner";
import { OfflineStatusBar } from "./components/OfflineStatusBar";
import ErrorBoundary from "./components/ErrorBoundary";
import LegalPage from "./pages/LegalPage";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import InvitePage from "./pages/InvitePage";
import OrganizerProfilePage from "./pages/OrganizerProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import { useAuth } from "./_core/hooks/useAuth";
import { takePendingInvite } from "./lib/pendingInvite";
import { useEffect } from "react";
import { useLocation } from "wouter";

/** Brings a member who signed in from an invitation back to it. */
function PendingInviteRedirect() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = takePendingInvite();
    if (token) navigate(`/invite/${token}`);
  }, [isAuthenticated, navigate]);
  return null;
}

function Router() {
  // Every main screen has its own URL, so Back/Forward, refresh and shared
  // links work. They all render `Home`, which reads the screen from the path
  // (see `lib/navigation`); the outing sheet stays an overlay on `?event=`.
  return (
    <Switch>
      {VIEWS.map(view => (
        <Route key={view} path={VIEW_PATHS[view]} component={Home} />
      ))}
      <Route path={"/u/:slug"} component={PublicProfilePage} />
      <Route path={"/organizers/:slug"} component={OrganizerProfilePage} />
      <Route path={"/invite/:token"} component={InvitePage} />
      <Route path={LEGAL_PATHS.terms}>
        <LegalPage document="terms" />
      </Route>
      <Route path={LEGAL_PATHS.privacy}>
        <LegalPage document="privacy" />
      </Route>
      <Route path={LEGAL_PATHS.legal}>
        <LegalPage document="legal" />
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AccessibilityProvider>
          <LocaleProvider>
            <TooltipProvider>
              <Toaster />
              <OfflineStatusBar />
              <PendingInviteRedirect />
              <Router />
              <ConsentBanner />
            </TooltipProvider>
          </LocaleProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
