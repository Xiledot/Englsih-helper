// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Google AI SDK 불러오기
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Gemini 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
// 실행 전 반드시 'export GEMINI_API_KEY="YOUR_API_KEY"' 또는 유사한 방법으로 환경 변수 설정 필요
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(bodyParser.json()); // JSON 요청 본문 파싱

// --- OpenAI 관련 코드 삭제 또는 주석 처리 ---
/*
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // OpenAI 키도 필요하다면 환경 변수 설정
});
*/

// --- 기존 /api/main-test 엔드포인트 ---
// 이 엔드포인트는 현재 main-test.html에서 사용되지 않지만,
// 다른 곳에서 사용될 수 있으므로 일단 유지합니다. (Gemini로 바꾸려면 아래처럼 수정 필요)
// 만약 OpenAI를 계속 사용하려면 process.env.OPENAI_API_KEY 설정 필요.
app.post('/api/main-test', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: '텍스트를 입력하세요.' });
  }
  try {
    // --- 중요: 이 부분은 여전히 OpenAI 코드를 사용합니다. ---
    // 만약 OpenAI API 키가 설정되어 있지 않다면 오류가 발생합니다.
    // Gemini로 바꾸려면 아래 /api/sentence-test 처럼 코드를 수정해야 합니다.
    if (!process.env.OPENAI_API_KEY) {
       console.warn("/api/main-test was called but OPENAI_API_KEY is not set. Returning error.");
       return res.status(500).json({ error: 'OpenAI API Key not configured for this endpoint.' });
    }
    // CommonJS 방식으로 OpenAI 재선언 (만약 위에서 주석처리 했다면)
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 또는 다른 OpenAI 모델
      messages: [
        { role: 'system', content: '주어진 지문에서 객관식 및 빈칸 문제 5개를 JSON 배열 형태로 생성하세요.' },
        { role: 'user',   content: text }
      ],
      max_tokens: 1024,
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
    console.error('Error in /api/main-test (OpenAI):', err);
    return res.status(500).json({ error: err.message });
  }
});


