require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'DevLogger',
      script: './index.js',
      env: {
        PORT: process.env.PORT || '3110',
        BE_URL: process.env.BE_URL || 'http://192.168.1.38/api/DevLogger',
      },
    },
  ],
};
