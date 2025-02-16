const fs = require('fs').promises;
const path = require('path');

class LocalizationManager {
    constructor() {
        this.languages = new Map();
        this.defaultLanguage = 'pt-BR';
    }

    async loadLanguages() {
        const languagesPath = path.join(__dirname, '..', 'languages');
        const files = await fs.readdir(languagesPath);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const language = file.split('.')[0];
            const content = await fs.readFile(path.join(languagesPath, file));
            this.languages.set(language, JSON.parse(content));
        }
    }

    getText(key, language = this.defaultLanguage, replacements = {}) {
        const langData = this.languages.get(language) || this.languages.get(this.defaultLanguage);
        let text = langData[key] || key;
        
        Object.entries(replacements).forEach(([key, value]) => {
            text = text.replace(`{${key}}`, value);
        });
        
        return text;
    }
}
