import { fetchWithAuth } from '../lib/api/fetcher';

describe('fetchWithAuth', () => {
  it('throws error if no token', async () => {
    await expect(fetchWithAuth('/api/dashboard/kpis', '', {})).rejects.toThrow();
  });
});
