export type AuthUserDto = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  lastSeenAt?: string;
};

export type AuthResponseDto = {
  user: AuthUserDto;
  token: string;
};
