import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      // `localDate` is deliberately local-calendar rather than UTC, and the test
      // that proves it needs an instant that is one day locally and the next day
      // in UTC. West of UTC that is any late evening; in UTC no such instant
      // exists, so the check goes vacuous and the suite passes on a developer
      // machine while failing on a UTC CI runner. Pinning the zone makes the
      // date tests mean the same thing everywhere.
      //
      // Etc/GMT+6 is UTC-6 all year (POSIX inverts the sign) — a named zone like
      // America/Chicago would drift to -5 for half the year and quietly change
      // what the tests assert.
      TZ: 'Etc/GMT+6',
    },
  },
})
