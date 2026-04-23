import { ok } from "@/server/api/http/response";
import { parseJson } from "@/server/api/http/handler";
import { presentAuthResponse, presentUser } from "@/server/api/presenters/auth-presenter";
import { requireAuth } from "@/server/middleware/auth";
import { clearAuthCookie, setAuthCookie } from "@/server/security/auth-cookie";
import { AuthService } from "@/server/services/auth-service";
import {
  loginSchema,
  registerSchema,
  updatePreferencesSchema,
} from "@/server/validation/api-schemas";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  async register(request: Request, requestId: string) {
    const payload = await parseJson(request, registerSchema);
    const result = await this.authService.register(payload);
    const response = ok(requestId, presentAuthResponse(result.user, result.token), 201);
    setAuthCookie(response, result.token);
    return response;
  }

  async login(request: Request, requestId: string) {
    const payload = await parseJson(request, loginSchema);
    const result = await this.authService.login(payload);
    const response = ok(requestId, presentAuthResponse(result.user, result.token));
    setAuthCookie(response, result.token);
    return response;
  }

  async me(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const result = await this.authService.getMe(auth.userId);
    return ok(requestId, {
      user: presentUser(result.user),
      preferences: result.preferences,
    });
  }

  async updatePreferences(request: Request, requestId: string) {
    const auth = await requireAuth(request);
    const payload = await parseJson(request, updatePreferencesSchema);
    const preferences = await this.authService.updatePreferences(auth.userId, payload);
    return ok(requestId, preferences);
  }

  async logout(requestId: string) {
    const response = ok(requestId, { loggedOut: true });
    clearAuthCookie(response);
    return response;
  }
}
