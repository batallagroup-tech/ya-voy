import { describe, it, expect } from "vitest";
import { STATUS_LABEL, STATUS_COLOR } from "../lib/constants";

describe("STATUS_LABEL", () => {
  it("tiene todas las etiquetas necesarias", () => {
    const statuses = ["nuevo", "preparando", "listo", "en_camino", "entregado", "cancelado"];
    statuses.forEach(s => expect(STATUS_LABEL[s]).toBeTruthy());
  });

  it("etiqueta 'entregado' es correcta", () => {
    expect(STATUS_LABEL.entregado).toBe("Entregado");
  });
});

describe("STATUS_COLOR", () => {
  it("tiene colores para todos los estados", () => {
    expect(Object.keys(STATUS_COLOR).length).toBeGreaterThan(5);
  });

  it("colores son clases de Tailwind válidas", () => {
    Object.values(STATUS_COLOR).forEach(cls => {
      expect(cls).toMatch(/^bg-/);
    });
  });
});
