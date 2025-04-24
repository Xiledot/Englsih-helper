const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const saveWordlist  = require('./routes/save-wordlist');
const listWordlists = require('./routes/list-wordlists');
const getWordlist   = require('./routes/get-wordlist');
const generateLesson = require('./routes/generateLesson');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/save-wordlist',  saveWordlist);
app.get( '/api/list-wordlists', listWordlists);
app.get( '/api/get-wordlist',   getWordlist);
app.post('/api/generate-lesson', generateLesson);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중! http://localhost:${PORT}`);
});