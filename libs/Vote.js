import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Server } from './Server.js';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../bot.js';

var NBR_SQUARE_TO_LOAD = 10;

export class Vote {
    constructor(/*Interaction*/client, /*JsonDB*/db, /*JsonDB*/config, /*User*/author, /*Guild*/guild, /*Object*/subject={name:"", data:{}}, participants="vote_role", /*Message*/msg, /*Date*/start_time=new Date(), /*Date*/end_time=new Date(start_time.getTime()+1000*60*60*24*2), /*string*/id=uuidv4(), /*object*/votes={}) {
        this.id = id;
        this.client = client;
        this.author = author;
        this.db = db;
        this.config = config;
        this.subject = subject;
        for (let k in this.subject.data) {
            if (!k) delete this.subject.data.k
        }
        this.msg = msg;
        this.guild = guild || msg.guild;
        this.start_time = start_time;
        this.end_time = end_time;
        this.participants = participants;
        this.votes = votes;
        this.votes[this.author.id] = true;
    }

    async init() {
        this.server = new Server(this.client, this.db, this.config, this.guild);
        await this.server.init();
        this.text = {
            a: "",
            b: ""
        };
        switch (this.subject.name) {
            case "channel_create":
                this.text.a += `pour la création du salon ${this.subject.data.name}`;
                this.text.b += `créer le salon \`#${this.subject.data.name}\``
                if (this.subject.data.parent) {
                    console.debug(this.subject.data.parent);
                    this.subject.data.parent.discord = await this.client.channels.fetch(this.subject.data.parent.id);
                    this.text.b += ` dans la catégorie \`${this.subject.data.parent.name}\``;
                }
                if (this.subject.data.description) {
                    this.text.b += ` avec la description \`${this.subject.data.description}`;
                    if (this.text.b.length > 4096) {
                        this.text.b = this.text.b.slice(0, 4090) + "…";
                    }
                    this.text.b += "\`"
                }
                break;
            case "other":
                this.text.b += ": `" + this.subject.data.proposition;
                if (this.text.b.length > 4096) {
                    this.text.b = this.text.b.slice(0, 4090) + "…";
                }
                this.text.b += "`";
        }
        await this.listen();
        await log(`Vote ${this.id} started`);
        return this;
    }

    async save() {
        this.db.push(`/votes/${this.id}`, {
            id: this.id,
            author_id: this.author.id,
            subject: this.subject,
            start_time: this.start_time.getTime(),
            end_time: this.end_time.getTime(),
            participants: this.participants,
            msg: {
                msg_id: this.msg.id,
                channel_id: this.msg.channel.id,
                guild_id: this.msg.guild.id
            },
            votes: this.votes
        });
    }

    async listen() {
        let listener = async button_interact => {
            if (!button_interact.isButton()) return;
            if (button_interact.message.id != (await this.msg).id) return;
            if (!(await this.participants_users()).map(u=>u.id).includes(button_interact.user.id)) {
                await button_interact.reply({ content: ":warning: Désolé, vous n'avez pas l'autorisation de participer à ce vote", ephemeral: true });
                return;
            }
            await button_interact.deferUpdate();
            this.votes[button_interact.user.id] = button_interact.customId == "true";
            await this.update(button_interact);
        }
        this.client.on("interactionCreate", listener);
        setTimeout(async ()=>{
            if (this.hasOwnProperty("result")) return;
            this.client.removeListener('interactionCreate', listener);
            await this.end();
        }, this.end_time.getTime() - Date.now());
        return this;
    }

