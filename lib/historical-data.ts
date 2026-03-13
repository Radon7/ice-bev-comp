/**
 * Historical fuel price data for Italy (weekly, €/L including taxes).
 * Source: https://www.fuel-prices.eu/Italy/ (European Commission Oil Bulletin)
 * 52-week snapshot: March 2025 – March 2026
 */

export interface PricePoint {
  date: string;
  euro95: number;
  diesel: number;
}

export const HISTORICAL_PRICES: PricePoint[] = [
  { date: '2025-03-10', euro95: 1.802, diesel: 1.704 },
  { date: '2025-03-17', euro95: 1.782, diesel: 1.683 },
  { date: '2025-03-24', euro95: 1.767, diesel: 1.667 },
  { date: '2025-03-31', euro95: 1.762, diesel: 1.660 },
  { date: '2025-04-07', euro95: 1.761, diesel: 1.657 },
  { date: '2025-04-14', euro95: 1.739, diesel: 1.632 },
  { date: '2025-04-21', euro95: 1.716, diesel: 1.610 },
  { date: '2025-04-28', euro95: 1.705, diesel: 1.599 },
  { date: '2025-05-05', euro95: 1.697, diesel: 1.590 },
  { date: '2025-05-12', euro95: 1.690, diesel: 1.579 },
  { date: '2025-05-19', euro95: 1.699, diesel: 1.591 },
  { date: '2025-05-26', euro95: 1.698, diesel: 1.599 },
  { date: '2025-06-02', euro95: 1.693, diesel: 1.592 },
  { date: '2025-06-09', euro95: 1.690, diesel: 1.586 },
  { date: '2025-06-16', euro95: 1.697, diesel: 1.594 },
  { date: '2025-06-23', euro95: 1.734, diesel: 1.643 },
  { date: '2025-06-30', euro95: 1.747, diesel: 1.676 },
  { date: '2025-07-07', euro95: 1.734, diesel: 1.664 },
  { date: '2025-07-14', euro95: 1.729, diesel: 1.663 },
  { date: '2025-07-21', euro95: 1.727, diesel: 1.664 },
  { date: '2025-07-28', euro95: 1.721, diesel: 1.660 },
  { date: '2025-08-04', euro95: 1.713, diesel: 1.649 },
  { date: '2025-08-11', euro95: 1.709, diesel: 1.641 },
  { date: '2025-08-18', euro95: 1.701, diesel: 1.631 },
  { date: '2025-08-25', euro95: 1.695, diesel: 1.622 },
  { date: '2025-09-01', euro95: 1.697, diesel: 1.623 },
  { date: '2025-09-08', euro95: 1.705, diesel: 1.630 },
  { date: '2025-09-15', euro95: 1.711, diesel: 1.635 },
  { date: '2025-09-22', euro95: 1.714, diesel: 1.638 },
  { date: '2025-09-29', euro95: 1.712, diesel: 1.638 },
  { date: '2025-10-06', euro95: 1.709, diesel: 1.636 },
  { date: '2025-10-13', euro95: 1.699, diesel: 1.625 },
  { date: '2025-10-20', euro95: 1.690, diesel: 1.616 },
  { date: '2025-10-27', euro95: 1.684, diesel: 1.609 },
  { date: '2025-11-03', euro95: 1.695, diesel: 1.632 },
  { date: '2025-11-10', euro95: 1.706, diesel: 1.654 },
  { date: '2025-11-17', euro95: 1.720, diesel: 1.683 },
  { date: '2025-11-24', euro95: 1.731, diesel: 1.703 },
  { date: '2025-12-01', euro95: 1.727, diesel: 1.701 },
  { date: '2025-12-08', euro95: 1.718, diesel: 1.684 },
  { date: '2025-12-15', euro95: 1.708, diesel: 1.665 },
  { date: '2025-12-22', euro95: 1.690, diesel: 1.643 },
  { date: '2025-12-29', euro95: 1.679, diesel: 1.629 },
  { date: '2026-01-05', euro95: 1.655, diesel: 1.644 },
  { date: '2026-01-12', euro95: 1.627, diesel: 1.660 },
  { date: '2026-01-19', euro95: 1.626, diesel: 1.661 },
  { date: '2026-01-26', euro95: 1.635, diesel: 1.673 },
  { date: '2026-02-02', euro95: 1.642, diesel: 1.682 },
  { date: '2026-02-09', euro95: 1.645, diesel: 1.691 },
  { date: '2026-02-16', euro95: 1.648, diesel: 1.696 },
  { date: '2026-02-23', euro95: 1.655, diesel: 1.702 },
  { date: '2026-03-02', euro95: 1.670, diesel: 1.721 },
];
