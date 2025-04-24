// routes/get-wordlist.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async function getWordlist(req, res) {
  const title = req.query.title;
  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  try {
    const { data, error } = await supabase
      .from('wordlists')
      .select('words')
      .eq('title', title)
      .single();

    if (error) throw error;
    return res.json(data.words);
  } catch (err) {
    console.error('get-wordlist error:', err);
    return res.status(500).json({ error: err.message });
  }
};