const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(bodyParser.json());

// ---------- OpenAI 기반 /api/main-test ----------
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '텍스트를 입력하세요.' });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API Key not configured.' });
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
      max_tokens: 1024
    });

    const content = completion.choices[0].message.content;
    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      questions = content.split('\n').filter(l => l.trim()).map(l => l.trim());
    }
    return res.json({ questions });
  } catch (err) {
    console.error('/api/main-test error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------- Gemini 기반 /api/sentence-test ----------
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '지문을 입력하세요.' });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    const prompt = `
      다음 영어 지문을 분석하여 EBS 스타일 학습 자료를 JSON 형식으로만 생성해 주세요.
      지문: ${text}
    `;

    const safetySettings = [
      { category: HarmCategory.ABUSE, threshold: HarmBlockThreshold.HIGH },
      { category: HarmCategory.TOXICITY, threshold: HarmBlockThreshold.HIGH }
    ];
    const generationConfig = { responseMimeType: "application/json" };

    const result = await model.generateContent(prompt, safetySettings, generationConfig);

    let data;
    try {
      const part = result.response.candidates[0].content.parts[0];
      const cleaned = part.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error('Gemini parsing error:', e, result.response);
      return res.status(500).json({ error: 'Gemini 응답 처리 실패', raw: result.response });
    }

    return res.json(data);
  } catch (err) {
    console.error('/api/sentence-test error:', err);
    return res.status(500).json({ error: err.message || 'Gemini API 오류' });
  }
});

// ---------- 단어장 API ----------
app.get('/api/list-wordlists', async (_req, res) => {
  try {
    // TODO: 실제 데이터 소스로 교체
    const wordlists = [];
    return res.json(wordlists);
  } catch (err) {
    console.error('/api/list-wordlists error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-wordlists', async (req, res) => {
  try {
    console.log('/api/save-wordlists payload:', req.body);
    // TODO: 저장 로직 구현
    return res.json({ success: true, message: '단어장 저장 완료 (복수형)' });
  } catch (err) {
    console.error('/api/save-wordlists error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-wordlist', async (req, res) => {
  try {
    console.log('/api/save-wordlist payload:', req.body);
    // TODO: 저장 로직 구현
    return res.json({ success: true, message: '단어장 저장 완료 (단수형)' });
  } catch (err) {
    console.error('/api/save-wordlist error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------- 정적 파일 서비스 ----------
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});