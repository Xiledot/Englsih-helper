// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(bodyParser.json());

// --- /api/main-test 엔드포인트 (OpenAI 사용 유지 또는 필요시 수정) ---
app.post('/api/main-test', async (req, res) => {
  // ... (이전 코드와 동일하게 유지 또는 필요시 Gemini로 변경) ...
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '텍스트를 입력하세요.' });
  if (!process.env.OPENAI_API_KEY) {
     console.warn("/api/main-test was called but OPENAI_API_KEY is not set. Returning error.");
     return res.status(500).json({ error: 'OpenAI API Key not configured for this endpoint.' });
  }
  try {
    const OpenAI = require('openai'); // 재선언 필요 시
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // ... (기존 OpenAI 호출 로직) ...
     const completion = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: '...' }, { role: 'user', content: text }], max_tokens: 1024 });
     const content = completion.choices[0].message.content;
     let questions;
     try { questions = JSON.parse(content); } catch { questions = content.split('\n').filter(line => line.trim()).map(line => line.trim()); }
     return res.json({ questions });
  } catch (err) { console.error('Error in /api/main-test (OpenAI):', err); return res.status(500).json({ error: err.message }); }
});


// --- /api/sentence-test 엔드포인트 (Gemini API, 요구사항 반영) ---
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '지문을 입력하세요.' });

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // --- !!! 수정된 Gemini 프롬프트 !!! ---
    const prompt = `
      다음 영어 지문을 분석하여 EBS 스타일 학습 자료를 생성해 주세요. 다음 요구사항을 반드시 지켜 JSON 형식으로만 응답해 주세요. 다른 설명이나 부가 텍스트는 절대 포함하지 마세요.

      요구사항:
      1.  **영어 지문 (passage.english):**
          * 주요 어휘/어법 사항 약 5~7개를 찾아 "[보기1/**정답**](번호)" 또는 "[**정답**/보기2](번호)" 형식으로 정답은 **마크다운 볼드(\`**\`)** 처리하여 마크업하세요. (번호는 1부터 시작)
          * 핵심 내용 빈칸 약 1~2개를 찾아 "[[blank]](번호)" 형식으로 마크업하세요. (번호는 어휘/어법 번호와 이어짐)
          * 마크업된 전체 지문을 문자열로 포함하세요.
      2.  **한글 해석 (passage.korean):** 전체 지문을 자연스러운 한국어로 번역하여 문자열로 포함하세요.
      3.  **본문 빈칸 정답 (passage.blankAnswers):** 위 1번에서 찾은 각 "[[blank]](번호)"에 해당하는 정답 영어 단어/구를 {"(번호)": "정답 텍스트", ...} 형식의 JSON 객체로 포함하세요.
      4.  **어휘 문제 (questions.vocabulary):**
          * 제목(title)은 "어휘 (공통)"로 하세요.
          * 위 1번에서 마크업한 어휘/어법 사항 기반 객관식 문제(questionText)를 만드세요.
          * 선택지(choices) 배열에는 해당 번호와 내용을 문자열로 포함하세요.
          * 정답(answer)은 "번호 (정답 내용)" 형식의 문자열로 포함하세요.
      5.  **빈칸 문제 (questions.blank):**
          * 제목(title)은 "빈칸 (상)"으로 하세요.
          * 위 1번에서 마크업한 빈칸 기반 객관식 문제(questionText)를 만드세요.
          * 선택지(choices) 배열에는 적절한 보기들을 문자열로 포함하세요.
          * 정답(answer)은 정답 보기 문자열로 포함하세요.
      6.  **내용 요약 (analysis.summary):**
          * 제목(title)은 "내용정리"로 하세요.
          * 지문의 핵심 내용을 3~4개의 한국어 문장으로 요약하여 points 배열에 문자열로 포함하세요.
          * 요약된 내용(points)에서 학생용 빈칸으로 만들 핵심 키워드 3~5개를 뽑아 blankKeywords 배열에 문자열로 포함하세요.
      7.  **주제 (analysis.topic):**
          * 제목(title)은 "주제"로 하세요.
          * 지문의 주제를 한국어와 영어로 작성하여 text 문자열로 포함하세요.
      8.  **정답표 (answerKey):**
          * 제목(title)은 "정답"으로 하세요.
          * 어휘 문제 정답(vocabAnswer)과 빈칸 문제 정답(blankAnswer)을 문자열로 포함하세요.

      **응답 형식 (JSON 객체):**
      \`\`\`json
      {
        "header": { "title": "EBS 올림포스 분석", "subject": "영어독해", "source": "제공된 지문", "unit": "미정" },
        "passage": {
          "english": "...", // 예: "This is [a/**an**](1) apple. It is [[blank]](2)."
          "korean": "...",
          "blankAnswers": { "(2)": "red" } // 예: 빈칸 번호와 정답 매핑
        },
        "questions": {
          "vocabulary": { "title": "어휘 (공통)", "questionText": "...", "choices": ["(1) a/an", ...], "answer": "(1) an" },
          "blank": { "title": "빈칸 (상)", "questionText": "...", "choices": ["red", "blue"], "answer": "red" },
          "sentenceCompletion": [] // 이 프롬프트에서는 생성 안 함
        },
        "analysis": {
          "summary": {
            "title": "내용정리",
            "points": ["이것은 사과입니다.", "사과는 빨갛습니다."],
            "blankKeywords": ["사과", "빨갛습니다"] // 학생용 요약 빈칸 키워드
          },
          "topic": { "title": "주제", "text": "..." }
        },
        "answerKey": { "title": "정답", "vocabAnswer": "...", "blankAnswer": "..." }
      }
      \`\`\`

      지문:
      ${text}
    `;

    const safetySettings = [ /* ... (이전과 동일) ... */ ];
    const generationConfig = { responseMimeType: "application/json" };

    const result = await model.generateContent(prompt, safetySettings, generationConfig);

    // --- 응답 처리 (이전과 유사, 구조 변경됨) ---
    let analysisData;
    try {
        const response = result.response;
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
            const contentPart = response.candidates[0].content.parts[0];
            if (contentPart.text) {
                 let cleanedJson = contentPart.text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                 analysisData = JSON.parse(cleanedJson);
            } else { throw new Error("Unsupported response format from Gemini API."); }
        } else { throw new Error("No valid response content found from Gemini API."); }
    } catch (parseError) { /* ... (이전 오류 처리와 유사) ... */
      console.error('JSON 파싱 또는 응답 처리 오류:', parseError);
      console.error('Gemini 원본 응답 객체:', JSON.stringify(result.response, null, 2));
      return res.status(500).json({ error: 'API 응답 처리 실패', rawResponse: result.response });
    }

    // 새 구조에 맞게 데이터 검증 (선택적이지만 권장)
    if (!analysisData.passage || !analysisData.passage.blankAnswers || !analysisData.analysis || !analysisData.analysis.summary || !analysisData.analysis.summary.blankKeywords) {
        console.error("API 응답 데이터 구조에 필요한 필드가 없습니다:", analysisData);
        return res.status(500).json({ error: 'API 응답 데이터 구조 오류' });
    }


    return res.json(analysisData);

  } catch (err) {
    console.error('Error in /api/sentence-test (Gemini):', err);
    return res.status(500).json({ error: err.message || 'Gemini API 호출 중 오류 발생' });
  }
});

// 정적 파일 서비스 및 서버 시작
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중 (Gemini API 사용): http://localhost:${PORT}`);
  console.log(`➡️  메인 테스트 페이지: http://localhost:${PORT}/main-test.html`);
});