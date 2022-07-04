export class Server {
    constructor(client, db, config, guild_resolvable, vote_role_id="", admin_role_id="", constitution={}, db_config={constitution:false}) {
        this.client = client;
        this.db = db;
        this.config = config;
        this.guild_resolvable = guild_resolvable;
        this.admin_role = {
            user: !admin_role_id,
            id: admin_role_id
        };
        this.vote_role = {
            id: vote_role_id
        };
        this.constitution = constitution;
        this.db_config = db_config;
    }

    async init() {
        this.guild = await this.client.guilds.resolve(this.guild_resolvable);
        if (this.db.getData("/servers").hasOwnProperty(this.guild.id)) {
            let in_db = this.db.getData(`/servers/${this.guild.id}`);
            this.admin_role = in_db.admin_role;
            this.vote_role = in_db.vote_role;
            this.constitution = in_db.constitution;
            this.db_config = in_db.config;
        }

        if (!this.vote_role.id) {
            this.vote_role.id = this.guild.roles.everyone.id;
        }
        if (this.admin_role.user) {
            this.admin_role.discord = await this.client.users.fetch(this.guild.ownerId);
        } else {
            this.admin_role.discord = await this.guild.roles.fetch(this.admin_role.id);
        }
        this.vote_role.discord = await this.guild.roles.fetch(this.vote_role.id);

        await this.save();
        return this;
    }

    async save() {
        this.db.push(`/servers/${this.guild.id}`, {
            guild_id: this.guild.id,
            admin_role: {
                id: this.admin_role.discord.id,
                user: this.admin_role.user
            },
            vote_role: {
                id: this.vote_role.discord.id
            },
            constitution: this.constitution,
            config: this.db_config
        });
        return this;
    }
}