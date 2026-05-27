import { describe, expect, it } from "vitest";

import { auditDemoText } from "@/lib/safety/demo-data-audit";

describe("auditDemoText", () => {
  it("flags email-like content", () => {
    const findings = auditDemoText("Contact me at test@example.com for details.");
    expect(findings.some((f) => f.kind === "email")).toBe(true);
  });

  it("flags phone-like content", () => {
    const findings = auditDemoText("Call 555-555-1234 to coordinate.");
    expect(findings.some((f) => f.kind === "phone")).toBe(true);
  });

  it("flags url-like content", () => {
    const findings = auditDemoText("See https://example.com for more info.");
    expect(findings.some((f) => f.kind === "url")).toBe(true);
  });

  it("does not flag normal demo-safe text", () => {
    const findings = auditDemoText("Vendor follow-up is pending. Next action is status request.");
    expect(findings).toHaveLength(0);
  });
});
