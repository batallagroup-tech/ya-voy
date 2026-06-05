import * as Sentry from "@sentry/react";

export function logEvent(name: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category: "analytics", message: name, data, level: "info" });
  if (import.meta.env.DEV) console.log("[analytics]", name, data);
}
