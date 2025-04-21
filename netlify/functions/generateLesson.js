import OpenAI from 'openai';
const openai = new OpenAI();

export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body);

    // 1) 시스템 메시지: 오직 JSON만
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant that outputs ONLY valid JSON. No additional text or explanation.
The JSON must be a single object with keys:
- keywords: array of objects {word, meaning, synonyms[], antonyms[]}
- summary: array of strings (Korean, 4-item)
- themeK: string
- themeE: string
- direct: array of objects {english, korean}`
    };

    // 2) 유저 메시지
    const userMessage = {
      role: 'user',
      content: `다음 한국어 지문을 분석해 주세요. 지문:
"""${text}"""`,
    };

    // 3) OpenAI 호출
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, userMessage],
    });

    // 4) JSON 파싱
    const jsonString = res.choices[0].message.content.trim();
    const data = JSON.parse(jsonString);

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