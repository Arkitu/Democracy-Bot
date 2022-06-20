import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('create_vote')
    .setDescription('Crée un vote')
    .addSubcommandGroup(subcommandGroup => 
        subcommandGroup
            .setName('channel')
            .setDescription('Actions sur les salons')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Créer un salon')
                    .addStringOption(option => 
                        option
                            .setName('name')
                            .setDescription('Nom du salon')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option
                            .setName('description')
                            .setDescription('Description du salon')
                            .setRequired(false)
                    )
                    .addStringOption(option =>
                        option
                            .setName('type')
                            .setDescription('Type du salon (par defaut "text")')
                            .setRequired(false)
                            .addChoice('text', 'text')
                            .addChoice('voice', 'voice')
                    )
                    .addStringOption(option =>
                        option
                            .setName('parent')
                            .setDescription('ID de la catégorie parente')
                            .setRequired(false)
                    )
                    .addIntegerOption(option =>
                        option
                            .setName('permission')
                            .setDescription('Permissions du salon (par defaut "0")')
                            


    )
export async function execute(interaction, config, db) {
    await interaction.reply(':ping_pong: Pong !');
}