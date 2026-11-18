import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/branding';
import { ThemeProvider } from '@/components/providers';
import './globals.css';
import './moodora.css';
import './couples.css';
import './pastel.css';
import './features.css';
export const metadata: Metadata = { icons: { icon: '/icon.svg' }, title: { default: `${APP_NAME} — Your soft place to land`, template: `%s · ${APP_NAME}` }, description: 'Your cozy corner for daily moods, private diary pages, and small moments of self-care. A little space. A softer day.' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="en" suppressHydrationWarning><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <ThemeProvider>{children}</ThemeProvider>
  </body></html>;
}
