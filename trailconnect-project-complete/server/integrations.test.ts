import { describe, expect, it } from "vitest";
import { getIntegration, outdoorIntegrations } from "../shared/integrations";

describe("outdoor integration catalog", () => {
  it("exposes an available map capability plus planned and ready-to-connect outdoor services", () => {
    expect(getIntegration("maps")).toMatchObject({ status: "available" });
    expect(outdoorIntegrations.filter(integration => integration.status === "planned")).toHaveLength(4);
    expect(getIntegration("strava")).toMatchObject({ status: "ready_to_connect" });
    expect(getIntegration("strava")?.capabilities).toContain("activity-import");
    expect(getIntegration("inreach")?.capabilities).toContain("voluntary-check-in");
  });
});
