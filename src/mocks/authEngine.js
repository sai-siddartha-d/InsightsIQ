// src/mocks/authEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Client-side stand-in for the JWT auth service.
//
// There is no server and nothing secret here: the "tokens" are opaque strings
// that only identify which demo account the session belongs to. Role-based
// behaviour is preserved, though — sign in as the Manager and the app is
// read-only, exactly as it was against the real API.
// ─────────────────────────────────────────────────────────────────────────────

import { users } from './store';

const TOKEN_PREFIX   = 'mock.access.';
const REFRESH_PREFIX = 'mock.refresh.';
const EXPIRES_IN     = 30 * 60;   // seconds — matches the API's advertised TTL

export class MockApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'MockApiError';
    this.status = status;
  }
}

const publicUser = ({ id, email, name, role }) => ({ id, email, name, role });

function findUser(email) {
  const needle = String(email ?? '').trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === needle) ?? null;
}

// A colon separates the issue stamp from the account. `encodeURIComponent`
// percent-encodes ':' but leaves '.' alone, so the colon is the only delimiter
// that cannot appear inside an encoded email address.
const SEPARATOR = ':';

function issueTokens(user) {
  const stamp   = Date.now().toString(36);
  const account = encodeURIComponent(user.email);
  return {
    access_token:  `${TOKEN_PREFIX}${stamp}${SEPARATOR}${account}`,
    refresh_token: `${REFRESH_PREFIX}${stamp}${SEPARATOR}${account}`,
    token_type: 'bearer',
    expires_in: EXPIRES_IN,
  };
}

/** Recover the account a token belongs to, or null if it is not one of ours. */
export function userFromToken(token) {
  if (typeof token !== 'string') return null;
  const prefix = token.startsWith(TOKEN_PREFIX) ? TOKEN_PREFIX
               : token.startsWith(REFRESH_PREFIX) ? REFRESH_PREFIX
               : null;
  if (!prefix) return null;
  const rest = token.slice(prefix.length);
  const at   = rest.indexOf(SEPARATOR);
  if (at === -1) return null;
  return findUser(decodeURIComponent(rest.slice(at + 1)));
}

export function login(email, password) {
  const user = findUser(email);
  if (!user || !user.passwords.includes(String(password ?? ''))) {
    throw new MockApiError('Invalid email or password', 401);
  }
  return { ...issueTokens(user), user: publicUser(user) };
}

export function refresh(refreshToken) {
  const user = userFromToken(refreshToken);
  if (!user) throw new MockApiError('Invalid or expired refresh token', 401);
  return issueTokens(user);
}

export function me(accessToken) {
  const user = userFromToken(accessToken);
  if (!user) throw new MockApiError('Not authenticated', 401);
  return publicUser(user);
}

/** Roles other than Planner get read-only access to the working plan. */
export function requirePlanner(accessToken, action = 'perform this action') {
  const user = userFromToken(accessToken);
  if (!user) throw new MockApiError('Not authenticated', 401);
  if (user.role !== 'Planner') {
    throw new MockApiError(
      `Only Planners can ${action}. Managers have read-only access.`,
      403,
    );
  }
  return user;
}
