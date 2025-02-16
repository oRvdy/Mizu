class StatusService {
    constructor(client) {
        this.client = client;
    }

    updateStatus() {
        this.client.user.setActivity('Sistema de Recrutamento', { type: 'WATCHING' });
    }
}

module.exports = StatusService;
