import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('constitution')
    .setDescription('Affiche la constitution du serveur');
export async function execute(interaction, config, db) {
    await interaction.deferReply();
    if (!db.getData(`/servers`).hasOwnProperty(interaction.guild.id)) {
        await interaction.editReply(`:warning: Ce serveur n'est pas enregistré dans ma base de données`);
        return;
    }
    let guild_in_db = db.getData(`/servers/${interaction.guild.id}`);

    if (!guild_in_db.config.constitution) {
        await interaction.editReply(`:warning: Ce serveur n'a pas de constitution`);
        return;
    }
    
    let constitution = guild_in_db.constitution;

    let embed = new MessageEmbed()
        .setColor(config.getData("/main_color"))
        .setTitle(`Constitution du serveur ${interaction.guild.name}`)

    if (constitution.preamble) embed.setDescription(constitution.preamble);
    embed.addFields(constitution.sections.map(s=>{return {name: s.name, value: s.content}}));

    await interaction.editReply({ embeds: [embed] });
}