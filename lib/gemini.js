import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import fs from 'fs';

const ai = new GoogleGenAI({});

export async function getGeminiResponse(questionObj, comment, rules) {
    /**
     * rules:  {
  'Tłumaczenia i wersje językowe': [
    '✅ Uznaj, jeśli podano poprawny tytuł w innej wersji językowej, powszechnie znanej (np. Home Alone za Kevin sam w domu).',
    '❌ Nie uznawaj, jeśli podano tytuł, który w ogóle nie funkcjonuje jako oficjalny (np. Samotny w domu zamiast Kevin sam w domu).'
  ]
}
     */
    const start = process.hrtime.bigint();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            `Return the response ONLY as a JSON object with no explanation:
            Question: ${questionObj.question}\nAnswer: ${questionObj.answer}\n${questionObj.link ? `Link: ${questionObj.link} ` : ''}\nUser's Comment: ${comment}.`
        ],
        config: {
            // responseMimeType: 'application/json',
            systemInstruction: `Your tasks: 1. Search the web for the question against the user's comment for fact checking. Use the provided link too along with other links from web search. 
            2. Get 1-3 URLs related to the question and the user's comment. 
            3. Provide a json content with one of three verdicts: ACCEPT / REJECT / MANUAL REVIEW, plus a one-sentence rationale and the URLs in the format {"verdict": "<ACCEPT | REJECT | MANUAL REVIEW>", "rationale": "<one sentence in Polish>", "sources": ["<source1>", "<source2>", ...] (Array of related URLs you found related to this. Not just the one provided in the prompt, but also 1-3 more URLs related to this.) }. 
            Fetch more than 1 URLs from web related to this for fact checking and included in the sources of the json. 
            Don't use the code decoration like \`\`\`json or anything. 
            Don't add any other extra text. Only generate the json content. 
            If the User's comment is irrelevant to the question give the verdict as REJECT.
            Don't check if the question is relevant or not, just focus on the user's comment against the question, answer and the links if provided.
            If you are not sure about the verdict, give it as MANUAL REVIEW. 
            If you can't find any relevant URLs, still provide the json with your best guess of the verdict and rationale.
            Here are the rules (in json format) to follow while making the decision: ${JSON.stringify(rules)}.`,
            tools: [
                { urlContext: {} },
                { googleSearch: {} },
            ],
        },
    });
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;

    const jsonResponse = getJsonFromText(response.text);
    // console.log(jsonResponse);
    // fs.writeFileSync('./demo/response2.json', JSON.stringify(jsonResponse, null, 2));

    return {
        text: response.text,
        json: jsonResponse || {},
        model: response.modelVersion,
        latency: latencyMs
    };

}

// await getResponse({
//     question: `How did Elon Musk become successful?`,
//     answer: `Entrepreneurship`,
//     link: ``,
// }, `By gambling in a casino`);

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