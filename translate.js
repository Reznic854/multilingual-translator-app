// pages/api/translate.js — Vercel Serverless Function for Whisper + GPT Translation

import formidable from 'formidable';
import fs from 'fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing file.' });

    const inputLang = fields.inputLang || 'en';
    const outputLang = fields.outputLang || 'hr';
    const sessionId = fields.sessionId || 'anonymous';
    const audio = files.file;

    try {
      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audio.filepath),
        model: 'whisper-1',
        response_format: 'text',
        language: inputLang,
      });

      const transcribedText = transcription;

      // Translate with GPT-4
      const chat = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a translator. Translate the following text from ${inputLang} to ${outputLang}.`,
          },
          {
            role: 'user',
            content: transcribedText,
          },
        ],
      });

      const translatedText = chat.choices[0].message.content;

      return res.status(200).json({ text: translatedText });
    } catch (error) {
      console.error('Translation error:', error);
      return res.status(500).json({ error: 'Translation failed.' });
    }
  });
}
