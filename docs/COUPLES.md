# Moodora for couples

Each partner needs a separate account on the same Moodora app. A local `localhost` app is accessible only on the computer running it; partners on separate devices need a shared deployed app and database.

1. Open **Partner** in the main navigation.
2. One person creates an invitation and sends the displayed code to their partner.
3. The other person opens Partner and accepts that code.
4. Each person checks the moods and diary entries they want to share.

Connecting shares nothing automatically. Shared diary entries can be read by the connected partner, including later edits, but edited and deleted only by their author. Uncheck a record to make it private again. Both partners can disconnect; this clears sharing while preserving personal moods and diary entries. Future connections start with nothing shared. Updates refresh every 30 seconds while the Partner tab is visible; Refresh also reloads the feed immediately. A partner may retain copies they previously made, as described in the privacy page.

Invitations expire after 24 hours, can be cancelled, and are replaced when a new code is generated. Only a SHA-256 hash of the random 192-bit code is stored in the database. Codes are shown once and can be copied by their creator. Acceptance consumes invitations from both accounts. Each account can be in only one couple at a time. Server-side user locks serialize connection, sharing, and disconnect operations.

## Database update

The committed `20261114000300_couples` migration adds couples, membership, invitations, and nullable sharing references to moods and diary entries. It does not delete or automatically share existing records. `npm run launch` runs committed migrations before building. For production, use the existing Vercel migration build workflow against the correct hosted database.

## Verification

`npm run typecheck`, `npm test`, and `npm run build` check the implementation. The live integration runner now also covers cancelled/expired/single-use codes, self-invites, private defaults, owner-only sharing, unsharing, preservation of personal records after disconnect, and no restoration of old shares after reconnection.

Run `npm run test:integration` against the local app after the migration. Tests use temporary accounts and remove their own connections, accounts, and records. `tests/couples-database.sql` is an additional rollback-only constraint test for a disposable database after both migrations have been applied.

The prepared update was checked in a temporary source copy. Automated unit tests and PostgreSQL constraint/disconnect checks ran successfully. Live HTTP/account tests require normal terminal networking and have not been run in the restricted coding session.
