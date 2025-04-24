// routes/save-wordlist.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async function saveWordlist(req, res) {
  const { category, subcategory, title, words } = req.body;

  if (!category || !subcategory || !title || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'Invalid payload: category, subcategory, title, words required' });
  }

  const { data, error: supabaseError, status } = await supabase
    .from('wordlists')
    .upsert([{ category, subcategory, title, words }])
    .select('title')
    .single();

  if (supabaseError) {
    console.error('Supabase upsert error:', {
      message: supabaseError.message,
      details: supabaseError.details,
      hint: supabaseError.hint,
      code: supabaseError.code,
      status,
    });
    return res.status(500).json({ error: supabaseError.message, code: supabaseError.code });
  }

  return res.json({ title: data.title });
};