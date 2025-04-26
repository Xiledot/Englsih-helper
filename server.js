// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// CommonJS 방식으로 OpenAI 불러오기
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(bodyParser.json());

// 1) 본문 테스트지 제작 (/api/main-test)
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: '텍스트를 입력하세요.' });
  }
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '주어진 지문에서 객관식 및 빈칸 문제 5개를 JSON 배열 형태로 생성하세요.' },
        { role: 'user',   content: text }
      ],
      max_tokens: 1024,
    });

    // V4 클라이언트 응답 구조 반영
    const content = completion.choices[0].message.content;
    let questions;
    try {
      // JSON 포맷으로 왔다면 파싱
      questions = JSON.parse(content);
    } catch {
      // 아니라면 텍스트 라인 단위로 분리
      questions = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim());
    }

    return res.json({ questions });

  } catch (err) {
    console.error('Error in /api/main-test:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 2) 지문 기반 문장 테스트지 제작 (/api/sentence-test)
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: '지문을 입력하세요.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates sentence completion test items.',
        },
        {
          role: 'user',
          content: `Generate 10 sentence completion questions from the following passage. Each question should include blanks marked as [빈칸] with two choices like (A) option1 / (B) option2, and optionally a brief note in parentheses.\n\nPassage:\n${text}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    // 원본 Markdown 펜스만 제거하고 JSON은 온전히 보존
    const raw = completion.choices[0].message.content;
    let cleaned = raw
      .replace(/```json\s*/g, '')  // ```json 마커 제거
      .replace(/```/g, '')         // 나머지 ``` 제거
      .trim();

    let items;
    try {
      items = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error in /api/sentence-test:', parseErr, 'Cleaned:', cleaned);
      return res.status(500).json({ error: 'JSON 파싱 실패', raw: cleaned });
    }

    return res.json({ items });

  } catch (err) {
    console.error('Error in /api/sentence-test:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3) 정적 파일 서비스: public 폴더 내 HTML/CSS/JS 제공
app.use(express.static(path.join(__dirname, 'public')));

// 4) 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});