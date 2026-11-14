import { Brand } from '@/components/brand';
import Link from 'next/link';
export const metadata = { title: 'Terms' };
export default function Page() {
    return <main id="main-content" className="legal-page">
  <Brand />
  <h1>A little understanding.</h1>
  <p>Moodora is a personal journaling and self-reflection application. It is not a medical service, therapy, diagnosis, or crisis support.</p>
  <h2>Your account and writing</h2>
  <p>Keep your login credentials secure. You retain ownership of your diary and mood notes. Only upload or link images you have permission to use. You can export your data from Settings.</p>
  <h2>Availability</h2>
  <p>This application is provided as-is. Keep independent backups of writing that matters to you. Software errors, hosting outages, or database changes can affect availability or stored content.</p>
  <h2>Before a public launch</h2>
  <p>The operator must replace or complete these installation terms with their legal identity, contact information, applicable law, and any additional service terms.</p>
  <Link className="button button-outline" href="/">Back to Moodora</Link>
    </main>;
}
