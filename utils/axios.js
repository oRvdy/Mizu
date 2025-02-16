const axios = require('axios');
const https = require('https');

// Configuração básica do axios com opções de SSL simplificadas
const instance = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*'
    },
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    validateStatus: (status) => status >= 200 && status < 500
});

// Interceptador para logging e retry simples
instance.interceptors.response.use(
    response => response,
    async error => {
        console.error('Erro na requisição:', {
            url: error.config?.url,
            message: error.message,
            code: error.code
        });
        return Promise.reject(error);
    }
);

module.exports = instance;
