import OpenAI from 'openai';
const openai = new OpenAI();

export async function handler(event, context) {
  try {
    const { text } = JSON.parse(event.body);
    const prompt = `
다음 한국어 지문을 분석해 주세요:

1. 핵심 단어 10~15개를 목록으로 JSON 배열로.  
2. 4단(4줄)으로 요약 JSON 배열로.  
3. 핵심 주제: { "themeK": "...", "themeE": "..." }  
4. 지문 전체를 문장별로 나눠 직독직해 JSON 배열로.

지문:
"""${text}"""
`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const data = JSON.parse(res.choices[0].message.content);
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
}