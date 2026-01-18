export type AuthUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isAdmin: boolean;
};

export type JwtPayload = {
  userId: number;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

export type SignInResponse = {
  success: boolean;
  user?: AuthUser;
  error?: string;
};
