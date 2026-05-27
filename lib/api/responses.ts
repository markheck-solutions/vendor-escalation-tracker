export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export function jsonError(args: {
  status: number;
  code: string;
  message: string;
}): Response {
  return Response.json(
    { error: { code: args.code, message: args.message } } satisfies ApiErrorBody,
    { status: args.status },
  );
}

export function jsonMethodNotAllowed(args: { allowed: string[] }): Response {
  return Response.json(
    { error: { code: "method_not_allowed", message: "This endpoint is read-only." } },
    {
      status: 405,
      headers: { Allow: args.allowed.join(", ") },
    },
  );
}
