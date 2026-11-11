// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePersistFn", () => ({ usePersistFn: <T extends (...args: never[]) => unknown>(fn: T) => fn }));

// The map now loads from Google directly with our own key instead of going
// through the Manus proxy, so the loader refuses to run without one. Stubbing
// it here has to happen before the module is imported, since the key is read at
// module scope.
vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-maps-key");

import { MapView } from "./Map";

afterEach(() => {
  cleanup();
  window.google = undefined as unknown as typeof google;
  document.querySelectorAll('script[src*="/maps/api/js"]').forEach(script => script.remove());
});

describe("MapView script loading", () => {
  it("loads the Google Maps script only once when multiple maps mount together", async () => {
    const MapConstructor = vi.fn();
    render(<><MapView /><MapView /></>);
    const scripts = document.querySelectorAll('script[src*="/maps/api/js"]');
    expect(scripts).toHaveLength(1);
    window.google = { maps: { Map: MapConstructor } } as unknown as typeof google;
    scripts[0].dispatchEvent(new Event("load"));
    await waitFor(() => expect(MapConstructor).toHaveBeenCalledTimes(2));
  });
});
