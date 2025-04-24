document.addEventListener('DOMContentLoaded', () => {
  const BASE_API = 'https://your-render-app-name.onrender.com/api';

  const saveBtn      = document.getElementById('save-wordlist-btn');
  const loadBtn      = document.getElementById('load-wordlists-btn');
  const multiTestBtn = document.getElementById('multi-test-btn');
  const sndPop       = document.getElementById('sndPop');

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} 호출 실패 (${res.status})`);
    return res.json();
  }

  // 저장 버튼
  saveBtn.addEventListener('click', async () => {
    const cat   = inputCategory.value.trim();
    const sub   = inputSubcategory.value.trim();
    const title = inputTitle.value.trim();
    const words = inputWords.value.trim().split('\n').map(l => {
      const idxKor = l.search(/[가-힣]/);
      return {
        word: idxKor !== -1 ? l.substring(0, idxKor).trim() : l.trim(),
        meaning: idxKor !== -1 ? l.substring(idxKor).trim() : ''
      };
    });

    if (!cat || !sub || !title || words.length === 0) {
      return alert('모든 항목을 입력해주세요.');
    }
    try {
      const res = await fetch(`${BASE_API}/save-wordlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, subcategory: sub, title, words })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.status);
      alert('✅ 저장되었습니다!');
      inputCategory.value = '';
      inputSubcategory.value = '';
      inputTitle.value = '';
      inputWords.value = '';
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  });

  // 목록 렌더링
  async function renderTree() {
    try {
      const items = await fetchJSON(`${BASE_API}/list-wordlists`);
      const root = document.getElementById('wordlist-tree');
      root.innerHTML = '';
      const byCat = items.reduce((acc, { category, subcategory, title }) => {
        acc[category]       ||= {};
        acc[category][subcategory] ||= [];
        acc[category][subcategory].push(title);
        return acc;
      }, {});
      for (const [cat, submap] of Object.entries(byCat)) {
        const d1 = document.createElement('details');
        const s1 = document.createElement('summary');
        s1.textContent = cat;
        d1.appendChild(s1);
        for (const [sub, list] of Object.entries(submap)) {
          const d2 = document.createElement('details');
          d2.style.marginLeft = '12px';
          const s2 = document.createElement('summary');
          s2.textContent = sub;
          d2.appendChild(s2);

          const ul = document.createElement('ul');
          list.forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `
              <label>
                <input type="checkbox"
                       class="wordlist-checkbox"
                       value="${t}"
                       data-category="${cat}"
                       data-subcategory="${sub}" />
                ${t}
              </label>`;
            ul.appendChild(li);
          });
          d2.appendChild(ul);
          d1.appendChild(d2);
        }
        root.appendChild(d1);
      }
    } catch (e) {
      alert('목록 불러오기 오류: ' + e.message);
    }
  }
  loadBtn.addEventListener('click', renderTree);

  // 통합 테스트 시작
  multiTestBtn.addEventListener('click', async () => {
    const checkedEls = Array.from(
      document.querySelectorAll('.wordlist-checkbox:checked')
    );
    if (!checkedEls.length) return alert('하나 이상 선택해주세요.');
    if (!confirm(
      `선택된 [${checkedEls.map(el => el.value).join(', ')}] 단어장으로 테스트 시작?`
    )) return;

    // 선택된 대/중분류만 추출
    const categories   = [...new Set(checkedEls.map(el => el.dataset.category))];
    const subcategories = [...new Set(checkedEls.map(el => el.dataset.subcategory))];

    // 단어 가져와서 metadata까지 붙이기
    const allWords = [];
    for (const el of checkedEls) {
      const title = el.value;
      const arr = await fetchJSON(
        `${BASE_API}/get-wordlist?title=${encodeURIComponent(title)}`
      );
      arr.forEach(o => {
        allWords.push({
          word:        o.word,
          meaning:     o.meaning,
          title,
          category:    el.dataset.category,
          subcategory: el.dataset.subcategory
        });
      });
    }

    // localStorage에 저장
    localStorage.setItem('popupData', JSON.stringify(allWords, null, 2));
    localStorage.setItem('popupMeta', JSON.stringify({ categories, subcategories }));

    // 팝업(새 탭) 열기
    openMultiTestPopup();
  });

  function openMultiTestPopup() {
    window.open('popup.html', '_blank');
  }
});