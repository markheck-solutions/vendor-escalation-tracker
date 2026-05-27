export type DemoDataFinding = {
  kind:
    | "email"
    | "phone"
    | "url"
    | "private-url"
    | "unsafe-name"
    | "token-like"
    | "sk-like"
    | "aws-like"
    | "supabase-service-role-like";
  match: string;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const URL_RE = /\b(?:https?|postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s/$.?#].[^\s]*\b/i;
const PRIVATE_URL_RE =
  /\b(?:https?|postgres(?:ql)?|mysql|mongodb|redis):\/\/(?:[^\s/@]+(?::[^\s/@]+)?@)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|(?:10|192\.168)\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})(?::\d+)?\b/i;
const PRIVATE_HOSTNAME_RE = /\b(?:[^\s.]+\.)+(?:local|internal)\b/i;
const SK_RE = /\bsk-[A-Za-z0-9]{16,}\b/;
const JWT_LIKE_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;
const AWS_ACCESS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/;
const SUPABASE_SERVICE_ROLE_RE = /\b(?:service_role|service-role)\b/i;
// Heuristic for real-ish person names in text like:
// "Contact: Jane Doe" / "Attn John Smith" / "Call Bob Jones"
const POSSIBLE_PERSON_NAME_RE =
  /\b(?:attn\.?|attention|contact|call|email|reach)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\b/i;

function looksLikeUnsafeName(match: string): boolean {
  // Allow demo-safe role prefixes used across the seed dataset and UI copy.
  const allowedPrefixRe = /^(Customer|Vendor|Owner|Circuit)\s+[A-Z][a-z]+$/;
  if (allowedPrefixRe.test(match)) return false;
  return true;
}

export function auditDemoText(text: string): DemoDataFinding[] {
  const findings: DemoDataFinding[] = [];

  const checks: Array<{ re: RegExp; kind: DemoDataFinding["kind"] }> = [
    { re: EMAIL_RE, kind: "email" },
    { re: PHONE_RE, kind: "phone" },
    { re: PRIVATE_URL_RE, kind: "private-url" },
    { re: PRIVATE_HOSTNAME_RE, kind: "private-url" },
    { re: URL_RE, kind: "url" },
    { re: SK_RE, kind: "sk-like" },
    { re: AWS_ACCESS_KEY_RE, kind: "aws-like" },
    { re: JWT_LIKE_RE, kind: "token-like" },
    { re: SUPABASE_SERVICE_ROLE_RE, kind: "supabase-service-role-like" },
  ];

  for (const { re, kind } of checks) {
    const match = text.match(re);
    if (match?.[0]) {
      if (
        kind === "url" &&
        findings.some(
          (f) => f.kind === "private-url" && (match[0] === f.match || match[0].startsWith(f.match)),
        )
      ) {
        continue;
      }
      findings.push({ kind, match: match[0] });
    }
  }

  const possibleName = text.match(POSSIBLE_PERSON_NAME_RE);
  const capturedName = possibleName?.[1];
  if (capturedName && looksLikeUnsafeName(capturedName)) {
    findings.push({ kind: "unsafe-name", match: capturedName });
  }

  return findings;
}
