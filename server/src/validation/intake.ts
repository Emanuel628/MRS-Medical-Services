const serviceableZipPrefixes = ['077', '080', '081', '085', '086', '087', '088'];

const timeWindowOptions = [
  '6 AM - 7 AM',
  '7 AM - 8 AM',
  '8 AM - 9 AM',
  '9 AM - 10 AM',
  '10 AM - 11 AM',
  '11 AM - 12 PM',
  '12 PM - 1 PM',
  '1 PM - 2 PM',
];

const labOptions = ['LabCorp', 'Quest', 'Oxford', 'Vibrant America', 'Boston Heart', 'SpectraCell', 'Other'];
const serviceAreaOptions = ['Ocean County', 'Central New Jersey', 'Camden County', 'Other'];
const paymentMethods = ['card', 'insurance', 'pay_at_site'];

export const MAX_PATIENT_COUNT = 12;
export const MAX_KIT_COUNT = 12;
const MAX_ADVANCE_BOOKING_DAYS = 180;

const LENGTH_LIMITS = {
  name: 200,
  phone: 40,
  email: 254,
  message: 8000,
  patientName: 200,
  relationshipToPatient: 120,
  streetAddress: 200,
  addressDetails: 200,
  town: 120,
  notes: 3000,
  insuranceProvider: 120,
  insuranceMemberId: 80,
  insuranceGroupNumber: 80,
  policyholderName: 200,
} as const;

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function trimmed(value: unknown) {
  return isString(value) ? value.trim() : '';
}

function exceedsLength(value: unknown, max: number) {
  return isString(value) && value.length > max;
}

function isServiceableZip(value: string) {
  if (!/^\d{5}(-\d{4})?$/.test(value)) return false;
  return serviceableZipPrefixes.includes(value.slice(0, 3));
}

function getEasternDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function isWeekday(dateKey: string) {
  const day = new Date(`${dateKey}T12:00:00`).getDay();
  return day >= 1 && day <= 5;
}

function getEasternHour(date: Date) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    hour: 'numeric',
  }).formatToParts(date).find((part) => part.type === 'hour')?.value;
  return hour ? Number(hour) : 0;
}

