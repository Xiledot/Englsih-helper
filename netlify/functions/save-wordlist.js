// netlify/functions/save-wordlist.js
const faunadb = require('faunadb');
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET,
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    // 1) Request body 파싱
    const { title, words } = JSON.parse(event.body || '{}');
    if (!title || !Array.isArray(words) || words.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payload: title and words required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // 2) FaunaDB에 단어장 생성
    const result = await client.query(
      q.Create(
        q.Collection('wordlists'),
        { data: { title, words } }
      )
    );

    // 3) 성공 응답
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'  // CORS
      },
      body: JSON.stringify({ success: true, doc: result.data }),
    };

  } catch (error) {
    console.error('save-wordlist error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
