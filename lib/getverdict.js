
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import fs from 'fs';
import config from '../config.json' with { type: 'json' };
const { defaultModel, models } = config;

const openAi = new OpenAI({});
const googleAi = new GoogleGenAI({});

export async function getGptResponse(questionObj, comment, rules, model) {
    const prompt = `Return the response ONLY as a JSON object with no explanation:\nQuestion: ${questionObj.question}\nAnswer: ${questionObj.answer}\n${questionObj.link ? `Link: ${questionObj.link} ` : ''}\nUser's Comment: ${comment}.`;
    const systemInstruction = `Your tasks: 1. Search the web for the question against the user's comment for fact checking. Use the provided link too along with other links from web search. \n2. Get 1-3 URLs related to the question and the user's comment. \n3. Provide a json content with one of three verdicts: ACCEPT / REJECT / MANUAL REVIEW, plus a one-sentence rationale and the URLs in the format {"verdict": "<ACCEPT | REJECT | MANUAL REVIEW>", "rationale": "<one sentence in Polish>", "sources": ["<source1>", "<source2>", ...] (Array of related URLs you found related to this. Not just the one provided in the prompt, but also 1-3 more URLs related to this.) }. \nFetch more than 1 URLs from web related to this for fact checking and included in the sources of the json. \nDon't use the code decoration like \`\`\`json or anything. \nDon't add any other extra text. Only generate the json content. \nIf the User's comment is irrelevant to the question give the verdict as REJECT.\nDon't check if the question is relevant or not, just focus on the user's comment against the question, answer and the links if provided.\nIf you are not sure about the verdict, give it as MANUAL REVIEW. \nIf you can't find any relevant URLs, still provide the json with your best guess of the verdict and rationale.\nHere are the rules (in json format) to follow while making the decision: ${JSON.stringify(rules)}.`;
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
            instructions: systemInstruction
        });

        resText = response.output_text;
    } else {
        throw new Error(`Unsupported model: ${model}`);
    }

    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    console.log('response.output_text:', resText);
    fs.writeFileSync('./demo/oires.json', JSON.stringify(response, null, 2));
    const jsonResponse = getJsonFromText(resText);
    console.log('jsonResponse:', jsonResponse);
    fs.writeFileSync('./demo/response2.json', JSON.stringify(jsonResponse, null, 2));

    return {
        text: resText,
        json: jsonResponse || {},
        model: model || "",
        latency: latencyMs
    };
}

function getJsonFromText(text) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === -1) {
        return null;
    }

    const jsonString = text.substring(jsonStart, jsonEnd);

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return null;
    }
}
