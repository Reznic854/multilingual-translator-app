const express = require('express');
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());

app.post('/translate', upload.single('file'), async (req, res) => {
  const inputLang = req.body.inputLang || 'en';
  const outputLang = req.body.outputLang || 'hr';

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      response_format: 'text',
      language: inputLang,
    });

    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Translate the following from ${inputLang} to ${outputLang}.`,
        },
        {
          role: 'user',
          content: transcription,
        },
      ],
    });

    const translatedText = chat.choices[0].message.content;
    res.json({ text: translatedText });
  } catch (err) {
    console.error('Translation failed:', err);
    res.status(500).json({ error: 'Translation failed' });
  } finally {
    fs.unlinkSync(req.file.path); // clean up temp file
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
