// netlify/functions/list-wordlists.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async () => {
  try {
    const { data, error } = await supabase
      .from('wordlists')
      .select('title')
      .order('title', { ascending: true });

    if (error) {
      throw error;
    }

    // data = [ { title: '올림포스1' }, { title: '테스트1' }, … ]
    const titles = data.map((row) => row.title);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(titles),
    };
  } catch (err) {
    console.error('list-wordlists error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
