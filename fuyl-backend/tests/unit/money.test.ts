import { clampPaise, fromPaise, proratePaise, toPaise } from '../../src/shared/utils/money';

describe('money boundary helpers', () => {
  test.each([
    [0, 0],
    [0.1, 10],
    [0.2, 20],
    [1.005, 101],
    [162.0, 16200],
    [499.99, 49999],
    [-2.345, -235],
  ])('converts %p rupees to %p paise', (rupees, expectedPaise) => {
    expect(toPaise(rupees)).toBe(expectedPaise);
  });

  it('eliminates binary floating-point drift before addition', () => {
    expect(toPaise(0.1) + toPaise(0.2)).toBe(30);
    expect(fromPaise(toPaise(0.1) + toPaise(0.2))).toBe(0.3);
  });

  it('round-trips valid two-decimal monetary values', () => {
    for (const value of [0, 0.01, 10, 72.5, 322.99, 999999.99]) {
      expect(fromPaise(toPaise(value))).toBe(value);
    }
  });

  it('rejects non-finite rupee amounts and non-integer paise', () => {
    expect(() => toPaise(Number.NaN)).toThrow(TypeError);
    expect(() => toPaise(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => fromPaise(1.5)).toThrow(TypeError);
  });

  it('clamps and rounds intermediate integer-unit calculations', () => {
    expect(clampPaise(-10)).toBe(0);
    expect(clampPaise(10.6)).toBe(11);
    expect(clampPaise(150, 0, 100)).toBe(100);
  });
});

describe('paise proration', () => {
  it('calculates partial refunds without fractional-paise values', () => {
    const originalCommission = toPaise(49.9);
    const remainingAfterRefund = proratePaise(originalCommission, toPaise(222), toPaise(322));

    expect(Number.isSafeInteger(remainingAfterRefund)).toBe(true);
    expect(fromPaise(remainingAfterRefund)).toBe(34.4);
  });

  it('uses cumulative values so repeated refund delivery is deterministic', () => {
    const originalBase = toPaise(499);
    const payment = toPaise(322);
    const cumulativeRefund = toPaise(160);

    const first = proratePaise(originalBase, payment - cumulativeRefund, payment);
    const retried = proratePaise(originalBase, payment - cumulativeRefund, payment);

    expect(retried).toBe(first);
    expect(Number.isSafeInteger(first)).toBe(true);
  });

  it('never introduces drift across many proportional calculations', () => {
    const total = toPaise(999.99);
    for (let part = 0; part <= 100; part += 1) {
      const result = proratePaise(total, part, 100);
      expect(Number.isSafeInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(total);
    }
  });

  test.each([
    [100.5, 1, 2],
    [100, 1.5, 2],
    [100, 1, 0],
  ])('rejects invalid proration inputs (%p, %p, %p)', (total, part, whole) => {
    expect(() => proratePaise(total, part, whole)).toThrow(TypeError);
  });
});
