import { ApiClientError } from "@/lib/api/client";

export function formatGenerationError(
  error: ApiClientError,
  t: (key: string, fallback?: string) => string,
) {
  switch (error.code) {
    case "AI_ROUTE_NOT_CONFIGURED":
    case "AI_PROVIDER_NOT_CONFIGURED":
      return {
        message: t(
          "play.errors.noProviderConfigured",
          "No AI provider is ready for story generation yet. Open Profile > AI Settings to add a provider key, choose task models, or enable app fallback.",
        ),
      };
    case "AI_MODEL_NOT_SUPPORTED":
      return {
        message: t(
          "play.errors.invalidModel",
          "The selected provider model is no longer supported. Update AI Settings and try again.",
        ),
      };
    case "AI_PROVIDER_TIMEOUT":
    case "REQUEST_TIMEOUT":
      return {
        message: t(
          "play.errors.providerTimeout",
          "The AI provider took too long to respond. Please retry in a moment.",
        ),
      };
    case "AI_MALFORMED_RESPONSE":
      return {
        message: t(
          "play.errors.malformedResponse",
          "The AI provider returned an invalid structured response. Please retry in a moment.",
        ),
      };
    case "AI_STRUCTURED_OUTPUT_INVALID":
      return {
        message: t(
          "play.errors.invalidStoryStructure",
          "The AI returned an invalid story structure. Please retry or choose a different model.",
        ),
      };
    case "AI_CREDENTIAL_DECRYPT_FAILED":
      return {
        message: t(
          "play.errors.credentialDecryptFailed",
          "The saved provider key could not be used. Re-save the provider key in AI Settings and try again.",
        ),
      };
    default:
      return { message: error.message };
  }
}
