// @vitest-environment node

import { describe, expect, it } from "vitest";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";

describe("getRequiredEnv", () => {
  it("returns the configured value", () => {
    process.env.APP_TEST_ENV = "configured";

    expect(getRequiredEnv("APP_TEST_ENV")).toBe("configured");
  });

  it("throws when the environment variable is missing", () => {
    delete process.env.APP_TEST_ENV_MISSING;

    expect(() => getRequiredEnv("APP_TEST_ENV_MISSING")).toThrow(
      "Missing required environment variable: APP_TEST_ENV_MISSING",
    );
  });

  it("returns the fallback for an unset optional variable", () => {
    delete process.env.APP_TEST_OPTIONAL_ENV;

    expect(getOptionalEnv("APP_TEST_OPTIONAL_ENV", "fallback")).toBe(
      "fallback",
    );
  });
});
