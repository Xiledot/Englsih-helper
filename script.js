document.addEventListener('DOMContentLoaded', () => {
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

    // 저장
    saveBtn.addEventListener('click', async () => {
      const cat   = inputCategory.value.trim();
      const sub   = inputSubcategory.value.trim();
      const title = inputTitle.value.trim();
      const words = inputWords.value.trim().split('\n')
        .map(l => {
          const [w, ...m] = l.trim().split(/\s+/);
          return { word: w, meaning: m.join(' ') };
        });

      if (!cat || !sub || !title || words.length === 0) {
        return alert('모든 항목을 입력해주세요.');
      }
      try {
        const res = await fetch('/.netlify/functions/save-wordlist', {
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

    // 목록 렌더
    async function renderTree() {
      try {
        const items = await fetchJSON('/.netlify/functions/list-wordlists');
        const root = document.getElementById('wordlist-tree');
        root.innerHTML = '';

        const byCat = items.reduce((acc, { category, subcategory, title }) => {
          acc[category] = acc[category] || {};
          acc[category][subcategory] = acc[category][subcategory] || [];
          acc[category][subcategory].push(title);
          return acc;
        }, {});

        Object.entries(byCat).forEach(([cat, submap]) => {
          const d1 = document.createElement('details');
          const s1 = document.createElement('summary');
          s1.textContent = cat;
          d1.appendChild(s1);

          Object.entries(submap).forEach(([sub, list]) => {
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
                  <input type="checkbox" class="wordlist-checkbox" value="${t}" />
                  ${t}
                </label>`;
              ul.appendChild(li);
            });
            d2.appendChild(ul);
            d1.appendChild(d2);
          });
          root.appendChild(d1);
        });
      } catch (e) {
        alert('목록 불러오기 오류: ' + e.message);
      }
    }
    loadBtn.addEventListener('click', renderTree);

    // 통합 테스트
    multiTestBtn.addEventListener('click', async () => {
      const checked = Array.from(document.querySelectorAll('.wordlist-checkbox:checked'))
        .map(cb => cb.value);
      if (!checked.length) return alert('하나 이상 선택해주세요.');
      if (!confirm(`선택된 [${checked.join(', ')}] 단어장으로 테스트 시작?`)) return;

      try {
        let allWords = [];
        for (const t of checked) {
          const arr = await fetchJSON(`/.netlify/functions/get-wordlist?title=${encodeURIComponent(t)}`);
          allWords = allWords.concat(arr);
        }
        openMultiTestPopup(allWords);
      } catch (e) {
        alert('통합 테스트 오류: ' + e.message);
      }
    });

    // 팝업 열기 → 새 탭으로, localStorage에 데이터 저장
    function openMultiTestPopup(words) {
      const data = JSON.stringify(shuffle(words), null, 2);
      localStorage.setItem('popupData', data);
      window.open('popup.html', '_blank');
    }

  }); // end DOMContentLoaded