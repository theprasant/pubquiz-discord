import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getQuestion } from '../../lib/getQuestion.js';
// import { getGeminiResponse } from '../../lib/gemini.js';
import { getGptResponse } from '../../lib/getverdict.js';
import { getRules } from '../../lib/getRules.js';
import { gDocs } from '../../lib/sheet.js';
import config from '../../config.json' with { type: 'json' };
const { logChannelId, gSheetNames, models, defaultModel } = config;

export const data = new SlashCommandBuilder()
    .setName('pytanie')
    .setDescription('Fact check')
    .addIntegerOption(option =>
        option.setName('k')
            .setDescription('Category number')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('p')
            .setDescription('Question number')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('comment')
            .setDescription('Your comment on the question.')
            .setRequired(true)
    )
    // .addStringOption(option =>
    //     option.setName('model')
    //         .setDescription('AI Model to use')
    //         .addChoices(
    //             ...Object.entries(models).map(([key, { name }]) => ({
    //                 name: name,
    //                 value: key
    //             }))
    //         )
    //         .setRequired(true)
    // )

export async function execute(interaction) {

    await interaction.deferReply(/*{ flags: MessageFlags.Ephemeral }*/);

    try {
        const category = interaction.options.getInteger('k');
        const question = interaction.options.getInteger('p');
        const comment = interaction.options.getString('comment');
        const model = defaultModel; //interaction.options.getString('model');

        console.log('Selected model:', model);

        const questionData = await getQuestion(category, question);
        const rules = await getRules(category, question, model);

        if (!questionData) return await interaction.editReply({ content: "This question doen't exists.", flags: MessageFlags.Ephemeral });
    
        console.log('questionData:', questionData);
        const aiResponse = await getGptResponse(questionData, comment, rules, model);
        // const aiResponse = await getGeminiResponse(questionData, comment, rules);
        console.log('aiResponse:', aiResponse);
    
        const logsDoc = gDocs.questionsNlogs;
        await logsDoc.loadInfo();
        const logsSheet = logsDoc.sheetsByTitle[gSheetNames.logs];

        let logRow;
        let newRowData = {
            Number : `K${category}P${question}`,
            Server : interaction.guild.id,
            Channel : interaction.channel.id,
            Host : interaction.user.id,
            Timestamp : new Date().toISOString(),
            Comment : comment,
            Verdict : aiResponse.json?.verdict || 'N/A',
            Rationale : aiResponse.json?.rationale || 'N/A',
            Links : aiResponse.json?.sources ? aiResponse.json.sources.join(' , ') : 'N/A',
            Model: aiResponse.model,
            Latency: `${aiResponse.latency ? (aiResponse.latency/1000).toFixed(2) : 'N/A '} s`
        };

        if(aiResponse.json){
            console.log('AI Response JSON:', aiResponse.json);
            await logsSheet.addRow(newRowData);
        } else {
            console.log('AI Response JSON is empty or invalid');
            await logsSheet.addRow({...newRowData, AiResponse: aiResponse.text.slice(0, 5000)});
        }

        // console.log('Log Row:', logRow);

        const textContent = `**Comment**: ${newRowData.Comment}\n**Verdict**: \`${newRowData.Verdict}\`\n> **Rationale**: ${newRowData.Rationale}\n\nLinks: ${newRowData.Links}`

        try {
            const logChannel = await interaction.client.channels.fetch(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
                await logChannel.send({ content: `New log for question \`${newRowData.Number}\` by <@${newRowData.Host}> [\`${newRowData.Host}\`]\n${textContent}`.slice(0, 2000) });
            } else {
                console.error('Log channel is not text-based or could not be found.');
            }
        } catch (error) {
            
        }

        await interaction.editReply({ content: `**Question**: ${questionData.question}\n${textContent}`.slice(0, 2000)/*, flags: MessageFlags.Ephemeral */ });
        // const logRow = await logsSheet.addRow({ Number: 'K1P1', Comment: 'Nice comment!' });
    
    
    } catch (error) {
        console.error('Error occurred while processing:', error);
        await interaction.editReply({ content: "An error occurred while processing your request.", flags: MessageFlags.Ephemeral });
    }

}