// netlify/functions/list-wordlists.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async () => {
  try {
    const { data, error } = await supabase
      .from('wordlists')
      .select('category, subcategory, title')
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true });

    if (error) {
      throw error;
    }

    // data = [
    //   { category: '교과서', subcategory: '올림포스 1강', title: '단어장A' },
    //   …
    // ]
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('list-wordlists error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
