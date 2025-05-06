
// Multilingual Conversation Translator (React + Supabase + OpenAI Whisper & GPT-4)
// MVP implementation: Users join a session, speak, and see live translated text

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function TranslatorApp() {
  const [sessionId, setSessionId] = useState('');
  const [joined, setJoined] = useState(false);
  const [inputLang, setInputLang] = useState('en');
  const [outputLang, setOutputLang] = useState('hr');
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (joined) {
      const channel = supabase.channel(sessionId);
      channel.on('broadcast', { event: 'new-message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      });
      channel.subscribe();
    }
  }, [joined]);

  const startSession = () => {
    const id = uuidv4();
    setSessionId(id);
    setJoined(true);
  };

  const joinSession = () => {
    if (sessionId.trim()) setJoined(true);
  };

  const handleRecordAndSend = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob);
      formData.append('inputLang', inputLang);
      formData.append('outputLang', outputLang);
      formData.append('sessionId', sessionId);

      await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      });
      setRecording(false);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // 5 sec recording
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Multilingual Conversation App</h1>

      {!joined ? (
        <div className="space-y-2">
          <Button onClick={startSession}>Start New Session</Button>
          <Input placeholder="Enter Session ID" onChange={(e) => setSessionId(e.target.value)} />
          <Button onClick={joinSession}>Join Session</Button>
          <div className="flex gap-2">
            <select onChange={(e) => setInputLang(e.target.value)} defaultValue="en">
              <option value="en">English</option>
              <option value="hr">Croatian</option>
            </select>
            <select onChange={(e) => setOutputLang(e.target.value)} defaultValue="hr">
              <option value="hr">Croatian</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="space-y-2">
                {messages.map((msg, i) => (
                  <div key={i} className="bg-gray-100 p-2 rounded">
                    <strong>{msg.user}:</strong> {msg.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Button onClick={handleRecordAndSend} disabled={recording}>
            {recording ? 'Recording...' : 'Speak'}
          </Button>
        </div>
      )}
    </div>
  );
}
