import { describe, it, expect, vi } from "vitest";

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
}));

import { logEvent } from "../lib/analytics";
import * as Sentry from "@sentry/react";

describe("logEvent", () => {
  it("llama a Sentry.addBreadcrumb con el nombre del evento", () => {
    logEvent("pedido_creado", { total: 150 });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: "pedido_creado", category: "analytics" })
    );
  });

  it("no lanza error si no se pasan datos adicionales", () => {
    expect(() => logEvent("app_abierta")).not.toThrow();
  });
});