function getTimeWindowStartHour(value: string) {
  const match = value.match(/^(\d+)\s(AM|PM)/);
  if (!match) return null;

  const hour = Number(match[1]);
  if (match[2] === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function isWithinBookingWindow(dateKey: string, timeWindow: string) {
  const now = new Date();
  const todayKey = getEasternDateKey(now);
  if (dateKey < todayKey) return false;
  if (dateKey === todayKey) {
    const startHour = getTimeWindowStartHour(timeWindow);
    if (startHour === null || startHour <= getEasternHour(now)) return false;
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_BOOKING_DAYS);
  return dateKey <= getEasternDateKey(maxDate);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPositiveIntegerInRange(value: unknown, max: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= max;
}

/**
 * Re-validates every business rule the intake form enforces client-side so a
 * request that bypasses the browser cannot smuggle in disallowed values.
 * Returns an error message for the first failing rule, or null if the
 * submission is acceptable.
 */
export function validateContactSubmission(body: Record<string, unknown>): string | null {
  const requestType = trimmed(body.requestType);
  if (requestType && requestType !== 'contact' && requestType !== 'intake') {
    return 'Request type is not valid.';
  }

  if (!trimmed(body.name) || exceedsLength(body.name, LENGTH_LIMITS.name)) {
    return 'Enter a valid name.';
  }
  if (!trimmed(body.phone) || exceedsLength(body.phone, LENGTH_LIMITS.phone)) {
    return 'Enter a valid phone number.';
  }
  const email = trimmed(body.email);
  if (!email || !isValidEmail(email) || exceedsLength(body.email, LENGTH_LIMITS.email)) {
    return 'Enter a valid email address.';
  }
  if (!trimmed(body.message) || exceedsLength(body.message, LENGTH_LIMITS.message)) {
    return 'Enter a message.';
  }

  if (requestType !== 'intake') return null;

  const appointmentFor = trimmed(body.appointmentFor) || 'self';
  if (appointmentFor !== 'self' && appointmentFor !== 'someone_else') {
    return 'Appointment recipient is not valid.';
  }

  if (appointmentFor === 'someone_else') {
    if (!trimmed(body.patientName) || exceedsLength(body.patientName, LENGTH_LIMITS.patientName)) {
      return 'Enter the patient name.';
    }
    if (!trimmed(body.relationshipToPatient) || exceedsLength(body.relationshipToPatient, LENGTH_LIMITS.relationshipToPatient)) {
      return 'Enter your relationship to the patient.';
    }
  }

  if (body.patientIsMinor === true && body.guardianAuthorization !== true) {
    return 'A parent or legal guardian must authorize scheduling for a minor.';
  }

  const zipCode = trimmed(body.zipCode);
  if (!isServiceableZip(zipCode)) {
    return 'That ZIP code is outside the current service area.';
  }

  if (!trimmed(body.streetAddress) || exceedsLength(body.streetAddress, LENGTH_LIMITS.streetAddress)) {
    return 'Enter the visit street address.';
  }
  if (exceedsLength(body.addressDetails, LENGTH_LIMITS.addressDetails)) {
    return 'Address details are too long.';
  }
  if (!trimmed(body.town) || exceedsLength(body.town, LENGTH_LIMITS.town)) {
    return 'Enter the visit town or city.';
  }
  if (!/^[A-Za-z]{2}$/.test(trimmed(body.state))) {
    return 'Enter a valid two-letter state.';
  }

  if (body.serviceArea && !serviceAreaOptions.includes(trimmed(body.serviceArea))) {
    return 'Service area is not valid.';
  }
  if (body.preferredLab && !labOptions.includes(trimmed(body.preferredLab))) {
    return 'Preferred lab is not valid.';
  }

  const preferredDate = trimmed(body.preferredDate);
  if (!isValidDateString(preferredDate)) {
    return 'Choose a valid appointment date.';
  }
  if (!isWeekday(preferredDate)) {
    return 'Choose a weekday appointment date.';
  }

  const preferredTimeWindow = trimmed(body.preferredTimeWindow);
  if (!timeWindowOptions.includes(preferredTimeWindow)) {
    return 'Choose a valid appointment time window.';
  }

  if (!isWithinBookingWindow(preferredDate, preferredTimeWindow)) {
    return 'Choose an appointment date within the available booking window.';
  }

  const hasKit = body.hasKit === true;
  if (hasKit) {
    const startHour = getTimeWindowStartHour(preferredTimeWindow);
    if (startHour === null || startHour >= 10) {
      return 'Specialty kit collections must be scheduled before 10 AM.';
    }
  }

  if (!isPositiveIntegerInRange(body.patientCount ?? 1, MAX_PATIENT_COUNT)) {
    return `Group size must be a whole number between 1 and ${MAX_PATIENT_COUNT} patients.`;
  }

  if (hasKit && !isPositiveIntegerInRange(body.kitCount ?? 1, MAX_KIT_COUNT)) {
    return `Specialty kit count must be a whole number between 1 and ${MAX_KIT_COUNT}.`;
  }

  const paymentMethod = trimmed(body.paymentMethod);
  if (!paymentMethods.includes(paymentMethod)) {
    return 'Choose a valid payment method.';
  }

  if (paymentMethod === 'insurance') {
    if (!trimmed(body.insuranceProvider) || exceedsLength(body.insuranceProvider, LENGTH_LIMITS.insuranceProvider)) {
      return 'Enter your insurance provider.';
    }
    if (!trimmed(body.insuranceMemberId) || exceedsLength(body.insuranceMemberId, LENGTH_LIMITS.insuranceMemberId)) {
      return 'Enter your insurance member ID.';
    }
    if (exceedsLength(body.insuranceGroupNumber, LENGTH_LIMITS.insuranceGroupNumber)) {
      return 'Insurance group number is too long.';
    }
    if (!trimmed(body.policyholderName) || exceedsLength(body.policyholderName, LENGTH_LIMITS.policyholderName)) {
      return 'Enter the policyholder name.';
    }
  }

  if (body.termsAccepted !== true) {
    return 'Terms & Conditions and Privacy Policy acknowledgement is required.';
  }

  if (exceedsLength(body.notes, LENGTH_LIMITS.notes)) {
    return 'Notes are too long.';
  }

  return null;
}
