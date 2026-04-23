import type { AuthResponseDto, AuthUserDto } from "@/server/api/dtos/auth-dto";

export function presentUser(user: Record<string, unknown>): AuthUserDto {
  return {
    id: String(user._id ?? user.id),
    email: String(user.email),
    displayName: String(user.displayName),
    isActive: Boolean(user.isActive),
    lastSeenAt:
      user.lastSeenAt instanceof Date
        ? user.lastSeenAt.toISOString()
        : user.lastSeenAt
          ? String(user.lastSeenAt)
          : undefined,
  };
}

export function presentAuthResponse(
  user: Record<string, unknown>,
  token: string,
): AuthResponseDto {
  return {
    user: presentUser(user),
    token,
  };
}
