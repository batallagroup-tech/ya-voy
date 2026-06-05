import { describe, it, expect, vi } from "vitest";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
}));

import { logEvent } from "../lib/analytics";
import * as Sentry from "@sentry/react";

describe("logEvent", () => {
  it("llama a Sentry.addBreadcrumb con el nombre del evento", () => {
    logEvent("repartidor_aprobado", { userId: "u1" });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "repartidor_aprobado", category: "analytics" })
    );
  });

  it("no lanza error si no se pasan datos adicionales", () => {
    expect(() => logEvent("entrega_iniciada")).not.toThrow();
  });
});
