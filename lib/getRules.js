import { gDocs } from "./sheet.js";
import 'dotenv/config';
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import config from '../config.json' with { type: 'json' };
const { defaultModel, models } = config;

const openAi = new OpenAI({});
const googleAi = new GoogleGenAI({});

export async function getRules(categoryNo, questionNo, model) {
    const questionsNlogsdoc = gDocs.questionsNlogs;
    const qidstring = `K${categoryNo}P${questionNo}`;

    await questionsNlogsdoc.loadInfo();
    const sheet = questionsNlogsdoc.sheetsByIndex[0];
    // const sheet = doc.sheetsByTitle['quiz_bot_questions']; // Questions sheet
    const rows = await sheet.getRows();

    const questionRow = rows.find(row => row._rawData[0] === qidstring);

    if (!questionRow) return;

    const questionObj = {
        number: questionRow._rawData[0],
        question: questionRow._rawData[1],
        answer: questionRow._rawData[2],
        link: questionRow._rawData[3]
    }

    const rules = await fetchRules(questionObj, model);
    console.log('rules: ', rules);
    return rules;
}

async function fetchRules(questionObj, model) {
    const rulesdoc = gDocs.rules;
    await rulesdoc.loadInfo();
    const sheet = rulesdoc.sheetsByIndex[0];

    // get the headers
    const rows = await sheet.getRows();
    const ruleCategories = sheet.headerValues;
    console.log('ruleCategories: ', ruleCategories);

    const rulesResponse = (await getChoice(questionObj, ruleCategories, model))?.trim().toLowerCase();
    console.log('ruleResponse: ', rulesResponse);
    const ruleIndexes = (!rulesResponse || rulesResponse === 'none') ? [] : rulesResponse.split(',').map(Number);

    const rulesObj = {};
    for (const index of ruleIndexes) {
        rulesObj[ruleCategories[index - 1]] = rows.map(row => row._rawData[index - 1]).filter(Boolean);
    }
    return rulesObj;
}

// await getRules(5, 1);

// `Your task: Given the question, answer and optionally a link, and a set of rule categories, determine the most appropriate rule category that applies to the question and respond with the indexes separated by comma. Choose one or more categories from the provided list. Don't add any explanation or extra text, just provide the indexes. If none of the categories fit, respond with "none". Here are the rule categories: ${ruleCategories.map((cat, index) => `${index + 1}. ${cat}`).join(', ')}. Example response: "1, 3" or "None".`,

export async function getChoice(questionObj, ruleCategories, model) {
    const prompt = `From the following Question, Answer, and Link, determine the most suitable rule catgories for the question, answer and link and RESPOND ONLY WITH THE INDEXES SEPARATED BY COMMA if it matches, respond only with 'none', if it doesn't match with any rule category. Question: ${questionObj.question}\nAnswer: ${questionObj.answer}\nLink: ${questionObj.link || 'N/A'}\nRule Categories: ${ruleCategories.map((cat, index) => `${index + 1}. ${cat}`).join(', ')}`;
    const systemInstruction = `Your task: Given the question, answer and optionally a link, and a set of rule categories, determine the most appropriate rule category that applies to the question and respond with the indexes separated by comma. Choose one or more categories from the provided list. Don't add any explanation or extra text, just provide the indexes. If none of the categories fit, respond with "none". Here are the rule categories: ${ruleCategories.map((cat, index) => `${index + 1}. ${cat}`).join(', ')}. Example response: "1, 3" or "None".`;


    let resText, response;
    if (!model || !models[model]) {
        model = defaultModel;
    }

    const start = process.hrtime.bigint();
    if (model.startsWith('gemini')) {

        response = await googleAi.models.generateContent({
            model: model,
            contents: [
                prompt
            ],
            config: {
                // responseMimeType: 'application/json',
                systemInstruction: systemInstruction,
                tools: [
                    { urlContext: {} },
                    { googleSearch: {} },
                ],
            },
        });

        resText = response.text;

    } else if (model.startsWith('gpt')) {

        response = await openAi.responses.create({
            model: model,
            // model: "gpt-5",
            tools: [
                { type: "web_search" },
            ],
            input: prompt,
            instructions: systemInstruction,
        });

        resText = response.output_text;
    } else {
        throw new Error(`Unsupported model: ${model}`);
    }


    console.log('rules: response.output_text:', resText);
    // fs.writeFileSync('./demo/oires.json', JSON.stringify(response, null, 2));
    return resText;

}