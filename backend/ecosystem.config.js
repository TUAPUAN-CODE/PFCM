module.exports = {
  apps: [
    {
      name: 'PFCMv2',
      script: './server.js',
      instances: '3',
      exec_mode: 'cluster',
      autorestart: true,
      watch: true,
      max_restarts: 0,                  // ไม่จำกัดจำนวนการรีสตาร์ท
      restart_delay: 3000,              // 🔁 รีสตาร์ทใหม่ใน 1 วินาที
      listen_timeout: 8000,             // ⏳ ถ้าแอปไม่ตอบใน 5 วิ -> รีสตาร์ท
      kill_timeout: 3000,               // ⛔ รอแอปปิดตัวเองแค่ 2 วิ ก่อนบังคับปิด
      max_memory_restart: '2048M',
      node_args: '--max-old-space-size=1024',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      env: {
        NODE_ENV: 'production',
      },
      restartable: true,
    }
  ]
};
