import { ok } from "@/server/api/http/response";
import { parseJson } from "@/server/api/http/handler";
import { requireAuth } from "@/server/middleware/auth";
import { UserAISettingsService } from "@/server/services/user-ai-settings-service";
import { updateUserAISettingsSchema } from "@/server/validation/api-schemas";

export class UserAISettingsController {
  constructor(private readonly service = new UserAISettingsService()) {}

  async get(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const settings = await this.service.getUserAISettings(auth.userId);
    return ok(requestId, settings);
  }

  async update(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const payload = await parseJson(request, updateUserAISettingsSchema);
    const settings = await this.service.updateUserAISettings(auth.userId, payload);
    return ok(requestId, settings);
  }
}
