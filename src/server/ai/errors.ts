import { ApiError } from "@/server/api/errors/api-error";

export class AiPipelineError extends ApiError {
  constructor(
    message: string,
    code: string,
    details?: unknown,
    status = 503,
    expose = true,
  ) {
    super(message, status, code, details, expose);
    this.name = "AiPipelineError";
  }
}

export class AiProviderRequestError extends AiPipelineError {
  constructor(
    message: string,
    code: string,
    details?: unknown,
    status = 503,
  ) {
    super(message, code, details, status, true);
    this.name = "AiProviderRequestError";
  }
}

export class AiModelConfigurationError extends AiPipelineError {
  constructor(message: string, details?: unknown, status = 400) {
    super(message, "AI_MODEL_NOT_SUPPORTED", details, status, true);
    this.name = "AiModelConfigurationError";
  }
}

export class AiCredentialDecryptError extends AiPipelineError {
  constructor(message: string, details?: unknown, status = 503) {
    super(message, "AI_CREDENTIAL_DECRYPT_FAILED", details, status, true);
    this.name = "AiCredentialDecryptError";
  }
}

export class AiProviderTimeoutError extends AiPipelineError {
  constructor(message: string, details?: unknown, status = 504) {
    super(message, "AI_PROVIDER_TIMEOUT", details, status, true);
    this.name = "AiProviderTimeoutError";
  }
}

export class AiMalformedResponseError extends AiPipelineError {
  constructor(message: string, details?: unknown, status = 502) {
    super(message, "AI_MALFORMED_RESPONSE", details, status, true);
    this.name = "AiMalformedResponseError";
  }
}

export class AiStructuredOutputValidationError extends AiPipelineError {
  constructor(message: string, details?: unknown, status = 502) {
    super(message, "AI_STRUCTURED_OUTPUT_INVALID", details, status, true);
    this.name = "AiStructuredOutputValidationError";
  }
}
