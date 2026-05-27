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

  it("flags private or local URLs distinctly", () => {
    const findings = auditDemoText("Check http://127.0.0.1:3100/health before proceeding.");
    expect(findings.some((f) => f.kind === "private-url")).toBe(true);
    expect(findings.some((f) => f.kind === "url")).toBe(false);
  });

  it("flags 10/8 IPv4 private addresses only when fully specified", () => {
    const findings = auditDemoText("Try http://10.0.0.1:8080/health as a quick check.");
    expect(findings.some((f) => f.kind === "private-url")).toBe(true);
    expect(findings.some((f) => f.kind === "url")).toBe(false);
  });

  it("does not treat partial 10/8 IPv4 values as private addresses", () => {
    const findings = auditDemoText("This should not be treated as private: http://10.0.0:8080/health");
    expect(findings.some((f) => f.kind === "private-url")).toBe(false);
    expect(findings.some((f) => f.kind === "url")).toBe(true);
  });

  it("flags secret-looking values (token-like / sk-like)", () => {
    const findings = auditDemoText(
      "Use sk-abcdefghijklmnopqrstuvwxyz1234567890 and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    );
    expect(findings.some((f) => f.kind === "sk-like")).toBe(true);
    expect(findings.some((f) => f.kind === "token-like")).toBe(true);
  });

  it("flags contact-like person names in text", () => {
    const findings = auditDemoText("Contact: Jane Doe to coordinate access.");
    expect(findings.some((f) => f.kind === "unsafe-name")).toBe(true);
  });

  it("does not flag normal demo-safe text", () => {
    const findings = auditDemoText("Vendor follow-up is pending. Next action is status request.");
    expect(findings).toHaveLength(0);
  });
});
