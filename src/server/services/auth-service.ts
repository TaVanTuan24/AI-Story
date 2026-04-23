import { ApiError } from "@/server/api/errors/api-error";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { signAuthToken } from "@/server/auth/token";
import { UserPreferenceRepository } from "@/server/persistence/repositories/user-preference-repository";
import { UserRepository } from "@/server/persistence/repositories/user-repository";
import type {
  LoginInput,
  RegisterInput,
  UpdatePreferencesInput,
} from "@/server/validation/api-schemas";

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly preferenceRepository = new UserPreferenceRepository(),
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ApiError("Email is already registered.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    await this.preferenceRepository.upsertDefault(String(user._id));

    const token = await signAuthToken({
      sub: String(user._id),
      email: String(user.email),
      displayName: String(user.displayName),
    });

    return { user, token };
  }

  async login(input: LoginInput) {
    const user = await this.userRepository.findByEmail(input.email, true);
    if (!user?.passwordHash) {
      throw new ApiError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }
    if (!user.isActive) {
      throw new ApiError("This account is inactive.", 403, "ACCOUNT_INACTIVE");
    }

    const valid = await verifyPassword(input.password, String(user.passwordHash));
    if (!valid) {
      throw new ApiError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    await this.userRepository.updateLastSeen(String(user._id));

    const token = await signAuthToken({
      sub: String(user._id),
      email: String(user.email),
      displayName: String(user.displayName),
    });

    const refreshed = await this.userRepository.findById(String(user._id));
    return { user: refreshed!, token };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ApiError("User not found.", 404, "USER_NOT_FOUND");
    }
    if (!user.isActive) {
      throw new ApiError("This account is inactive.", 403, "ACCOUNT_INACTIVE");
    }
    const preferences = await this.preferenceRepository.upsertDefault(userId);
    return { user, preferences };
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    const preferences = await this.preferenceRepository.update(userId, input);
    return preferences!;
  }
}
