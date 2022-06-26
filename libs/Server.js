export class Server {
    constructor(client, db, config, guild, vote_role_id="", admin_role_id="") {
        this.client = client;
        this.db = db;
        this.config = config;
        this.guild = guild;
        if (!db.vote_role_id) {
            this.vote_role_id = this.guild.roles.everyone.id;
        } else this.vote_role_id = vote_role_id;
        this.admin_role = {user:!db.admin_role_id}
        this.admin_role_id = admin_role_id;
    }

    async init() {
        this.vote_role = await this.guild.roles.fetch(this.vote_role_id);
        if (this.admin_role.user) {
            this.admin_role["role"] = await this.client.users.fetch(this.guild.ownerId);
        } else {
            this.admin_role["role"] = await this.guild.roles.fetch(this.admin_role_id);
        }
        return this;
    }
}