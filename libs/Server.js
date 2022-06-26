export class Server {
    constructor(client, db, config, guild_resolvable, vote_role_id="", admin_role_id="") {
        this.client = client;
        this.db = db;
        this.config = config;
        this.guild_resolvable = guild_resolvable;
        if (!db.vote_role_id) {
            this.vote_role_id = this.guild.roles.everyone.id;
        } else this.vote_role_id = vote_role_id;
        this.admin_role = {user:!db.admin_role_id}
        this.admin_role_id = admin_role_id;
    }

    async init() {
        this.guild = await this.client.guilds.resolve(this.guild_resolvable);
        if (this.db.getData("/servers").hasOwnProperty(this.guild.id)) {
            let in_db = db.getData(`/servers/${this.guild.id}`);
            this.admin_role_id = in_db.admin_role.role_id;
            this.admin_role = 
            this.vote_role_id = in_db.vote_role_id;
        }
        this.vote_role = await this.guild.roles.fetch(this.vote_role_id);
        if (this.admin_role.user) {
            this.admin_role["role"] = await this.client.users.fetch(this.guild.ownerId);
        } else {
            this.admin_role["role"] = await this.guild.roles.fetch(this.admin_role_id);
        }
        await this.save();
        return this;
    }

    async save() {
        this.db.puch(`/server/${this.guild.id}`, {
            guild_id: this.guild.id,
            admin_role: {
                role_id: this.admin_role.role.id,
                user: this.admin_role.user
            },
            vote_role_id: this.vote_role_id
        });
    }
}