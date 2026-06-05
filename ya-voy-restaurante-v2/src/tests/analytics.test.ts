import { describe, it, expect, vi } from "vitest";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
}));

import { logEvent } from "../lib/analytics";
import * as Sentry from "@sentry/react";

describe("logEvent", () => {
  it("llama a Sentry.addBreadcrumb con el nombre del evento", () => {
    logEvent("restaurante_aprobado", { userId: "u1" });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "restaurante_aprobado", category: "analytics" })
    );
  });

  it("no lanza error si no se pasan datos adicionales", () => {
    expect(() => logEvent("pedido_nuevo")).not.toThrow();
  });
});
