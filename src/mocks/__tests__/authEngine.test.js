import { describe, it, expect, beforeEach } from 'vitest';
import * as auth from '../authEngine';
import { authApi, refreshAccessToken } from '../../services/api';

beforeEach(() => {
  localStorage.clear();
});


describe('authEngine', () => {
  it('signs in a known demo account', () => {
    const result = auth.login('demo@insightsiq.com', 'demo123');
    expect(result.user).toMatchObject({ email: 'demo@insightsiq.com', role: 'Planner' });
    expect(result.access_token).toBeTruthy();
    expect(result.refresh_token).toBeTruthy();
  });

  it('accepts the manager password advertised on the login screen', () => {
    expect(auth.login('manager@insightsiq.com', 'demo123').user.role).toBe('Manager');
  });

  it('is case-insensitive on the email', () => {
    expect(auth.login('DEMO@InsightsIQ.com', 'demo123').user.email).toBe('demo@insightsiq.com');
  });

  it('rejects a bad password and an unknown account', () => {
    expect(() => auth.login('demo@insightsiq.com', 'nope')).toThrow(/Invalid email or password/);
    expect(() => auth.login('stranger@example.com', 'demo123')).toThrow(/Invalid email or password/);
  });

  // Regression: the demo emails contain dots, so a token parser that splits on
  // '.' loses the account and every reload logs the user straight back out.
  it('round-trips a token whose email contains dots', () => {
    const { access_token, refresh_token } = auth.login('demo@insightsiq.com', 'demo123');
    expect(auth.userFromToken(access_token)?.email).toBe('demo@insightsiq.com');
    expect(auth.userFromToken(refresh_token)?.email).toBe('demo@insightsiq.com');
  });

  it('does not recognise foreign or malformed tokens', () => {
    expect(auth.userFromToken('some.other.jwt')).toBeNull();
    expect(auth.userFromToken('mock.access.nocolon')).toBeNull();
    expect(auth.userFromToken(null)).toBeNull();
  });

  it('gates planner-only actions by role', () => {
    const planner = auth.login('demo@insightsiq.com', 'demo123');
    expect(() => auth.requirePlanner(planner.access_token, 'submit entries')).not.toThrow();

    const manager = auth.login('manager@insightsiq.com', 'demo123');
    expect(() => auth.requirePlanner(manager.access_token, 'submit entries'))
      .toThrow(/Only Planners can submit entries/);
  });
});


describe('session lifecycle through the API layer', () => {
  it('restores the session on reload, the way AuthContext does', async () => {
    await authApi.login('demo@insightsiq.com', 'demo123');
    // A page reload keeps only localStorage; `me()` has to rebuild the user.
    await expect(authApi.me()).resolves.toMatchObject({
      email: 'demo@insightsiq.com',
      name: 'Demo Planner',
      role: 'Planner',
    });
  });

  it('reports no session once signed out', async () => {
    await authApi.login('demo@insightsiq.com', 'demo123');
    await authApi.logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    await expect(authApi.me()).rejects.toThrow(/Session expired/);
  });

  it('rotates tokens on refresh and clears them when there is no session', async () => {
    await authApi.login('demo@insightsiq.com', 'demo123');
    const before = localStorage.getItem('accessToken');
    const rotated = await refreshAccessToken();
    expect(rotated).toBeTruthy();
    expect(localStorage.getItem('accessToken')).toBe(rotated);
    expect(typeof before).toBe('string');

    localStorage.clear();
    await expect(refreshAccessToken()).resolves.toBeNull();
  });

  it('blocks a Manager from mutating the plan', async () => {
    const { pempalApi } = await import('../../services/api');
    await authApi.login('manager@insightsiq.com', 'demo123');
    await expect(pempalApi.submit([], true)).rejects.toThrow(/read-only access/);
  });
});
