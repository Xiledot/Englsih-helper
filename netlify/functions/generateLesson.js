// netlify/functions/generateLesson.js
import OpenAI from 'openai';
const openai = new OpenAI();

export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body);

    // 1) 유저 프롬프트: 지문과 요청 형식
    const userPrompt = `
다음 한국어 지문을 분석해 주세요:

1. 핵심 단어 10~15개를 목록으로 JSON 배열로.  
2. 4단(4줄)으로 요약 JSON 배열로.  
3. 핵심 주제: { "themeK": "...", "themeE": "..." }  
4. 지문 전체를 문장별로 나눠 직독직해 JSON 배열로.

지문:
"""${text}"""
`;

    // 2) 시스템 메시지: 오직 JSON만 출력하도록 강제
    const systemMessage = {
      role: 'system',
      content: `
You are an AI assistant that outputs ONLY valid JSON. Do not include any explanatory text or formatting.
The JSON must be a single object with these keys:
- keywords: array of strings
- summary: array of strings
- themeK: string
- themeE: string
- direct: array of strings
`
    };

    // 3) 챗 콤플리션 호출
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, { role: 'user', content: userPrompt }],
    });

    // 4) 응답 파싱
    const jsonString = res.choices[0].message.content.trim();
    const data = JSON.parse(jsonString);

    // 5) 성공 리턴
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    console.error('generateLesson error:', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
}