import { describe, it, expect, beforeEach } from 'vitest';
import { chat } from '../chatEngine';
import { authApi, chatApi } from '../../services/api';

describe('chatEngine', () => {
  it('explains the PCF threshold', () => {
    expect(chat({ message: 'What is PCF?' })).toContain('52.5%');
  });

  it('explains how GM% is calculated', () => {
    expect(chat({ message: 'how is gross margin computed' })).toMatch(/effective selling price/i);
  });

  it('lists every entry type', () => {
    const answer = chat({ message: 'what entry types are supported?' });
    for (const type of ['PCT_OFF', 'PRICE_PT', 'BOGO_FREE', 'BOGO_50', 'MUPP', 'TICKET']) {
      expect(answer).toContain(type);
    }
  });

  it('substitutes live plan values into the answer', () => {
    const answer = chat({
      message: 'how many entries do I have?',
      context: { total_entries: 185, total_products: 16, periods: ['P1', 'P2'], channels: ['STR', 'ONL'] },
    });
    expect(answer).toContain('185 entries');
    expect(answer).not.toContain('{entries}');
  });

  it('falls back to an em dash when the context is missing', () => {
    const answer = chat({ message: 'how many entries do I have?' });
    expect(answer).toContain('**— entries**');
    expect(answer).not.toContain('{entries}');
  });

  it('declines questions outside the plan', () => {
    expect(chat({ message: 'what is the weather in Paris' })).toMatch(/outside my scope/);
  });
});


describe('chatApi', () => {
  beforeEach(async () => {
    localStorage.clear();
    await authApi.login('demo@insightsiq.com', 'demo123');
  });

  it('returns a { response } envelope, like the original endpoint', async () => {
    await expect(chatApi.send({ message: 'help' })).resolves.toEqual({
      response: expect.stringContaining('Plan metrics'),
    });
  });
});
