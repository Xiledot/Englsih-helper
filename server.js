const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const saveWordlist   = require('./routes/save-wordlist');
const listWordlists  = require('./routes/list-wordlists');
const getWordlist    = require('./routes/get-wordlist');
const generateLesson = require('./routes/generateLesson');

// OpenAI 클라이언트 설정 (V4)
const OpenAI = require('openai');
const openaiApi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

// 기존 워드리스트 & 레슨 생성 라우트
app.post('/api/save-wordlist',  saveWordlist);
app.get( '/api/list-wordlists', listWordlists);
app.get( '/api/get-wordlist',   getWordlist);
app.post('/api/generate-lesson', generateLesson);

// 본문 테스트지 제작 엔드포인트
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '텍스트를 입력하세요.' });
  try {
    const completion = await openaiApi.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '주어진 지문에서 객관식 및 빈칸 문제 5개를 JSON 배열 형태로 생성하세요.' },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
    });
    const content = completion.choices[0].message.content;
    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      questions = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());
    }
    res.json({ questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 지문 기반 문장 테스트지 생성 엔드포인트
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '지문을 입력하세요.' });
  try {
    const prompt = `
Generate 10 sentence completion questions from the following passage. 
Each question should include blanks marked as [빈칸], 
with two choices in brackets like [choice1 / choice2], 
and optionally a brief note in parentheses.
Passage:
---
${text}
---
Return a JSON array of objects: { id, question, note }.
`;
    const completion = await openaiApi.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful language test generator.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });
    const raw = completion.choices[0].message.content;
    let items;
    try {
      items = JSON.parse(raw);
    } catch (parseErr) {
      console.error('JSON parse error in sentence-test:', parseErr, 'Content:', raw);
      return res.status(500).json({ error: '응답 파싱 실패', raw });
    }
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 정적 파일 서비스
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중! http://localhost:${PORT}`);
});