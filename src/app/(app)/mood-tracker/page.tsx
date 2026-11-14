import { MoodTrackerPage } from "@/components/insights";
export const metadata = { title: "Moods" };
export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) { const { date } = await searchParams; return <MoodTrackerPage initialDate={date} />; }
