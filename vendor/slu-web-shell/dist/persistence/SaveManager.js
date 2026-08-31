export class SaveManager {
    storage;
    key;
    schemaVersion;
    migrations;
    constructor(storage, key, schemaVersion, migrations = {}) {
        this.storage = storage;
        this.key = key;
        this.schemaVersion = schemaVersion;
        this.migrations = migrations;
    }
    async load() {
        const envelope = await this.storage.get(this.key);
        if (!envelope)
            return null;
        if (envelope.schemaVersion > this.schemaVersion)
            throw new Error(`Save is newer than runtime: ${envelope.schemaVersion} > ${this.schemaVersion}`);
        let version = envelope.schemaVersion;
        let data = envelope.data;
        while (version < this.schemaVersion) {
            const migrate = this.migrations[version];
            if (!migrate)
                throw new Error(`Missing save migration ${version} -> ${version + 1}`);
            data = migrate(data);
            version++;
        }
        return data;
    }
    async save(data) { await this.storage.set(this.key, { schemaVersion: this.schemaVersion, savedAt: new Date().toISOString(), data }); }
    async delete() { await this.storage.remove(this.key); }
}
