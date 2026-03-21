import { vi } from "vitest";

export function freezeTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  vi.useFakeTimers();
  vi.setSystemTime(date);

  return date;
}

export function resetTime() {
  vi.useRealTimers();
}