// --- /api/sentence-test 엔드포인트를 Gemini API로 수정 ---
// 목표: EBS 분석지 스타일의 완전한 JSON 데이터 생성
app.post('/api/sentence-test', async (req, res) => {
  const { text } = req.body; // 프론트엔드에서 'text'라는 키로 지문을 보냄
  if (!text) {
    return res.status(400).json({ error: '지문을 입력하세요.' });
  }

  try {
    // Gemini 모델 선택 (예: gemini-1.5-pro-latest)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // --- !!! 중요: Gemini를 위한 상세 프롬프트 작성 !!! ---
    // 이 프롬프트는 EBS 스타일 분석지 생성을 위한 상세 지시사항입니다.
    // 원하는 결과(idealDataStructureExample 형식)를 일관되게 얻기 위해
    // 많은 테스트와 수정이 필요할 수 있습니다.
    const prompt = `
      다음 영어 지문을 분석하여 EBS 스타일 학습 자료를 생성해 주세요. 다음 요구사항을 반드시 지켜 JSON 형식으로만 응답해 주세요. 다른 설명이나 부가 텍스트는 절대 포함하지 마세요.

      요구사항:
      1.  **영어 지문 (passage.english):**
          * 주요 어휘/어법 사항 약 5~7개를 찾아 "[보기1/보기2](번호)" 또는 "*[틀린어휘/맞는어휘](번호)" 형식으로 마크업하세요. (번호는 1부터 시작)
          * 핵심 내용 빈칸 약 1~2개를 찾아 "[[blank]](번호)" 형식으로 마크업하세요. (번호는 어휘/어법 번호와 이어짐)
          * 마크업된 전체 지문을 문자열로 포함하세요.
      2.  **한글 해석 (passage.korean):** 전체 지문을 자연스러운 한국어로 번역하여 문자열로 포함하세요.
      3.  **어휘 문제 (questions.vocabulary):**
          * 제목(title)은 "어휘 (공통)"로 하세요.
          * 위에서 마크업한 어휘/어법 사항을 기반으로 객관식 문제(questionText)를 만드세요 (예: "밑줄 친 (1)~(5) 중 문맥상/어법상 적절하지 않은 것은?").
          * 선택지(choices) 배열에는 해당 번호와 내용을 문자열로 포함하세요.
          * 정답(answer)은 "번호 (정답 내용)" 형식의 문자열로 포함하세요.
      4.  **빈칸 문제 (questions.blank):**
          * 제목(title)은 "빈칸 (상)"으로 하세요.
          * 위에서 마크업한 빈칸을 기반으로 객관식 문제(questionText)를 만드세요 (예: "다음 빈칸 (7)에 들어갈 말로 가장 적절한 것은?").
          * 선택지(choices) 배열에는 적절한 보기들을 문자열로 포함하세요.
          * 정답(answer)은 정답 보기 문자열로 포함하세요.
      5.  **내용 요약 (analysis.summary):**
          * 제목(title)은 "내용정리"로 하세요.
          * 지문의 핵심 내용을 3~4개의 한국어 문장으로 요약하여 points 배열에 문자열로 포함하세요.
      6.  **주제 (analysis.topic):**
          * 제목(title)은 "주제"로 하세요.
          * 지문의 주제를 한국어와 영어로 작성하여 text 문자열로 포함하세요 (예: "주제 한글 (English Topic)").
      7.  **정답표 (answerKey):**
          * 제목(title)은 "정답"으로 하세요.
          * 어휘 문제 정답(vocabAnswer)과 빈칸 문제 정답(blankAnswer)을 문자열로 포함하세요.

      **응답 형식 (JSON 객체):**
      \`\`\`json
      {
        "header": {
          "title": "EBS 올림포스 분석", "subject": "영어독해", "source": "제공된 지문", "unit": "미정"
        },
        "passage": { "english": "...", "korean": "..." },
        "questions": {
          "vocabulary": { "title": "어휘 (공통)", "questionText": "...", "choices": ["...", "..."], "answer": "..." },
          "blank": { "title": "빈칸 (상)", "questionText": "...", "choices": ["...", "..."], "answer": "..." },
          "sentenceCompletion": []
        },
        "analysis": {
          "summary": { "title": "내용정리", "points": ["...", "..."] },
          "topic": { "title": "주제", "text": "..." }
        },
        "answerKey": {
          "title": "정답", "vocabAnswer": "...", "blankAnswer": "..."
        }
      }
      \`\`\`

      지문:
      ${text}
    `;

    // 안전 설정 (콘텐츠 필터링 강도 설정)
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // Gemini API 호출 설정 (generationConfig 등 추가 설정 가능)
    const generationConfig = {
        // temperature: 0.7, // 창의성 조절 (0.0 ~ 1.0)
        // topK: 1,
        // topP: 1,
        // maxOutputTokens: 2048, // 최대 출력 토큰 수
        responseMimeType: "application/json", // JSON 출력 명시 (최신 모델 지원)
    };

    // Gemini API 호출
    const result = await model.generateContent(prompt, safetySettings, generationConfig); // generationConfig 추가 가능

    // --- 응답 처리 수정 ---
    let analysisData;
    try {
        const response = result.response;
        // responseMimeType을 사용했으므로, text() 대신 바로 JSON 파싱 시도 가능 (모델/SDK 버전에 따라 다를 수 있음)
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
            // Gemini API는 content.parts 배열 안에 결과를 담아줄 수 있음
            const contentPart = response.candidates[0].content.parts[0];
            if (contentPart.text) {
                // 텍스트로 왔다면 직접 파싱
                 let cleanedJson = contentPart.text
                   .replace(/^```json\s*/, '')
                   .replace(/```$/, '')
                   .trim();
                 analysisData = JSON.parse(cleanedJson);
            } else {
                 // 객체 형태로 이미 파싱되어 올 수도 있음 (responseMimeType 사용 시)
                 // 이 부분은 실제 API 응답 구조 확인 후 조정 필요
                 console.warn("Received unexpected content part format from Gemini.");
                 // analysisData = contentPart; // 예시: 직접 할당 시도
                 throw new Error("Unsupported response format from Gemini API.");
            }
        } else {
             throw new Error("No valid response content found from Gemini API.");
        }

    } catch (parseError) {
      console.error('JSON 파싱 또는 응답 처리 오류:', parseError);
      // 디버깅 위해 원본 응답 구조 확인 필요
      console.error('Gemini 원본 응답 객체:', JSON.stringify(result.response, null, 2));
      return res.status(500).json({ error: 'API 응답 처리 실패', rawResponse: result.response });
    }

    // 성공적으로 처리된 JSON 데이터를 프론트엔드로 전달
    return res.json(analysisData);

  } catch (err) {
    console.error('Error in /api/sentence-test (Gemini):', err);
    return res.status(500).json({ error: err.message || 'Gemini API 호출 중 오류 발생' });
  }
});

// 3) 정적 파일 서비스: public 폴더 내 HTML/CSS/JS 제공
// __dirname은 현재 실행 중인 server.js 파일의 디렉토리 경로
app.use(express.static(path.join(__dirname, 'public')));

// 4) 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중 (Gemini API 사용): http://localhost:${PORT}`);
  console.log(`➡️  메인 테스트 페이지: http://localhost:${PORT}/main-test.html`);
});