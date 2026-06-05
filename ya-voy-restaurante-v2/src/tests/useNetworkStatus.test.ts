import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

describe("useNetworkStatus", () => {
  afterEach(() => vi.restoreAllMocks());

  it("devuelve true cuando navigator.onLine es true", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it("actualiza a false al disparar el evento offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useNetworkStatus());
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(result.current).toBe(false);
  });

  it("actualiza a true al disparar el evento online", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useNetworkStatus());
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(result.current).toBe(true);
  });
});
