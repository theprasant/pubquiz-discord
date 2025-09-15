import { gDocs } from "./sheet.js";

export async function getQuestion(categoryNo, questionNo) {
    const doc = gDocs.questionsNlogs;
    const qidstring = `K${categoryNo}P${questionNo}`;

    await doc.loadInfo();
    // const sheet = doc.sheetsByIndex[0];
    const sheet = doc.sheetsByTitle['quiz_bot_questions']; // Questions sheet
    const rows = await sheet.getRows();

    const questionRow = rows.find(row => row._rawData[0] === qidstring);

    if(!questionRow) return;

    const questionObj = {
        number: questionRow._rawData[0],
        question: questionRow._rawData[1],
        answer: questionRow._rawData[2],
        link: questionRow._rawData[3]
    }
    return questionObj;
}

