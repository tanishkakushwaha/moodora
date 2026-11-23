import '@/lib/testing-runtime';
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/branding';
import { ThemeProvider } from '@/components/providers';
import { TrfyxAnalytics } from '@/components/trfyx-analytics';
import './globals.css';
import './moodora.css';
import './couples.css';
import './pastel.css';
import './features.css';
export const metadata: Metadata = { robots: { index: false, follow: false }, icons: { icon: '/icon.svg' }, title: { default: `${APP_NAME} TESTING — Your soft place to land`, template: `%s · ${APP_NAME}` }, description: 'Your cozy corner for daily moods, private diary pages, and small moments of self-care. A little space. A softer day.' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return <html lang="en" suppressHydrationWarning><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div role="status" style={{padding:"8px 16px",textAlign:"center",background:"#fff0cf",color:"#5e4100",fontSize:14}}>Moodora testing · Use test accounts and test payments only</div>
    <ThemeProvider>{children}</ThemeProvider>
    <TrfyxAnalytics />
  </body></html>;
}
