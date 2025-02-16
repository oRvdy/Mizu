const { Collection } = require('discord.js');

// Organizar os managers em uma estrutura mais limpa
module.exports = {
    CommandManager: require('./CommandManager'),
    DatabaseManager: require('./DatabaseManager'),
    RecruitmentManager: require('./RecruitmentManager'),
    ClanManager: require('./ClanManager'),
    EventManager: require('./EventManager')
};
