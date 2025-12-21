export type OpenAIErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "rate_limit_error"
  | "insufficient_quota"
  | "api_error";

export interface OpenAIErrorBody {
  error: {
    message: string;
    type: OpenAIErrorType;
    param: string | null;
    code: string | null;
  };
}

export function openaiErrorResponse(
  message: string,
  type: OpenAIErrorType,
  status: number
): Response {
  const body: OpenAIErrorBody = {
    error: {
      message,
      type,
      param: null,
      code: null,
    },
  };
  return Response.json(body, { status });
}

