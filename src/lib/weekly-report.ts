import { moods } from './catalog.ts';

type Record = { date: string; mood: string };
export function dateBefore(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function weeklyReport(records: Record[], end: string) {
  const start = dateBefore(end, 6);
  const previousStart = dateBefore(end, 13);
  const previousEnd = dateBefore(end, 7);
  const valid = records.filter(record => moods.some(mood => mood.id === record.mood));
  // One check-in per day, including when imported data contains duplicates.
  const unique = [...new Map(valid.map(record => [record.date, record])).values()];
  const current = unique.filter(record => record.date >= start && record.date <= end);
  const previous = unique.filter(record => record.date >= previousStart && record.date <= previousEnd);
  const distribution = moods.map(mood => ({ id: mood.id, label: mood.label, emoji: mood.emoji,
    count: current.filter(record => record.mood === mood.id).length,
  })).filter(mood => mood.count > 0).sort((a, b) => b.count - a.count);
  const mostFrequent = distribution.filter(mood => mood.count === distribution[0]?.count);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = dateBefore(end, 6 - index);
    const record = current.find(record => record.date === date);
    const mood = moods.find(mood => mood.id === record?.mood);
    return { date, mood: mood ? { id: mood.id, label: mood.label, emoji: mood.emoji } : null };
  });
  return { start, end, checkIns: current.length, previousCheckIns: previous.length,
    change: current.length - previous.length, distribution, mostFrequent, days,
    reflection: current.length === 0
      ? 'Your week is still a blank page. A small check-in is a lovely place to begin.'
      : `You made space for yourself on ${current.length} of 7 days. Take a moment to notice what helped you feel supported.`,
  };
}
export type WeeklyReport = ReturnType<typeof weeklyReport>;
