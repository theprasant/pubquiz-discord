import { GoogleSpreadsheet } from 'google-spreadsheet';
import { serviceAccountAuth } from './serviceacc.js';
import config from '../config.json' with { type: 'json' };
const { gDocIDs } = config;
export const gDocs = {
    questionsNlogs: new GoogleSpreadsheet(gDocIDs.questionsNlogs, serviceAccountAuth),
    rules: new GoogleSpreadsheet(gDocIDs.rules, serviceAccountAuth),
};