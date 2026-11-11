// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const organizerData = vi.hoisted(() => ({
  organizer: { userId: 9, name: "Camille D.", publicSlug: "camille-rando", avatarUrl: null, coverImageUrl: null, bio: "J’organise des sorties conviviales et préparées à l’avance.", homeLocation: "Montréal · Québec" },
  declaredExperience: { headline: "Randonnées de groupe dans les Laurentides", bio: "Approche calme, collaborative et adaptée au groupe.", languages: "Français, anglais", serviceRegions: "Laurentides, Montérégie", certifications: "Expérience déclarée en randonnée de groupe" },
  trust: { phoneVerified: true, completedHostedOutings: 4, participantCheckInRate: 75, participantCheckInTotal: 8, weatherUpdatesPublished: 3, bookingResponseWithin48hRate: 100, bookingResponseSampleSize: 2, verifiedGuide: false, insuranceConfirmed: false },
  upcomingOutings: [{ id: 3, title: "Boucle des lacs de Mont-Tremblant", locationName: "Laurentides · Québec", startsAt: new Date("2026-09-20T12:00:00.000Z"), difficulty: "intermediate", distanceKm: 10, elevationGain: 450, durationMinutes: 300, coverImageUrl: null, coverImageFocalX: null, coverImageFocalY: null }],
  completedOutings: [],
}));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { marketplace: { organizers: { bySlug: { useQuery: () => ({ data: organizerData, isLoading: false }) } } } } } }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>, useRoute: () => [true, { slug: "camille-rando" }] }));

import OrganizerProfilePage from "./OrganizerProfilePage";

afterEach(() => cleanup());

describe("OrganizerProfilePage", () => {
  it("presents public outings, self-declared experience and factual TrailConnect signals", () => {
    render(<OrganizerProfilePage />);
    expect(screen.getByRole("heading", { name: "Camille D." })).toBeTruthy();
    expect(screen.getByText("Boucle des lacs de Mont-Tremblant")).toBeTruthy();
    expect(screen.getByText("Expérience déclarée")).toBeTruthy();
    expect(screen.getByText("Téléphone confirmé")).toBeTruthy();
    expect(screen.getByText(/ne garantissent ni l’adéquation, ni la sécurité/i)).toBeTruthy();
    expect(screen.queryByText("Profil guide examiné")).toBeNull();
  });
});
