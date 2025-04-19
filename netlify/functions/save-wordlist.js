// netlify/functions/save-wordlist.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // 서비스 역할 키 사용
);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  const { title, words } = payload;
  if (!title || !Array.isArray(words) || words.length === 0) {
    return { statusCode: 400, body: 'Invalid payload: title and words required' };
  }

  // 여기서 destructure error를 supabaseError로 바꿉니다
  const { data, error: supabaseError, status } = await supabase
    .from('wordlists')
    .upsert([{ title, words }])
    .select('title')
    .single();

  if (supabaseError) {
    // 이제 실제 에러 메시지를 찍어봅니다
    console.error('Supabase upsert error:', {
      message: supabaseError.message,
      details: supabaseError.details,
      hint:    supabaseError.hint,
      code:    supabaseError.code,
      status,
    });
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: supabaseError.message, code: supabaseError.code }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ title: data.title }),
  };
};
