import { aiConfiguration, json } from '../../../lib/server-ai';
export function GET() { return json(aiConfiguration()); }
