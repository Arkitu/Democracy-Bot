import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { Vote } from '../../libs/Vote.js';

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
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('other')
            .setDescription('Pour les autres votes')
            .addStringOption(opt => 
                opt
                    .setName("proposition")
                    .setDescription("La proposiotion soumise au vote")
                    .setRequired(true)
            )
    )
export async function execute(interaction = new CommandInteraction(), config, db) {
    await interaction.deferReply();

    let opts = {
        subcommandgroup: await interaction.options.getSubcommandGroup(false) || "other",
        subcommand: await interaction.options.getSubcommand(),
        name: await interaction.options.getString("name"),
        description: await interaction.options.getString("description") || "",
        type: await interaction.options.getString("type") || "text",
        parent: await interaction.options.getString("parent"),
        proposition: await interaction.options.getString("proposition")
    }

    if (!interaction.guild) {
        await interaction.editReply(":warning: Vous ne pouvez pas créer de vote en messages privés");
        return;
    }

    switch (opts.subcommandgroup) {
        case "channel": {
            switch (opts.subcommand) {
                case "create": {
                    if (opts.name.lenght >= 100) {
                        await interaction.editReply(":warning: Vous ne pouvez pas avoir un nom de plus de 100 caractères");
                        return;
                    }
                    if (opts.description.lenght >= 1024) {
                        await interaction.editReply(":warning: Vous ne pouvez pas avoir une description de plus de 1024 caractères");
                        return;
                    }
                    let vote_opts = {
                        name:"channel_create",
                        data: {
                            name: opts.name,
                            description: opts.description,
                            type: opts.type
                        }
                    }
                    if (opts.parent) {
                        let parent = await interaction.client.channels.fetch(opts.parent);
                        if ((!parent) || (parent && parent.type != "GUILD_CATEGORY")) {
                            await interaction.editReply(":warning: L'id de la catégorie parente n'est pas valide");
                            return;
                        }
                        vote_opts.data.parent = {id: opts.parent.id};
                    }
                    let vote = new Vote(interaction.client, db, config, interaction.user, interaction.guild, vote_opts, "vote_role")
                    await vote.init();
                    await vote.update(interaction);
                    await vote.save();
                    break;
                }
            }
            break;
        }
        case "other": {
            if (opts.proposition.lenght >= 1024) {
                await interaction.editReply(":warning: Vous ne pouvez pas avoir une proposition de plus de 1024 caractères");
                return;
            }
            let vote = new Vote(interaction.client, db, config, interaction.user, interaction.guild, {name: "other", data: {proposition: opts.proposition}}, "vote_role")
            await vote.init();
            await vote.update(interaction);
            await vote.save();
            break;
        }
    }
}