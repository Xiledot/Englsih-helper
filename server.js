const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'wordlists.json');

// 저장
app.post('/api/save-wordlist', async (req, res) => {
  try {
    const { category, subcategory, title, words } = req.body;
    if (!category || !subcategory || !title || !words) {
      return res.status(400).json({ error: '입력값이 부족합니다.' });
    }

    const { error } = await supabase
      .from('wordlists')
      .upsert([{ category, subcategory, title, words }], { onConflict: ['title'] });

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류 발생' });
  }
});

// 목록 불러오기
app.get('/api/list-wordlists', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wordlists')
      .select('category, subcategory, title');

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류 발생' });
  }
});

// 단어장 불러오기
app.get('/api/get-wordlist', async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: '제목이 필요합니다.' });

    const { data, error } = await supabase
      .from('wordlists')
      .select('words')
      .eq('title', title)
      .single();

    if (error) throw error;
    res.json(data.words);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류 발생' });
  }
});

app.use(express.static(path.join(__dirname, '.')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중! http://localhost:${PORT}`);
});