import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('constitution')
    .setDescription('Affiche la constitution du serveur');
export async function execute(interaction, config, db) {
    await interaction.reply(':ping_pong: Pong !');
}