/**
 * PM2 Ecosystem Configuration
 * BuddyRide API - Production
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'buddyride-api',
      script: 'dist/main.js',

      // Cluster mode: one worker per logical CPU core
      instances: 'max',
      exec_mode: 'cluster',

      // File watching (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'prisma'],

      // Auto-restart if RSS memory exceeds 512 MB
      max_memory_restart: '512M',

      // Restart back-off: wait 100 ms, double up to 10 s
      restart_delay: 100,
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '5s',

      // Graceful shutdown: wait up to 5 s for in-flight requests
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // ── Production environment ──────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ── Logging ─────────────────────────────────────────────
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      log_type: 'json',

      // Rotate logs at 10 MB; keep 7 files
      // (requires pm2-logrotate module: pm2 install pm2-logrotate)

      // ── Source maps ─────────────────────────────────────────
      source_map_support: true,

      // ── Node.js flags ───────────────────────────────────────
      node_args: [
        '--max-old-space-size=460',   // keep below max_memory_restart ceiling
        '--enable-source-maps',
      ],

      // ── Auto-restart on crash ────────────────────────────────
      autorestart: true,

      // ── Cron restart (optional: nightly at 3 AM) ─────────────
      // cron_restart: '0 3 * * *',
    },
  ],
};
