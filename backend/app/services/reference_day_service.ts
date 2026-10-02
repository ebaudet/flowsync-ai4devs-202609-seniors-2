import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'

export const REFERENCE_DAY_HEADER = 'x-client-date'

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * True when `value` is a real calendar day written as `YYYY-MM-DD`
 * (so `2026-02-30` is rejected). Calendar days carry no time zone.
 */
export function isCalendarDay(value: string): boolean {
  return CALENDAR_DAY.test(value) && DateTime.fromISO(value, { zone: 'utc' }).isValid
}

/**
 * The day the person looking at the task is on: the one they send in
 * `X-Client-Date`, or the server's UTC day when they send none. A header that
 * is not a real day is a 422, before anything has been written.
 */
export function resolveReferenceDay(request: HttpContext['request']): string {
  const header = request.header(REFERENCE_DAY_HEADER)

  if (header === undefined) {
    return DateTime.utc().toISODate()
  }

  if (!isCalendarDay(header)) {
    throw new errors.E_VALIDATION_ERROR([
      {
        message: 'The X-Client-Date header must be a valid date in the YYYY-MM-DD format',
        rule: 'format',
        field: 'X-Client-Date',
      },
    ])
  }

  return header
}
