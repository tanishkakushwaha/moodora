import { Brand } from '@/components/brand';
import Link from 'next/link';
export const metadata = { title: 'Privacy' };
export default function Page() {
    return <main id="main-content" className="legal-page">
  <Brand />
  <h1>Your private little space.</h1>
  <p>Moodora stores your account name, email, password hash (when you use a password), profile picture link, moods, diary entries, theme preference, and saved quote IDs in the application’s PostgreSQL database.</p>
  <h2>Who can see your writing?</h2>
  <p>The application restricts diary entries, mood records, and saved quotes to the signed-in account that created them. Database operators can technically access stored records. Journal content is not end-to-end encrypted.</p>
  <h2>Sharing with a partner</h2>
  <p>Couples connect by creating and accepting a one-time invitation. Connecting does not automatically share any diary entries or moods. Each author chooses which records to share. A connected partner can read those selected records, including later changes, but cannot edit or delete them. Unsharing or disconnecting stops future access through the app; personal records are kept. Copies a partner has already made cannot be retracted.</p>
  <h2>Sign-in and cookies</h2>
  <p>Moodora uses Auth.js session cookies to keep you signed in. If Google sign-in is enabled and you choose it, Google processes authentication under its own privacy policy. Loading a profile image from an external URL sends a request to that image provider.</p>
  <h2>Your data</h2>
  <p>You can edit and delete individual diary entries and moods in the app, and download your data in Settings. This local installation does not send your journal to an analytics or AI service. Data retention, hosting, backups, and database administration are controlled by whoever operates this installation.</p>
  <h2>Before a public launch</h2>
  <p>This policy describes the provided application. An operator launching a hosted service must provide their identity, privacy contact, jurisdiction-specific rights, and retention policy here.</p>
  <Link className="button button-outline" href="/">Back to Moodora</Link>
    </main>;
}