    async update(interaction) {
        let coeficient_true = Object.values(this.votes).filter(v=>v).length / Object.values(this.votes).length;
        if (Object.values(this.votes).length == 0) coeficient_true = 1;
        let nbr_green_square = Math.round(coeficient_true*NBR_SQUARE_TO_LOAD);
        this.embed = new MessageEmbed()
            .setColor(this.config.getData("/main_color"))
            .setTitle(`⚖️ Vote ${this.text.a}`)
            .setDescription(`${this.author.username} propose de ${this.text.b}`)
            .addField(`${"🟩".repeat(nbr_green_square)}${"🟥".repeat(NBR_SQUARE_TO_LOAD-nbr_green_square)}`, `${Object.values(this.votes).filter(v=>v).length} (${Math.round(coeficient_true*100)}%) | ${Object.values(this.votes).filter(v=>!v).length} (${Math.round(100-(coeficient_true*100))}%)`)
            .setFooter({ text: `${Object.keys(this.votes).length}/${(await this.participants_users()).length} votants | Fin : ${this.end_time.toLocaleString("fr-FR")}` });
        this.components = new MessageActionRow()
            .addComponents([
                new MessageButton()
                    .setCustomId("true")
                    .setLabel("Pour")
                    .setEmoji("✅")
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setCustomId("false")
                    .setLabel("Contre")
                    .setEmoji("⛔")
                    .setStyle("DANGER")
            ]);
        await interaction.editReply({ content: `${this.server.vote_role.discord}`, embeds: [this.embed], components: [this.components] });
        this.msg = await interaction.fetchReply();
        await this.save();
        if (
            Object.values(this.votes).filter(v=>v).length > (await this.participants_users()).length/2
            ||
            Object.values(this.votes).filter(v=>!v).length > (await this.participants_users()).length/2
        ) {
            await this.end();
            return this;
        }
        return this;
    }

    async end() {
        this.result = Object.values(this.votes).filter(v=>v).length > Object.values(this.votes).filter(v=>!v).length;
        let coeficient_true = Object.values(this.votes).filter(v=>v).length / Object.values(this.votes).length;
        if (Object.values(this.votes).length == 0) coeficient_true = 1;
        let nbr_green_square = Math.round(coeficient_true*NBR_SQUARE_TO_LOAD);
        this.embed = new MessageEmbed()
            .setColor(["#f04747", "#43b581"][+this.result])
            .setTitle(`⚖️ Vote ${this.text.a}`)
            .setDescription(`${this.author.username} propose de ${this.text.b}`)
            .addField(`${"🟩".repeat(nbr_green_square)}${"🟥".repeat(NBR_SQUARE_TO_LOAD-nbr_green_square)}`, `${Object.values(this.votes).filter(v=>v).length} (${Math.round(coeficient_true*100)}%) | ${Object.values(this.votes).filter(v=>!v).length} (${Math.round(100-(coeficient_true*100))}%)`)
            .addField("Le vote est terminé !", `Le résultat est **${["négatif", "positif"][+this.result]}** !`)
            .setFooter({ text: `${Object.keys(this.votes).length}/${(await this.participants_users()).length} votants` });;
        await this.msg.edit({ components: [] });
        await this.msg.edit({ embeds: [this.embed] });
        if (this.result) {
            switch (this.subject.name) {
                /*
                case "channel_create":
                    let data = this.subject.data;
                    let opts = {
                        type: data.type,
                        reason: "Ce salon résulte de la volonté commune"
                    };
                    if (data.description) opts.topic = data.description;
                    if (data.parent) opts.parent = data.parent.id;
                    console.debug(opts);
                    await this.server.guild.channels.create(this.subject.data.name, opts);
                    await this.msg.reply({ content: `${this.server.vote_role.discord}`, embeds: [
                        new MessageEmbed()
                            .setColor(this.config.getData("/main_color"))
                            .setTitle("Vote terminé")
                            .setDescription("La mesure décidée à la majorité a été appliquée")
                    ] });
                    break;
                */
                case "other":
                default:
                    await this.msg.reply({ content: `${this.server.admin_role.discord} ${this.server.vote_role.discord}`, embeds: [
                        new MessageEmbed()
                            .setColor(this.config.getData("/main_color"))
                            .setTitle("Vote terminé")
                            .setDescription("Veuillez appliquer la mesure décidée à la majorité")
                    ] });
                    break;
            }
        }
        await this.db.delete(`/votes/${this.id}`);
        await log (`Vote ${this.id} ended`);
        return this;
    }

    async participants_users() {
        if (this.participants == "vote_role") return await (await this.server.guild.members.fetch()).filter(m=>!m.user.bot && m.roles.cache.some(r=>r.id == this.server.vote_role.discord.id)).toJSON();
        if (this.participants == "everyone") return this.guild.members.filter(m=>!m.user.bot);
        if (typeof this.participants == "array") return this.participants.map(async p=>await this.client.users.fetch(p));
    }
}