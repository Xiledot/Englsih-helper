const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const saveWordlist  = require('./routes/save-wordlist');
const listWordlists = require('./routes/list-wordlists');
const getWordlist   = require('./routes/get-wordlist');
const generateLesson = require('./routes/generateLesson');

// OpenAI 클라이언트 설정
const OpenAI = require('openai');
const openaiApi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/save-wordlist',  saveWordlist);
app.get( '/api/list-wordlists', listWordlists);
app.get( '/api/get-wordlist',   getWordlist);

app.post('/api/generate-lesson', generateLesson);

// 본문 테스트지 생성 엔드포인트
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: '텍스트를 입력하세요.' });
  }
  try {
    const completion = await openaiApi.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '주어진 지문에서 객관식 및 빈칸 문제 5개를 JSON 배열 형태로 생성하세요.' },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
    });
    const content = completion.data.choices[0].message.content;
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
    res.status(500).json({ error: 'OpenAI API 오류' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중! http://localhost:${PORT}`);
});