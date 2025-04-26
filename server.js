const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(bodyParser.json());

// --- /api/main-test 엔드포인트 (OpenAI) ---
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '텍스트를 입력하세요.' });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API Key not configured for this endpoint.' });
  }
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: text }],
      max_tokens: 1024
    });
    const content = completion.choices[0].message.content;
    let questions;
    try { 
      questions = JSON.parse(content);
    } catch {
      questions = content.split('\n').filter(line => line.trim()).map(line => line.trim());
    }
    return res.json({ questions });
  } catch (err) {
    console.error('Error in /api/main-test:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- /api/sentence-test 엔드포인트 (Gemini API) ---
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '지문을 입력하세요.' });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    const prompt = `
      다음 영어 지문을 분석하여 EBS 스타일 학습 자료를 생성해 주세요. JSON 형식만 출력하세요.
      지문: ${text}
    `;
    const safetySettings = [
      { category: HarmCategory.ABUSE, threshold: HarmBlockThreshold.HIGH },
      { category: HarmCategory.TOXICITY, threshold: HarmBlockThreshold.HIGH }
    ];
    const generationConfig = { responseMimeType: "application/json" };
    const result = await model.generateContent(prompt, safetySettings, generationConfig);

    let analysisData;
    try {
      const contentPart = result.response.candidates[0].content.parts[0];
      let cleaned = contentPart.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      analysisData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Parsing error:', parseError, result.response);
      return res.status(500).json({ error: 'API 응답 처리 실패', raw: result.response });
    }

    return res.json(analysisData);
  } catch (err) {
    console.error('Error in /api/sentence-test:', err);
    return res.status(500).json({ error: err.message || 'Gemini API 오류' });
  }
});

// 단어장 목록을 반환하는 엔드포인트 추가
app.get('/api/list-wordlists', async (req, res) => {
  try {
    const wordlists = [];
    return res.json(wordlists);
  } catch (err) {
    console.error('Error in /api/list-wordlists:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 단어장 저장 엔드포인트 (복수형)
app.post('/api/save-wordlists', async (req, res) => {
  try {
    console.log('Save wordlists payload:', req.body);
    return res.json({ success: true, message: '단어장 저장 완료 (복수형)' });
  } catch (err) {
    console.error('Error in /api/save-wordlists:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 단어장 저장 엔드포인트 (단수형)
app.post('/api/save-wordlist', async (req, res) => {
  try {
    console.log('Save wordlist payload:', req.body);
    return res.json({ success: true, message: '단어장 저장 완료 (단수형)' });
  } catch (err) {
    console.error('Error in /api/save-wordlist:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 정적 파일 서비스 및 서버 시작
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});