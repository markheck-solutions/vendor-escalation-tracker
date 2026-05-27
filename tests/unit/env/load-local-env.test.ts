import { describe, expect, it } from "vitest";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadLocalEnv } from "@/lib/env/load-local-env";

describe("loadLocalEnv", () => {
  it("loads values from .env.local into the provided env object", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vet-env-"));
    const envPath = path.join(tmpDir, ".env.local");

    fs.writeFileSync(
      envPath,
      [
        "# comment",
        'DATABASE_URL="postgresql://example/db"',
        "FOO=bar",
        "EMPTY=",
        'SPACED = \" spaced \"',
        "",
      ].join("\n"),
      "utf8",
    );

    const env: Record<string, string | undefined> = {};
    const result = loadLocalEnv({ cwd: tmpDir, env });

    expect(result.loadedFrom).toBe(envPath);
    expect(result.loadedKeys).toEqual(["DATABASE_URL", "FOO", "EMPTY", "SPACED"]);
    expect(env).toEqual({
      DATABASE_URL: "postgresql://example/db",
      FOO: "bar",
      EMPTY: "",
      SPACED: " spaced ",
    });
  });

  it("does not override existing values by default", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vet-env-"));
    fs.writeFileSync(path.join(tmpDir, ".env.local"), "FOO=from_file\nBAR=from_file\n", "utf8");

    const env: Record<string, string | undefined> = { FOO: "already_set" };
    const result = loadLocalEnv({ cwd: tmpDir, env });

    expect(result.loadedKeys).toEqual(["BAR"]);
    expect(env).toEqual({ FOO: "already_set", BAR: "from_file" });
  });
});
