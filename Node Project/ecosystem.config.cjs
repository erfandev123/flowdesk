module.exports = {
  apps: [
    {
      name: 'flowdesk',
      script: 'server/src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 4318,
        DATA_DIR: './server/data',
      },
      out_file: './logs/flowdesk-out.log',
      error_file: './logs/flowdesk-error.log',
      time: true,
    },
  ],
};
