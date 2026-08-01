export type VisitPricingInput = {
  oneWayTravelMinutes?: number | null;
  appointmentDate?: string | Date | null;
  timeWindow?: string | null;
  isStatOrRush?: boolean;
  isWeekendOrHoliday?: boolean;
  patientCount?: number;
  additionalPatientFeeCents?: number;
};

export type IntakePricingInput = {
  zipCode?: string | null;
  appointmentDate?: string | Date | null;
  timeWindow?: string | null;
  patientCount?: number;
};

export type VisitPriceQuote = {
  status: 'quoted' | 'custom_quote';
  totalCents: number | null;
  lineItems: Array<{ code: string; amountCents: number | null }>;
};

const travelTiers = [
  { maxMinutes: 60, amountCents: 9000 },
  { maxMinutes: 90, amountCents: 12500 },
  { maxMinutes: 120, amountCents: 15000 },
  { maxMinutes: 150, amountCents: 17500 },
] as const;

const statRushFeeCents = 2500;
const weekendHolidayFeeCents = 2500;
const earlyMorningOrEveningFeeCents = 2500;
const defaultAdditionalPatientFeeCents = 3500;

function cleanNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTimeWindowStartHour(value: string | null | undefined) {
  const match = (value || '').trim().match(/^(\d+)\s(AM|PM)/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const period = match[2].toUpperCase();
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function isWeekend(value: string | Date | null | undefined) {
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const day = date.getDay();
  return day === 0 || day === 6;
}

function getTravelBaseFee(oneWayTravelMinutes: number | null) {
  if (oneWayTravelMinutes === null) return null;

  return travelTiers.find((tier) => oneWayTravelMinutes <= tier.maxMinutes)?.amountCents ?? null;
}

export function calculateVisitPrice(input: VisitPricingInput): VisitPriceQuote {
  const oneWayTravelMinutes = cleanNumber(input.oneWayTravelMinutes);
  const baseFeeCents = getTravelBaseFee(oneWayTravelMinutes);
  const lineItems: VisitPriceQuote['lineItems'] = [{ code: 'travel_base', amountCents: baseFeeCents }];

  if (baseFeeCents === null) {
    return { status: 'custom_quote', totalCents: null, lineItems };
  }

  const startHour = getTimeWindowStartHour(input.timeWindow);
  const patientCount = Math.max(1, Math.floor(cleanNumber(input.patientCount) || 1));
  const additionalPatientFee = Math.max(
    0,
    Math.floor(cleanNumber(input.additionalPatientFeeCents) || defaultAdditionalPatientFeeCents),
  );

  if (input.isStatOrRush) lineItems.push({ code: 'stat_rush', amountCents: statRushFeeCents });
  if (input.isWeekendOrHoliday || isWeekend(input.appointmentDate)) {
    lineItems.push({ code: 'weekend_holiday', amountCents: weekendHolidayFeeCents });
  }
  if (startHour !== null && (startHour < 6 || startHour >= 19)) {
    lineItems.push({ code: 'early_morning_evening', amountCents: earlyMorningOrEveningFeeCents });
  }
  if (patientCount > 1) {
    lineItems.push({ code: 'additional_patients', amountCents: (patientCount - 1) * additionalPatientFee });
  }

  return {
    status: 'quoted',
    totalCents: lineItems.reduce((total, item) => total + (item.amountCents || 0), 0),
    lineItems,
  };
}

function estimateOneWayTravelMinutes(zipCode: string | null | undefined) {
  const prefix = (zipCode || '').trim().slice(0, 3);

  if (prefix === '087' || prefix === '077') return 60;
  if (prefix === '080' || prefix === '081') return 90;
  if (prefix === '085' || prefix === '086' || prefix === '088') return 90;
  return null;
}

export function calculateIntakeVisitPrice(input: IntakePricingInput) {
  return calculateVisitPrice({
    oneWayTravelMinutes: estimateOneWayTravelMinutes(input.zipCode),
    appointmentDate: input.appointmentDate,
    timeWindow: input.timeWindow,
    patientCount: input.patientCount,
  });
}
