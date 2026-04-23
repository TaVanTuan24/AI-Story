import type { AiInvocationResult, AiProvider, AiStructuredRequest } from "@/server/ai/types";
import { createRequestId } from "@/server/ai/utils/request-id";

export class BootstrapProvider implements AiProvider {
  readonly name = "bootstrap";
  readonly defaultModel = "bootstrap-local";

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    const output = request.fallback() as TResult;
    return {
      requestId: request.requestId ?? createRequestId("bootstrap"),
      task: request.task,
      promptVersion: request.promptVersion,
      provider: this.name,
      model: this.defaultModel,
      attempts: 1,
      usedFallback: true,
      output,
      rawText: JSON.stringify(output),
    };
  }
}
