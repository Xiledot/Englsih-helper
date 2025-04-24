const OpenAI = require('openai');
const openai = new OpenAI();

module.exports = async function generateLesson(req, res) {
  try {
    const { text } = req.body;
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant that outputs ONLY valid JSON. No additional text or explanation.
The JSON must be a single object with keys:
- keywords: array of objects {word, meaning, synonyms[], antonyms[]}
- summary: array of strings (Korean, 4-item)
- themeK: string
- themeE: string
- direct: array of objects {english, korean}, one entry for every sentence in the passage in the original order`
    };
    const userMessage = {
      role: 'user',
      content: `다음 한국어 지문을 분석해 주세요. 지문:
"""${text}"""`,
    };
    const resAI = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, userMessage],
    });
    const jsonString = resAI.choices[0].message.content.trim();
    const data = JSON.parse(jsonString);
    return res.json(data);
  } catch (e) {
    console.error('generateLesson error:', e);
    return res.status(500).json({ error: e.message });
  }
};