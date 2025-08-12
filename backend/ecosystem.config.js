module.exports = {
  apps: [
    {
      name: 'PFCMv2-backend',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: true,
      max_restarts: 0,
      restart_delay: 3000,
      listen_timeout: 8000,
      kill_timeout: 3000,
      max_memory_restart: '2048M',
      node_args: '--max-old-space-size=1024',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      env: {
        NODE_ENV: 'production',
      },
      restartable: true,
    },

    // ✅ เพิ่ม worker สำหรับ reset RSRV
    {
      name: 'reset-rsrv-worker',
      script: './resetRSRVWorker.js',
      instances: 1,
      exec_mode: 'fork', // run เป็น process เดี่ยว
      autorestart: true,
      watch: false,
      restart_delay: 3000,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/reset-worker-out.log',
      error_file: './logs/reset-worker-error.log',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
