import { reportingDateRange } from '../../src/shared/utils/reportingDateRange';

describe('reportingDateRange', () => {
  it('includes the complete selected IST end date', () => {
    const { since, until } = reportingDateRange('2026-09-01', '2026-09-09');
    expect(since.toISOString()).toBe('2026-08-31T18:30:00.000Z');
    expect(until.toISOString()).toBe('2026-09-09T18:29:59.999Z');
  });

  it('does not rewrite explicit timestamp instants', () => {
    const { since, until } = reportingDateRange('2026-09-01T10:00:00.000Z', '2026-09-09T12:00:00.000Z');
    expect(since.toISOString()).toBe('2026-09-01T10:00:00.000Z');
    expect(until.toISOString()).toBe('2026-09-09T12:00:00.000Z');
  });
});
