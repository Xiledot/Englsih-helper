const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

    let data = [];
    if (fs.existsSync(DATA_FILE)) {
      const file = fs.readFileSync(DATA_FILE);
      data = JSON.parse(file);
    }

    // 같은 제목이 있다면 덮어쓰기
    data = data.filter(item => item.title !== title);
    data.push({ category, subcategory, title, words });

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '서버 오류 발생' });
  }
});

// 목록 불러오기
app.get('/api/list-wordlists', (req, res) => {
  try {
    const file = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(file);
    const items = data.map(({ category, subcategory, title }) => ({
      category, subcategory, title
    }));
    res.json(items);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

// 단어장 불러오기
app.get('/api/get-wordlist', (req, res) => {
  try {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: '제목이 필요합니다.' });

    const file = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(file);
    const found = data.find(item => item.title === title);
    if (!found) return res.status(404).json({ error: '해당 단어장을 찾을 수 없음' });

    res.json(found.words);
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