// Multilingual Conversation Translator (React + Supabase + OpenAI Whisper & GPT-4)
// MVP implementation: Users join a session, speak, and see live translated text

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_REAL_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_REAL_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function TranslatorApp() {
  const [sessionId, setSessionId] = useState('');
  const [joined, setJoined] = useState(false);
  const [inputLang, setInputLang] = useState('en');
  const [outputLang, setOutputLang] = useState('hr');
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const recorderRef = useRef(null);

  useEffect(() => {
    if (joined) {
      const channel = supabase.channel(sessionId);
      channel.on('broadcast', { event: 'new-message' }, ({ payload }) => {
        console.log('Received message:', payload);
        setMessages((prev) => [...prev, payload]);
        setStatus('Translation received.');
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

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
  };

  const handleRecordAndSend = async () => {
    try {
      setStatus('Recording...');
      setRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;
      const audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setStatus('Sending for translation...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('inputLang', inputLang);
        formData.append('outputLang', outputLang);
        formData.append('sessionId', sessionId);

        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            body: formData,
          });

          const result = await res.json();
          console.log('API result:', result);
          if (!res.ok || result.error) {
            setStatus('Translation failed.');
          }
        } catch (err) {
          console.error('Translation error:', err);
          setStatus('Translation failed.');
        } finally {
          setRecording(false);
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // auto stop after 5 seconds
    } catch (error) {
      console.error('Recording failed:', error);
      setStatus('Recording error.');
      setRecording(false);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: 'auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>Multilingual Conversation App</h1>

      {!joined ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={startSession}>Start New Session</button>
          <input
            placeholder="Enter Session ID"
            onChange={(e) => setSessionId(e.target.value)}
          />
          <button onClick={joinSession}>Join Session</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ backgroundColor: '#eee', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                <strong>{msg.user}:</strong> {msg.text}
              </div>
            ))}
          </div>
          <button onClick={handleRecordAndSend} disabled={recording}>
            {recording ? 'Recording...' : 'Speak'}
          </button>
          {recording && <button onClick={stopRecording}>Stop</button>}
          <div style={{ color: '#555', fontSize: '14px' }}>{status}</div>
        </div>
      )}
    </div>
  );
}
