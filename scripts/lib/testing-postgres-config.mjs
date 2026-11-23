// These settings belong only to the cluster inside the testing checkout.
// Reapply them after an interrupted initdb and on subsequent setup attempts.
export function testingPostgresConfiguration(existing = '') {
  const preserved = existing.split(/\r?\n/).filter(line =>
    !/^\s*(listen_addresses|port|unix_socket_directories)\s*=/.test(line)
    && line.trim() !== '# Moodora testing cluster settings',
  ).join('\n').trimEnd();
  return `${preserved}${preserved ? '\n' : ''}# Moodora testing cluster settings\nlisten_addresses = '127.0.0.1'\nport = 55440\nunix_socket_directories = '/tmp'\n`;
}
