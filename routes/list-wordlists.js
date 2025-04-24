// routes/list-wordlists.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async function listWordlists(req, res) {
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
    res.json(data);
  } catch (err) {
    console.error('list-wordlists error:', err);
    res.status(500).json({ error: err.message });
  }
};