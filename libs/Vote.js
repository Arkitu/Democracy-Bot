import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Server } from './Server.js';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../bot.js';

var NBR_SCARE_LOADING = 10;

export class Vote {
    constructor(/*Interaction*/client, /*JsonDB*/db, /*JsonDB*/config, /*User*/author, /*Guild*/guild, /*Object*/subject={name:"", data:{}}, participants="vote_role", /*Message*/msg, /*Date*/start_time=new Date(), /*Date*/end_time=new Date(start_time.getTime()+1000*60*60*24*2), /*string*/id=uuidv4()) {
        this.id = id;
        this.client = client;
        this.author = author;
        this.db = db;
        this.config = config;
        this.subject = subject;
        this.msg = msg;
        this.guild = guild || msg.guild;
        this.start_time = start_time;
        this.end_time = end_time;
        this.participants = participants;
        this.votes = {};
        this.votes[this.author.id] = true;
    }

    async init() {
        this.text = {
            a: "",
            b: ""
        };
        switch (this.subject.name) {
            case "channel_create":
                this.text.a += `pour la création du salon ${this.subject.data.name}`;
                this.text.b += `créer le salon \`#${this.subject.data.name}\``
                if (this.subject.data.parent) {
                    this.subject.data.parent = await this.client.channels.fetch(this.subject.data.parent);
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
        this.server = await new Server(this.client, this.db, this.config, this.guild).init();
        await this.listen();
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
            if (!this.participants_users_id.includes(button_interact.user.id)) {
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
        if (
            Object.values(this.votes).filter(v=>v).length > this.participants_users_id.length/2
            ||
            Object.values(this.votes).filter(v=>!v).length > this.participants_users_id.length/2
        ) {
            await this.end(true);
            return this;
        }
        let coeficient_true = Object.values(this.votes).filter(v=>v).length / Object.values(this.votes).length;
        if (Object.values(this.votes).length == 0) coeficient_true = 1;
        let nbr_green_scare = Math.round(coeficient_true*NBR_SCARE_LOADING);
        this.embed = new MessageEmbed()
            .setColor(this.config.getData("/main_color"))
            .setTitle(`⚖️ Vote ${this.text.a}`)
            .setDescription(`${this.author.username} propose de ${this.text.b}`)
            .addField(`${"🟩".repeat(nbr_green_scare)}${"🟥".repeat(NBR_SCARE_LOADING-nbr_green_scare)}`, `${Object.values(this.votes).filter(v=>v).length} (${Math.round(coeficient_true*100)}%) | ${Object.values(this.votes).filter(v=>!v).length} (${Math.round(100-(coeficient_true*100))}%)`);
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
        await interaction.editReply({ embeds: [this.embed], components: [this.components] });
        this.msg = await interaction.fetchReply();
        await this.save();
        return this;
    }

    async end(sooner=false) {
        this.result = Object.values(this.votes).filter(v=>v) > Object.values(this.votes).filter(v=>!v);
        let coeficient_true = Object.values(this.votes).filter(v=>v).length / Object.values(this.votes).length;
        if (Object.values(this.votes).length == 0) coeficient_true = 1;
        let nbr_green_scare = Math.round(coeficient_true*NBR_SCARE_LOADING);
        this.embed = new MessageEmbed()
            .setColor(["#f04747", "#43b581"][+this.result])
            .setTitle(`⚖️ Vote ${this.text.a}`)
            .setDescription(`${this.author.username} propose de ${this.text.b}`)
            .addField(`${"🟩".repeat(nbr_green_scare)}${"🟥".repeat(NBR_SCARE_LOADING-nbr_green_scare)}`, `${Object.values(this.votes).filter(v=>v).length} (${Math.round(coeficient_true*100)}%) | ${Object.values(this.votes).filter(v=>!v).length} (${Math.round(100-(coeficient_true*100))}%)`)
            .addField("Le vote est terminé !", `Le résultat est **${["négatif", "positif"][+this.result]}** !`);
        await this.msg.edit({ components: [] });
        await this.msg.edit({ embeds: [this.embed] });
        if (this.result) {
            switch (this.subject.name) {
                case "other":
                default:
                    await this.msg.reply(`${this.server.admin_role.role} Veuillez appliquer la mesure votée à la majorité`);
                    break;
            }
        }
        await this.db.delete(`/votes/${this.id}`);
        await log (`Vote ${this.id} ended`);
        return this;
    }

    get participants_users() {
        if (this.participants == "vote_role") return this.server.vote_role.members.filter(u=>!u.bot);
        if (this.participants == "everyone") return this.server.members.filter(u=>!u.bot);
        if (typeof this.participants == "array") return this.participants.map(async p=>await this.client.users.fetch(p));
    }

    get participants_users_id() {
        if (this.participants == "vote_role") return this.server.vote_role.members.filter(u=>!u.bot).map(u=>u.id);
        if (this.participants == "everyone") return this.server.members.filter(u=>!u.bot).map(u=>u.id);
        if (typeof this.participants == "array") return this.participants;
    }
}