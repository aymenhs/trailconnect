// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { NextOutingActionPanel, PostOutingRecapPanel, RecurringSeriesPanel, RelaunchFormerParticipantsPanel, SeriesInterestPanel } from "./EngagementPanels";

const mocks = vi.hoisted(() => ({
  createPost: vi.fn(), uploadImage: vi.fn(), createSeries: vi.fn(), toggleInterest: vi.fn(), relaunch: vi.fn(), refetch: vi.fn(),
  series: [{ id: 7, sourceEventId: 1, name: "Randos du dimanche", cadence: "weekly", interestCount: 2 }],
  eventSeries: { id: 7, name: "Randos du dimanche", interestCount: 2, myInterested: false },
  candidates: [{ userId: 9, name: "Nora" }],
}));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "fr" }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { hiking: { media: { uploadImage: { useMutation: () => ({ mutateAsync: mocks.uploadImage, isPending: false }) } }, community: { createPost: { useMutation: () => ({ mutate: mocks.createPost, isPending: false }) } }, events: { series: { mine: { useQuery: () => ({ data: mocks.series, refetch: mocks.refetch }) }, create: { useMutation: () => ({ mutate: mocks.createSeries, isPending: false }) }, byEvent: { useQuery: () => ({ data: mocks.eventSeries, refetch: mocks.refetch }) }, toggleInterest: { useMutation: () => ({ mutate: mocks.toggleInterest, isPending: false }) }, relaunchCandidates: { useQuery: () => ({ data: mocks.candidates, refetch: mocks.refetch }) }, relaunch: { useMutation: () => ({ mutate: mocks.relaunch, isPending: false, isSuccess: false }) } } } } } }));

const outing = { id: 1, title: "Boucle du Mont-Royal", startsAt: new Date("2030-06-01T09:00:00Z"), relationship: "participant" as const, participationStatus: "going" as const, locationName: "Montréal" };

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("EngagementPanels", () => {
  it("prioritizes the next personal outing with a direct action", async () => {
    const onOpen = vi.fn();
    render(<NextOutingActionPanel outings={[outing]} onOpen={onOpen} />);
    expect(screen.getByRole("region", { name: "Ma prochaine sortie" }).textContent).toContain("Confirmer vos repères de départ");
    fireEvent.click(screen.getByRole("button", { name: "Voir l’action" }));
    expect(onOpen).toHaveBeenCalledWith(outing);
  });

  it("publishes a guided recap for a completed outing without requiring a photo", async () => {
    render(<PostOutingRecapPanel outings={[outing]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Titre du récapitulatif" }), { target: { value: "Un groupe très attentif" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Ce qui a bien fonctionné/ }), { target: { value: "Le rendez-vous et le covoiturage étaient simples et le groupe a gardé un rythme régulier." } });
    fireEvent.click(screen.getByRole("button", { name: "Publier le récapitulatif" }));
    expect(mocks.createPost).toHaveBeenCalledWith(expect.objectContaining({ eventId: 1, postType: "outing_recap", images: [] }));
  });

  it("creates a controlled organizer series from an existing outing", async () => {
    render(<RecurringSeriesPanel organizerOutings={[{ ...outing, relationship: "organizer" }]} onOpen={() => undefined} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nom de la série" }), { target: { value: "Randos du samedi" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la série" }));
    expect(mocks.createSeries).toHaveBeenCalledWith({ sourceEventId: 1, name: "Randos du samedi", cadence: "monthly" });
    expect(screen.getByText("2 personnes intéressées")).toBeTruthy();
  });

  it("keeps series interest voluntary and permits a selected past-participant relaunch", async () => {
    const { rerender } = render(<SeriesInterestPanel eventId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Cela m’intéresse" }));
    expect(mocks.toggleInterest).toHaveBeenCalledWith({ seriesId: 7 });
    rerender(<RelaunchFormerParticipantsPanel eventId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /Nora/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Message de relance" }), { target: { value: "Une nouvelle date est proposée si vous souhaitez revenir marcher avec nous." } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l’invitation" }));
    expect(mocks.relaunch).toHaveBeenCalledWith(expect.objectContaining({ eventId: 1, participantIds: [9] }));
  });
});
