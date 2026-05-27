export type DemoDataFinding = {
  kind:
    | "email"
    | "phone"
    | "url"
    | "token-like"
    | "sk-like"
    | "aws-like"
    | "supabase-service-role-like";
  match: string;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const URL_RE = /\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/i;
const SK_RE = /\bsk-[A-Za-z0-9]{16,}\b/;
const JWT_LIKE_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/;
const AWS_ACCESS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/;
const SUPABASE_SERVICE_ROLE_RE = /\b(?:service_role|service-role)\b/i;

export function auditDemoText(text: string): DemoDataFinding[] {
  const findings: DemoDataFinding[] = [];

  const checks: Array<{ re: RegExp; kind: DemoDataFinding["kind"] }> = [
    { re: EMAIL_RE, kind: "email" },
    { re: PHONE_RE, kind: "phone" },
    { re: URL_RE, kind: "url" },
    { re: SK_RE, kind: "sk-like" },
    { re: AWS_ACCESS_KEY_RE, kind: "aws-like" },
    { re: JWT_LIKE_RE, kind: "token-like" },
    { re: SUPABASE_SERVICE_ROLE_RE, kind: "supabase-service-role-like" },
  ];

  for (const { re, kind } of checks) {
    const match = text.match(re);
    if (match?.[0]) findings.push({ kind, match: match[0] });
  }

  return findings;
}
