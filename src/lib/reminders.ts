export function zonedClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

export function reminderDue({ enabled, time, timezone, completedDates, dismissedDate, now = new Date() }: {
  enabled: boolean; time: string; timezone: string; completedDates: string[]; dismissedDate?: string | null; now?: Date;
}) {
  if (!enabled) return false;
  const clock = zonedClock(now, timezone);
  return clock.time >= time && dismissedDate !== clock.date && !completedDates.includes(clock.date);
}
