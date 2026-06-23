export type ContentPushUploadErrorCode =
  | "content_push_http_status"
  | "content_push_invalid_ref";

export type ContentPushUploadError = Error & {
  code: ContentPushUploadErrorCode;
  status?: number;
  protocol?: string;
};

export function contentPushUploadError(code: ContentPushUploadErrorCode, message: string, meta: { status?: number; protocol?: string } = {}): ContentPushUploadError {
  const err = new Error(message) as ContentPushUploadError;
  err.code = code;
  if (meta.status !== undefined) err.status = meta.status;
  if (meta.protocol) err.protocol = meta.protocol;
  return err;
}

export function validateContentPushFileRef(raw: unknown, protocol: string): string {
  const fileRef = String(raw || "").trim();
  if (!fileRef.startsWith("/")) {
    throw contentPushUploadError("content_push_invalid_ref", `invalid ${protocol} file ref: ${fileRef.slice(0, 120)}`, { protocol });
  }
  return fileRef;
}

export function shouldFallbackToResumable(error: unknown): boolean {
  if (!isContentPushUploadError(error)) return false;
  if (error.code !== "content_push_http_status") return false;
  const status = Number(error.status);
  return status === 400 || status === 401 || status === 403 || status === 404 || status === 405 || status === 415 || status === 501;
}

function isContentPushUploadError(error: unknown): error is ContentPushUploadError {
  return !!error && typeof error === "object" && "code" in error;
}
