import { v4 as uuidv4 } from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('new_id')
    .setDescription('Génère un nouvel identifiant');
export async function execute(interaction, config, db) {
    await interaction.reply(uuidv4());
}