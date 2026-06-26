import type { DayPlan, WeekPlan } from '../types'

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** ISO yyyy-mm-dd for a Date in local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The Monday on or before the given date. */
export function mondayOf(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function emptyWeek(weekStartDate: string, householdServings: number): WeekPlan {
  const start = new Date(weekStartDate + 'T00:00:00')
  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: isoDate(d), lunchRecipeId: null, dinnerRecipeId: null }
  })
  return { weekStartDate, days, householdServings }
}

/** Human label like "Jun 23 – Jun 29". */
export function weekRangeLabel(week: WeekPlan): string {
  const start = new Date(week.days[0].date + 'T00:00:00')
  const end = new Date(week.days[6].date + 'T00:00:00')
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function addWeeks(weekStartDate: string, n: number): string {
  const d = new Date(weekStartDate + 'T00:00:00')
  d.setDate(d.getDate() + n * 7)
  return isoDate(d)
}
