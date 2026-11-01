import { aiConfiguration, json, transcribeAudio } from '../../../lib/server-ai';
export async function POST(request: Request) {
  if (!aiConfiguration().ai) return json({ error: 'OpenAI voice is not configured. Use browser voice input if available, or type your order.' }, 503);
  if (Number(request.headers.get('content-length')) > 5_300_000) return json({ error: 'Keep the recording under 5 MB.' }, 413);
  try {
    const data = await request.formData();
    const file = data.get('file');
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return json({ error: 'An audio file is required.' }, 400);
    if (!file.size || file.size > 5_000_000) return json({ error: 'Record a short order under 5 MB.' }, 413);
    if (!/\.(webm|mp3|mp4|mpeg|mpga|m4a|wav)$/i.test(file.name)) return json({ error: 'Use a WebM, MP3, MP4, M4A or WAV recording.' }, 400);
    return json({ text: await transcribeAudio(file as File), source: 'openai' });
  } catch { return json({ error: 'Transcription is unavailable. Please type your order or try browser voice input.' }, 502); }
}
