module.exports = {
  apps: [{
    name: 'magus-helpdesk',
    script: 'src/index.js',
    cwd: '/var/www/magus-helpdesk/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/pm2/magus-helpdesk-error.log',
    out_file: '/var/log/pm2/magus-helpdesk-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 10,
    watch: false
  }]
};
