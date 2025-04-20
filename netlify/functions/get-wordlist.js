// netlify/functions/get-wordlist.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const title = event.queryStringParameters?.title;
  if (!title) {
    return { statusCode: 400, body: 'Missing title parameter' };
  }

  try {
    const { data, error } = await supabase
      .from('wordlists')
      .select('words')
      .eq('title', title)
      .single();

    if (error) {
      throw error;
    }
    // data.words = [{ word, meaning }, …]
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data.words),
    };
  } catch (err) {
    console.error('get-wordlist error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
