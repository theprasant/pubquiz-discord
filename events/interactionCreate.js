import { Events, MessageFlags } from 'discord.js';
import config from '../config.json' with {type: 'json'};
const { winChannels } = config;
export const name = Events.InteractionCreate;
export async function execute(interaction) {
    if (interaction.isButton()) {
        await interaction.deferUpdate();
        const [type, action] = interaction.customId.split('-');
        if (type === 'win') {
            if(interaction.member.roles.cache.has(winChannels.modRole) === false) {
                await interaction.followUp({ content: 'You do not have permission to approve or deny this.', flags: MessageFlags.Ephemeral });
                return;
            }
            if (action === 'approve') {
                // Send approval message along with the attachment
                try {
                    const winChannel = interaction.client.channels.cache.get(winChannels.mainChannel);
                    if (winChannel) {
                        let content = '✅ Approved\n' + interaction.message.content;
                        await winChannel.send({ content: interaction.message.content, files: interaction.message.attachments.map(a => a) });
                        await interaction.editReply({ content: content, components: [] });
                    }
                } catch (error) {
                    console.error('Error sending approval message:', error);
                }
            } else if (action === 'deny') {
                // Disable the buttons and add "❌ Denied" to the content
                try {
                    let content = '❌ Denied\n' + interaction.message.content;
                    await interaction.editReply({ content: content, components: [] });
                } catch (error) {
                    console.error('Error sending denial message:', error);
                }
            }
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            // await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    }
}