const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => 
    file.endsWith('.js') && file !== 'index.js'
);

for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            // Removido o .toJSON()
            commands.push(command.data);
            console.log(`[INFO] Carregado comando: ${command.data.name}`);
        } else {
            console.log(`[AVISO] O comando em ${filePath} está faltando 'data' ou 'execute' requerida.`);
        }
    } catch (error) {
        console.error(`[ERRO] Erro ao carregar comando ${file}:`, error);
    }
}

// Verificar token e client ID antes de prosseguir
if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'seu_token_do_bot_aqui') {
    console.error('[ERRO] Token do bot inválido no arquivo .env');
    process.exit(1);
}

if (!process.env.CLIENT_ID || process.env.CLIENT_ID === 'id_do_seu_bot_aqui') {
    console.error('[ERRO] Client ID inválido no arquivo .env');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log(`Começando a atualizar ${commands.length} comandos (/) da aplicação.`);
        console.log('Usando Client ID:', process.env.CLIENT_ID);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`Sucesso! ${data.length} comandos (/) foram atualizados.`);
    } catch (error) {
        if (error.code === 0) {
            console.error('[ERRO] Falha na autenticação. Verifique se o token do bot está correto no arquivo .env');
        } else {
            console.error('Erro ao atualizar comandos:', error);
        }
    }
})();
