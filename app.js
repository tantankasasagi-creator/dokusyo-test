const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_NMS07mrkNVrp3d-mATEBUOG8E3fnfbzSevRDNKM-YTiuwy8W0k1-S0Lftcq6UbxflA/exec';

const state = {
  books: [],
  readings: [],
  quotes: [],
  links: [],
  genres: [],
  currentView: 'home'
};

const bookshelfCondition = {
  keyword: '',
  sort: 'recent',
  genres: [],
  statuses: [],
  ratings: [],
  publishers: []
};

document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
});

async function loadInitialData() {
  document.getElementById('app').innerHTML =
    '<p class="empty-message">読み込み中...</p>';

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'getInitialData' })
    });

    const data = await response.json();

    state.books = data.books || [];
    state.readings = data.readings || [];
    state.quotes = data.quotes || [];
    state.links = data.links || [];
    state.genres = data.genres || [];

    showHomeView();

  } catch (error) {
    document.getElementById('app').innerHTML =
      `<p class="empty-message">読み込みに失敗しました<br>${escapeHtml(error.message)}</p>`;
  }
}

function setActiveNav(viewName) {
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
}

function setChromeVisible(visible) {
  document.querySelector('.bottom-nav')?.classList.toggle('hidden', !visible);
  document.querySelector('.fab-button')?.classList.toggle('hidden', !visible);
}

function showHomeView() {
  setChromeVisible(true);
  state.currentView = 'home';
  setActiveNav('home');

const allReadingBooks =
  getBooksByStatus('reading');

const allTsundokuBooks =
  getBooksByStatus('tsundoku');

const allWantBooks =
  getBooksByStatus('want');

const allPausedBooks =
  getBooksByStatus('paused');

const readingBooks =
  allReadingBooks.slice(0,4);

const tsundokuBooks =
  allTsundokuBooks.slice(0,4);

const wantBooks =
  allWantBooks.slice(0,3);

const pausedBooks =
  allPausedBooks.slice(0,1);
  const onThisDayBooks = getOnThisDayBooks();
  const stats = getReadingStats();

  document.getElementById('app').innerHTML = `
    <div class="subtle">
      今月 ${stats.month}冊　/　今年 ${stats.year}冊　/　累計 ${stats.total}冊　/　${stats.streak}週連続読了中
    </div>

    <section class="section">
      <h2 class="section-title">引用</h2>
      <div class="register-box">
        <div class="subtle">Ver0では後で実装</div>
        <p>ここに引用か感想をランダム表示します。</p>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">📅 過去の今日</h2>
      <div class="horizontal-books">
        ${renderOnThisDayBooks(onThisDayBooks)}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title" onclick="showStatusBookList('reading', '📖 机の上')">
  📖 机の上<span class="section-count">（${allReadingBooks.length}冊）</span>
</h2>
      <div class="horizontal-books">
        ${renderEmptyOrBooks(readingBooks, '読書中の本', false)}
      </div>
    </section>

    <section class="section">
      <h2 class="section-title" onclick="showStatusBookList('tsundoku', '📦 積読')">
  📦 積読<span class="section-count">（${allTsundokuBooks.length}冊）</span>
</h2>
      <div class="horizontal-books">
        ${renderEmptyOrBooks(tsundokuBooks, '積読', false)}
      </div>
    </section>

    <section class="section home-split-section">
      <div>
        <h2 class="section-title" onclick="showStatusBookList('want', '💭 気になる本')">
  💭 気になる本<span class="section-count">（${allWantBooks.length}冊）</span>
</h2>
        <div class="horizontal-books">
          ${renderEmptyOrBooks(wantBooks, '気になる本', false)}
        </div>
      </div>

      <div>
        <h2 class="section-title" onclick="showStatusBookList('paused', '⏸ 中断')">
 ⏸ 中断<span class="section-count">（${allPausedBooks.length}冊）</span>
</h2>
        <div class="horizontal-books">
          ${renderEmptyOrBooks(pausedBooks, '中断本', false)}
        </div>
      </div>
    </section>
  `;
}

function showBookshelfView() {
  setChromeVisible(true);
  state.currentView = 'bookshelf';
  setActiveNav('bookshelf');
  renderBookshelf();
}

function renderBookshelf() {
  const books = getFilteredBookshelfBooks();

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <h1 class="page-title">本棚</h1>
    </div>

    <div class="bookshelf-condition-card" onclick="openBookshelfConditionModal()">
      <div class="bookshelf-condition-title">本を探す</div>
      <div class="bookshelf-condition-summary">
        ${escapeHtml(getBookshelfConditionSummary(books.length))}
      </div>
    </div>

    <div id="bookshelfResultGrid" class="book-grid">
      ${renderBookshelfBooksHtml(books)}
    </div>

    <div id="bookshelfConditionModal" class="modal-backdrop hidden" onclick="closeBookshelfConditionModal(event)">
      <div class="bottom-sheet" onclick="event.stopPropagation()">
        <div class="bottom-sheet-header">
          <div class="bottom-sheet-title">本を探す</div>
          <div class="bottom-sheet-actions">
            <button type="button" class="mini-button" onclick="clearBookshelfConditionModal()">クリア</button>
            <button type="button" class="mini-button" onclick="applyBookshelfConditionModal()">適用</button>
          </div>
        </div>

        <label class="edit-label">キーワード</label>
        <input
          id="bookshelfModalKeywordInput"
          class="edit-input"
          type="text"
          placeholder="タイトル・著者・タグ・カテゴリ・出版社"
          value="${escapeHtml(bookshelfCondition.keyword)}"
        >

        <div class="edit-divider"></div>

        ${renderBookshelfFilterSection('並び順', `
          <div class="genre-modal-list">
            ${renderSortChip('recent', '直近順')}
            ${renderSortChip('rating', '評価順')}
            ${renderSortChip('finishDate', '読了日順')}
            ${renderSortChip('genre', 'カテゴリ順')}
            ${renderSortChip('publisher', '出版社順')}
          </div>
        `, 'bookshelfSortSection')}

        ${renderBookshelfFilterSection('カテゴリ', `
          <div class="genre-modal-list">
            ${renderBookshelfGenreFilterChips()}
          </div>
        `, 'bookshelfGenreSection', bookshelfCondition.genres.length)}

        ${renderBookshelfFilterSection('状態', `
          <div class="genre-modal-list">
            ${renderBookshelfStatusFilterChips()}
          </div>
        `, 'bookshelfStatusSection', bookshelfCondition.statuses.length)}

        ${renderBookshelfFilterSection('評価', `
          <div class="genre-modal-list">
            ${renderBookshelfRatingFilterChips()}
          </div>
        `, 'bookshelfRatingSection', bookshelfCondition.ratings.length)}

        ${renderBookshelfFilterSection('出版社', `
          <div class="genre-modal-list">
            ${renderBookshelfPublisherFilterChips()}
          </div>
        `, 'bookshelfPublisherSection', bookshelfCondition.publishers.length)}
      </div>
    </div>
  `;
}

function renderSortChip(sort, label) {
  return `
    <button
      type="button"
      class="bookshelf-sort-chip genre-modal-chip ${bookshelfCondition.sort === sort ? 'selected' : ''}"
      data-sort="${sort}"
      onclick="selectBookshelfSort(this)"
    >
      ${label}
    </button>
  `;
}

function showOtherView() {
  setChromeVisible(true);
  state.currentView = 'other';
  setActiveNav('other');

  document.getElementById('app').innerHTML = `
    <h1 class="page-title">その他</h1>
    <div class="other-box">
      <p>分析、本のマップ、ジャンル管理などは今後追加します。</p>
    </div>
  `;
}

function showRegisterView() {
  setChromeVisible(false);
  setActiveNav('');

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="goBackToMainView()">←</button>
      <div></div>
    </div>

    <h1 class="page-title">本を探す</h1>

    <div class="register-box">
      <div class="input-row">
        <input id="bookSearchInput" class="text-input" type="text" placeholder="タイトルまたはISBN" oninput="renderSuggestions()">
        <button class="camera-button" onclick="searchIsbnFromInput()">🔎</button>
        <button class="camera-button" onclick="showIsbnCameraView()">📷</button>
      </div>

      <div id="suggestionList" class="suggestion-list"></div>
    </div>
  `;
}

function renderSuggestions() {
  const keyword = document.getElementById('bookSearchInput').value.trim();
  const container = document.getElementById('suggestionList');

  if (!keyword) {
    container.innerHTML = '';
    return;
  }

  const matches = state.books.filter(book =>
    String(book['タイトル'] || '').includes(keyword) ||
    String(book['著者'] || '').includes(keyword)
  ).slice(0, 10);

  const hasExactTitle = state.books.some(book =>
    String(book['タイトル'] || '').trim() === keyword
  );

  const matchHtml = matches.map(book => `
    <div class="suggestion-item" onclick="showBookDetail('${book['書籍ID']}')">
      <div class="suggestion-title">${escapeHtml(book['タイトル'])}</div>
      <div class="subtle">${escapeHtml(book['著者'] || '')}</div>
    </div>
  `).join('');

  container.innerHTML = `
    ${matchHtml}
    ${!hasExactTitle ? `<button class="create-button" onclick="createNewBookFromSearch()">＋「${escapeHtml(keyword)}」を新しい本として作成</button>` : ''}
  `;
}

async function searchIsbnFromInput() {
  const input = document.getElementById('bookSearchInput');
  const keyword = input?.value.trim() || '';
  const isbn = keyword.replace(/[^0-9Xx]/g, '');

  if (!isbn) {
    alert('ISBNを入力してください');
    return;
  }

  const container = document.getElementById('suggestionList');
  container.innerHTML = '<div class="subtle">ISBNを検索しています...</div>';

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'fetchBookByIsbn',
        isbn
      })
    });

    const data = await response.json();
    renderIsbnResult(data.result);

  } catch (error) {
    container.innerHTML =
      `<div class="subtle">ISBN検索に失敗しました: ${escapeHtml(error.message)}</div>`;
  }
}

function renderIsbnResult(result) {
  const container = document.getElementById('suggestionList');

  if (!result.found) {
    container.innerHTML = `
      <div class="suggestion-item">
        <div class="suggestion-title">書誌情報が見つかりませんでした</div>
        <div class="subtle">ISBN: ${escapeHtml(result.isbn)}</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="isbn-result-card">
      <div class="isbn-result-cover">
        ${
          result.coverUrl
            ? `<img class="book-cover" src="${escapeHtml(result.coverUrl).replace(/^http:/, 'https:')}">`
            : `<div class="dummy-cover">${escapeHtml(result.title || 'No Title')}</div>`
        }
      </div>
      <div class="isbn-result-info">
        <div class="suggestion-title">${escapeHtml(result.title)}</div>
        <div class="subtle">${escapeHtml(result.author || '')}</div>
        <div class="subtle">${escapeHtml(result.publisher || '')}</div>
        <div class="subtle">ISBN: ${escapeHtml(result.isbn)}</div>

        <button
          class="register-book-button"
          onclick='registerBookFromIsbn(${JSON.stringify(result)})'
        >
          この本を登録
        </button>
      </div>
    </div>
  `;
}

async function registerBookFromIsbn(bookData) {
  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'createBookFromIsbn',
        bookData
      })
    });

    const data = await response.json();
    const result = data.result;

    if (result.duplicated) {
      await loadInitialData();
      showBookDetail(result.bookId);
      return;
    }

    await loadInitialData();
    showEditView(result.bookId);

  } catch (error) {
    alert(`登録失敗: ${error.message}`);
  }
}

async function createNewBookFromSearch() {
  const title = document.getElementById('bookSearchInput')?.value.trim();

  if (!title) {
    alert('タイトルを入力してください');
    return;
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'createBook',
        title
      })
    });

    const data = await response.json();
    const result = data.result;

    await loadInitialData();
    showEditView(result.bookId);

  } catch (error) {
    alert(`新規作成に失敗しました: ${error.message}`);
  }
}

function showBookDetail(bookId) {
  setChromeVisible(true);

  const book = state.books.find(b => b['書籍ID'] === bookId);
  if (!book) return;

  const readings = state.readings.filter(r => r['書籍ID'] === bookId);
  const quotes = state.quotes.filter(q => q['書籍ID'] === bookId);
  const isArchived = readings.some(r => r['読了日']);

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="goBackToMainView()">←</button>
      <div>
        <button class="icon-button" onclick="showEditView('${bookId}')">✏️</button>
        ${isArchived ? `<button class="icon-button" onclick="startRereading('${bookId}')">📖</button>` : ''}
      </div>
    </div>

    <div class="detail-cover">
      <div class="cover-wrap">
        ${renderCover(book)}
      </div>
    </div>

    <h1 class="detail-title">${escapeHtml(book['タイトル'] || '')}</h1>
    <div class="detail-author">
      ${escapeHtml(formatBookMetaLine(book))}
    </div>
    <div class="genre-line">${escapeHtml(formatGenres(book['ジャンル']))}</div>

    ${renderPurchaseBlock(book)}

    ${readings.map((reading, index) => renderReadingBlock(reading, index)).join('')}

        <section class="archive-block">
      <div class="archive-heading">引用</div>
      ${
        quotes.length
          ? quotes.map(q => renderQuoteBlock(q)).join('')
          : '<div class="subtle">引用はまだありません。</div>'
      }
    </section>

    <div class="tag-line">${escapeHtml(formatTags(book['タグ']))}</div>
  `;
}

function renderBookshelfBooksHtml(books) {
  if (!books.length) {
    return `<div class="empty-message">該当する本はありません。</div>`;
  }

  if (bookshelfCondition.sort === 'recent') {
    return books.map(book => renderBookCard(book)).join('');
  }

  return renderBookshelfBooksWithBookoffLabels(books);
}

function renderBookshelfBooksWithBookoffLabels(books) {
  let currentLabel = '';

  return books.map(book => {
    const label = getBookshelfSortLabel(book);

    if (label !== currentLabel) {
      currentLabel = label;
      return renderBookshelfSortLabelCard(label) + renderBookCard(book);
    }

    return renderBookCard(book);
  }).join('');
}

function renderBookCard(book, showStatus = true) {
  return `
    <div class="book-card" onclick="showBookDetail('${escapeHtml(book['書籍ID'])}')">
      <div class="cover-wrap">
        ${renderCover(book)}
        ${showStatus ? renderStatusBadge(book) : ''}
      </div>
      <div class="book-title">${escapeHtml(book['タイトル'] || '')}</div>
    </div>
  `;
}

function renderCover(book) {
  const url = String(book['表紙URL'] || '').trim().replace(/^http:/, 'https:');

  if (isImageUrl(url)) {
    return `
      <img
        class="book-cover"
        src="${escapeHtml(url)}"
        alt="${escapeHtml(book['タイトル'] || '')}"
        data-title="${escapeHtml(book['タイトル'] || 'No Title')}"
        onerror="handleCoverError(this)"
      >
    `;
  }

  return dummyCoverHtml(book);
}

function handleCoverError(img) {
  const title = img.dataset.title || 'No Title';
  const dummy = document.createElement('div');
  dummy.className = 'dummy-cover';
  dummy.textContent = title;
  img.replaceWith(dummy);
}

function dummyCoverHtml(book) {
  const title = escapeHtml(book['タイトル'] || 'No Title');
  return `<div class="dummy-cover">${title}</div>`;
}

function isImageUrl(url) {
  if (!url) return false;

  const lower = url.toLowerCase();

  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.includes('ndlsearch.ndl.go.jp/thumbnail') ||
    lower.includes('m.media-amazon.com/images') ||
    lower.includes('msp.c.yimg.jp/images')
  );
}

function renderStatusBadge(book) {
  const status = getBookStatus(book);
  const iconMap = {
    want: '💭',
    tsundoku: '📦',
    reading: '📖',
    paused: '⏸'
  };

  if (!iconMap[status]) return '';
  return `<div class="status-badge">${iconMap[status]}</div>`;
}

function getBookStatus(book) {
  const latestReading = getLatestReading(book['書籍ID']);

  if (latestReading && latestReading['読了日']) return 'done';

  if (latestReading && latestReading['読始日'] && !latestReading['読了日']) {
    const start = parseDate(latestReading['読始日']);
    if (start) {
      const diffDays = (new Date() - start) / (1000 * 60 * 60 * 24);
      return diffDays >= 60 ? 'paused' : 'reading';
    }
    return 'reading';
  }

  if (book['購入日']) return 'tsundoku';

  return 'want';
}

function getLatestReading(bookId) {
  const records = state.readings
    .filter(r => r['書籍ID'] === bookId)
    .sort((a, b) => getReadingDate(b) - getReadingDate(a));

  return records[0] || null;
}

function getReadingDate(reading) {
  return parseDate(reading['読了日']) ||
         parseDate(reading['読始日']) ||
         parseDate(reading['更新日時']) ||
         parseDate(reading['作成日時']) ||
         new Date(0);
}

function getTouchDate(book) {
  const latestReading = getLatestReading(book['書籍ID']);
  const readingDate = latestReading ? getReadingDate(latestReading) : new Date(0);

  return parseDate(book['更新日時']) ||
         readingDate ||
         parseDate(book['作成日時']) ||
         parseDate(book['購入日']) ||
         new Date(0);
}

function getFilteredBookshelfBooks() {
  const normalizedKeyword = normalizeSearchText(bookshelfCondition.keyword);

  return [...state.books]
    .filter(book => {
      if (normalizedKeyword) {
        const searchTarget = [
          book['タイトル'],
          book['著者'],
          book['ジャンル'],
          book['タグ'],
          book['出版社']
        ].map(normalizeSearchText).join(' ');

        if (!searchTarget.includes(normalizedKeyword)) return false;
      }

      if (bookshelfCondition.genres.length) {
        const bookGenres = String(book['ジャンル'] || '')
          .split('|')
          .map(v => v.trim())
          .filter(Boolean);

        const hasGenre = bookshelfCondition.genres.some(genre => bookGenres.includes(genre));
        if (!hasGenre) return false;
      }

      if (bookshelfCondition.statuses.length) {
        const status = getBookStatus(book);
        if (!bookshelfCondition.statuses.includes(status)) return false;
      }

      if (bookshelfCondition.ratings.length) {
        const rating = Number(getLatestReading(book['書籍ID'])?.['評価'] || 0);
        const ratingKey = rating ? String(rating) : 'unrated';

        if (!bookshelfCondition.ratings.includes(ratingKey)) return false;
      }

      if (bookshelfCondition.publishers.length) {
        const publisher = String(book['出版社'] || '').trim();
        if (!bookshelfCondition.publishers.includes(publisher)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (bookshelfCondition.sort === 'rating') {
        const ratingA = Number(getLatestReading(a['書籍ID'])?.['評価'] || 0);
        const ratingB = Number(getLatestReading(b['書籍ID'])?.['評価'] || 0);
        return ratingB - ratingA;
      }

      if (bookshelfCondition.sort === 'finishDate') {
        const finishA = parseDate(getLatestReading(a['書籍ID'])?.['読了日']) || new Date(0);
        const finishB = parseDate(getLatestReading(b['書籍ID'])?.['読了日']) || new Date(0);
        return finishB - finishA;
      }

      if (bookshelfCondition.sort === 'genre') {
        const genreA = String(a['ジャンル'] || '');
        const genreB = String(b['ジャンル'] || '');
        return genreA.localeCompare(genreB, 'ja');
      }

      if (bookshelfCondition.sort === 'publisher') {
        const publisherA = String(a['出版社'] || '');
        const publisherB = String(b['出版社'] || '');
        return publisherA.localeCompare(publisherB, 'ja');
      }

      return getTouchDate(b) - getTouchDate(a);
    });
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function getBookshelfConditionSummary(count) {
  let sortLabel = '直近順';

  if (bookshelfCondition.sort === 'rating') sortLabel = '評価順';
  if (bookshelfCondition.sort === 'finishDate') sortLabel = '読了日順';
  if (bookshelfCondition.sort === 'genre') sortLabel = 'カテゴリ順';
  if (bookshelfCondition.sort === 'publisher') sortLabel = '出版社順';

  const filters = [];

  if (bookshelfCondition.keyword) filters.push(`「${bookshelfCondition.keyword}」`);
  if (bookshelfCondition.genres.length) filters.push(...bookshelfCondition.genres);
  if (bookshelfCondition.publishers.length) filters.push(...bookshelfCondition.publishers);

  if (bookshelfCondition.ratings.length) {
    filters.push(...bookshelfCondition.ratings.map(value => {
      if (value === 'unrated') return '未評価';
      return `★${value}`;
    }));
  }

  if (bookshelfCondition.statuses.length) {
    const statusLabels = {
      want: '気になる',
      tsundoku: '積読',
      reading: '読書中',
      paused: '中断',
      done: '読了'
    };

    filters.push(...bookshelfCondition.statuses.map(status => statusLabels[status] || status));
  }

  const filterLabel = filters.length
    ? filters.slice(0, 2).join('・') + (filters.length > 2 ? `・他${filters.length - 2}件` : '')
    : '全て';

  return `${sortLabel} ｜ ${filterLabel}（${count}冊）`;
}

function openBookshelfConditionModal() {
  const modal = document.getElementById('bookshelfConditionModal');
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeBookshelfConditionModal(event) {
  if (event && event.target.id !== 'bookshelfConditionModal') return;
  document.getElementById('bookshelfConditionModal')?.classList.add('hidden');
}

function clearBookshelfConditionModal() {
  bookshelfCondition.keyword = '';
  bookshelfCondition.sort = 'recent';
  bookshelfCondition.genres = [];
  bookshelfCondition.statuses = [];
  bookshelfCondition.ratings = [];
  bookshelfCondition.publishers = [];

  closeBookshelfConditionModal();
  renderBookshelf();
}

function applyBookshelfConditionModal() {
  bookshelfCondition.keyword =
    document.getElementById('bookshelfModalKeywordInput')?.value.trim() || '';

  bookshelfCondition.sort =
    document.querySelector('.bookshelf-sort-chip.selected')?.dataset.sort || 'recent';

  bookshelfCondition.statuses = [...document.querySelectorAll('.bookshelf-status-filter-chip.selected')]
    .map(button => button.dataset.status)
    .filter(Boolean);

  bookshelfCondition.genres = [...document.querySelectorAll('.bookshelf-genre-filter-chip.selected')]
    .map(button => button.dataset.genre)
    .filter(Boolean);

  bookshelfCondition.ratings = [...document.querySelectorAll('.bookshelf-rating-filter-chip.selected')]
    .map(button => button.dataset.rating)
    .filter(Boolean);

  bookshelfCondition.publishers = [...document.querySelectorAll('.bookshelf-publisher-filter-chip.selected')]
    .map(button => button.dataset.publisher)
    .filter(Boolean);

  closeBookshelfConditionModal();
  renderBookshelf();
}

function renderBookshelfFilterSection(title, contentHtml, sectionId, selectedCount = 0) {
  const countText = selectedCount ? `（${selectedCount}）` : '';

  return `
    <div class="bookshelf-filter-section">
      <button
        type="button"
        class="bookshelf-filter-section-header"
        onclick="toggleBookshelfFilterSection('${sectionId}')"
      >
        <span id="${sectionId}Arrow">▶</span>
        <span>${escapeHtml(title)}${escapeHtml(countText)}</span>
      </button>
      <div id="${sectionId}" class="bookshelf-filter-section-body hidden">
        ${contentHtml}
      </div>
    </div>
  `;
}

function toggleBookshelfFilterSection(sectionId) {
  const body = document.getElementById(sectionId);
  const arrow = document.getElementById(`${sectionId}Arrow`);

  if (!body || !arrow) return;

  const isHidden = body.classList.toggle('hidden');
  arrow.textContent = isHidden ? '▶' : '▼';
}

function renderBookshelfFilterChips({
  items,
  selectedValues,
  chipClass,
  dataAttribute,
  onclickFunction
}) {
  return items.map(item => {
    const selected = selectedValues.includes(item.value);

    return `
      <button
        type="button"
        class="${chipClass} genre-modal-chip ${selected ? 'selected' : ''}"
        data-${dataAttribute}="${escapeHtml(item.value)}"
        onclick="${onclickFunction}(this)"
      >
        ${escapeHtml(item.label)}
      </button>
    `;
  }).join('');
}

function renderBookshelfGenreFilterChips() {
  const activeGenres = (state.genres || [])
    .filter(g => String(g['有効']).toUpperCase() !== 'FALSE')
    .sort((a, b) => Number(a['表示順'] || 999) - Number(b['表示順'] || 999));

  return renderBookshelfFilterChips({
    items: activeGenres.map(genre => ({
      value: genre['ジャンル名'],
      label: genre['ジャンル名']
    })),
    selectedValues: bookshelfCondition.genres,
    chipClass: 'bookshelf-genre-filter-chip',
    dataAttribute: 'genre',
    onclickFunction: 'toggleBookshelfGenreFilter'
  });
}

function renderBookshelfStatusFilterChips() {
  return renderBookshelfFilterChips({
    items: [
      { value: 'want', label: '気になる' },
      { value: 'tsundoku', label: '積読' },
      { value: 'reading', label: '読書中' },
      { value: 'paused', label: '中断' },
      { value: 'done', label: '読了' }
    ],
    selectedValues: bookshelfCondition.statuses,
    chipClass: 'bookshelf-status-filter-chip',
    dataAttribute: 'status',
    onclickFunction: 'toggleBookshelfStatusFilter'
  });
}

function renderBookshelfRatingFilterChips() {
  return renderBookshelfFilterChips({
    items: [
      { value: '5', label: '★★★★★' },
      { value: '4', label: '★★★★' },
      { value: '3', label: '★★★' },
      { value: '2', label: '★★' },
      { value: '1', label: '★' },
      { value: 'unrated', label: '未評価' }
    ],
    selectedValues: bookshelfCondition.ratings,
    chipClass: 'bookshelf-rating-filter-chip',
    dataAttribute: 'rating',
    onclickFunction: 'toggleBookshelfRatingFilter'
  });
}

function renderBookshelfPublisherFilterChips() {
  const publishers = [...new Set(
    state.books
      .map(book => String(book['出版社'] || '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'ja'));

  return renderBookshelfFilterChips({
    items: publishers.map(publisher => ({
      value: publisher,
      label: publisher
    })),
    selectedValues: bookshelfCondition.publishers,
    chipClass: 'bookshelf-publisher-filter-chip',
    dataAttribute: 'publisher',
    onclickFunction: 'toggleBookshelfPublisherFilter'
  });
}

function toggleBookshelfGenreFilter(button) {
  button.classList.toggle('selected');
}

function toggleBookshelfStatusFilter(button) {
  button.classList.toggle('selected');
}

function toggleBookshelfRatingFilter(button) {
  button.classList.toggle('selected');
}

function toggleBookshelfPublisherFilter(button) {
  button.classList.toggle('selected');
}

function selectBookshelfSort(button) {
  document
    .querySelectorAll('.bookshelf-sort-chip')
    .forEach(chip => chip.classList.remove('selected'));

  button.classList.add('selected');
}

function getBookshelfSortLabel(book) {
  if (bookshelfCondition.sort === 'rating') {
    const rating = Number(getLatestReading(book['書籍ID'])?.['評価'] || 0);
    const safeRating = Math.max(0, Math.min(5, rating));
    return safeRating ? `★${safeRating}` : '未評価';
  }

  if (bookshelfCondition.sort === 'finishDate') {
    const finishDate = parseDate(getLatestReading(book['書籍ID'])?.['読了日']);
    return finishDate ? `${finishDate.getFullYear()}年` : '未読了';
  }

  if (bookshelfCondition.sort === 'genre') {
    return String(book['ジャンル'] || '').split('|')[0] || '未分類';
  }

  if (bookshelfCondition.sort === 'publisher') {
    return String(book['出版社'] || '').trim() || '出版社未設定';
  }

  return '';
}

function renderBookshelfSortLabelCard(label) {
  return `
    <div class="book-card bookshelf-label-card">
      <div class="bookshelf-label-cover">
        ${escapeHtml(label)}
      </div>
      <div class="book-title"></div>
    </div>
  `;
}

function getOnThisDayBooks() {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();
  const currentYear = today.getFullYear();

  return state.readings
    .filter(reading => reading['読始日'] && reading['読了日'])
    .filter(reading => {
      const start = parseDate(reading['読始日']);
      const finish = parseDate(reading['読了日']);
      if (!start || !finish) return false;

      const year = start.getFullYear();
      if (year === currentYear) return false;

      const target = new Date(year, todayMonth - 1, todayDate);
      target.setHours(0, 0, 0, 0);

      start.setHours(0, 0, 0, 0);
      finish.setHours(0, 0, 0, 0);

      return start <= target && target <= finish;
    })
    .map(reading => {
      const book = state.books.find(b => b['書籍ID'] === reading['書籍ID']);
      if (!book) return null;

      return {
        book,
        year: parseDate(reading['読始日']).getFullYear()
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.year - a.year);
}

function renderOnThisDayBooks(items) {
  if (!items.length) {
    return `<div class="subtle">過去の今日に読んでいた本はありません。</div>`;
  }

  return items.map(item => `
    <div class="on-this-day-card">
      ${renderBookCard(item.book, false)}
      <div class="on-this-day-year">${item.year}</div>
    </div>
  `).join('');
}

function getReadingStats() {
  const finishedReadings = state.readings.filter(reading => reading['読了日']);
  const today = new Date();

  const month = finishedReadings.filter(reading => {
    const date = parseDate(reading['読了日']);
    return date &&
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth();
  }).length;

  const year = finishedReadings.filter(reading => {
    const date = parseDate(reading['読了日']);
    return date && date.getFullYear() === today.getFullYear();
  }).length;

  return {
    month,
    year,
    total: finishedReadings.length,
    streak: calculateWeeklyReadingStreak(finishedReadings)
  };
}

function calculateWeeklyReadingStreak(finishedReadings) {
  const finishedWeeks = new Set(
    finishedReadings
      .map(reading => getWeekKey(parseDate(reading['読了日'])))
      .filter(Boolean)
  );

  let streak = 0;
  let cursor = getStartOfWeek(new Date());

  while (finishedWeeks.has(getWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  return d;
}

function getWeekKey(date) {
  if (!date) return '';

  const start = getStartOfWeek(date);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function renderEmptyOrBooks(books, label, showStatus = true) {
  if (!books.length) {
    return `<div class="subtle">${label}はありません。</div>`;
  }

  return books.map(book => renderBookCard(book, showStatus)).join('');
}

function renderPurchaseBlock(book) {
  if (!book['購入日'] && !book['購入場所']) return '';

  return `
    <section class="archive-block">
      <div class="archive-heading">📦 購入</div>
      <div class="archive-meta">
        ${escapeHtml(formatDate(book['購入日']))}
        ${book['購入場所'] ? `　${escapeHtml(book['購入場所'])}で入手` : ''}
      </div>
    </section>
  `;
}

function renderReadingBlock(reading, index) {
  const label = index === 0 ? '初読' : '再読';
  const dateLine = `${formatDate(reading['読始日']) || '----'} ～ ${formatDate(reading['読了日']) || '----'}`;
  const place = reading['読了場所'] ? `${escapeHtml(reading['読了場所'])}で読了` : '';

  return `
    <section class="archive-block">
      <div class="archive-heading">📖 ${label}</div>
      <div class="archive-meta">${escapeHtml(dateLine)}</div>
      <div class="archive-meta">${renderStars(reading['評価'])}</div>
      ${place ? `<div class="archive-meta">${place}</div>` : ''}
      ${reading['感想'] ? `<div class="archive-text">${escapeHtml(reading['感想'])}</div>` : '<div class="subtle">感想はまだありません。</div>'}
    </section>
  `;
}

function goBackToMainView() {
  if (state.currentView === 'bookshelf') {
    showBookshelfView();
  } else if (state.currentView === 'other') {
    showOtherView();
  } else {
    showHomeView();
  }
}

function getBooksByStatus(status) {
  return state.books.filter(book => getBookStatus(book) === status);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return '';
  const date = parseDate(value);
  if (!date) return value;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}/${m}/${d}`;
}

function formatGenres(value) {
  return String(value || '').replaceAll('|', '｜');
}

function formatAuthors(value) {
  return String(value || '').replaceAll('|', '｜');
}

function formatBookMetaLine(book) {
  const author = formatAuthors(book['著者']);
  const publisher = String(book['出版社'] || '').trim();

  if (author && publisher) return `${author} / ${publisher}`;
  if (author) return author;
  if (publisher) return publisher;
  return '';
}

function formatTags(value) {
  return String(value || '')
    .split('|')
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .join(' ');
}

function renderStars(value) {
  const n = Number(value);
  if (!n) return '';
  return '★'.repeat(Math.max(0, Math.min(5, n))) + '☆'.repeat(Math.max(0, 5 - n));
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function startRereading(bookId) {
  showEditView(bookId, '__REREAD_DRAFT__');
}

function showEditView(bookId, readingId = '') {
  const book = state.books.find(b => b['書籍ID'] === bookId);
  if (!book) return;

  const isRereadDraft = readingId === '__REREAD_DRAFT__';

  const latestReading = isRereadDraft
    ? {
        '読始日': new Date().toISOString().slice(0, 10),
        '読了日': '',
        '評価': '',
        '感想': '',
        '読了場所': ''
      }
    : readingId
      ? state.readings.find(r => r['読書体験ID'] === readingId) || {}
      : getLatestReading(bookId) || {};

  setChromeVisible(false);

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="saveAndCloseEdit('${bookId}', '${readingId}')">←</button>
      <button class="icon-button" onclick="closeEditWithoutSave('${bookId}')">×</button>
    </div>

    <h1 class="page-title">本と付き合う</h1>

    <div class="edit-form">
      ${renderEditField('タイトル', 'editTitle', book['タイトル'])}
      ${renderChipInputField('著者', 'editAuthor', book['著者'], false, 'authors')}
      ${renderEditField('出版社', 'editPublisher', book['出版社'])}
      ${renderGenreSelect(book['ジャンル'])}
      ${renderChipInputField('タグ', 'editTags', book['タグ'], true, 'tags')}

      <div class="edit-divider"></div>

      <div class="edit-row">
        <div>
          ${renderEditField('購入日', 'editPurchaseDate', formatDateForInput(book['購入日']), 'date')}
        </div>
        <div>
          ${renderChipInputField('購入場所', 'editPurchasePlace', book['購入場所'], false, 'purchasePlaces')}
        </div>
      </div>

      <div class="edit-divider"></div>

      <div class="edit-row">
        <div>
          ${renderEditField('読始日', 'editStartDate', formatDateForInput(latestReading['読始日']), 'date')}
        </div>
        <div>
          ${renderEditField('読了日', 'editFinishDate', formatDateForInput(latestReading['読了日']), 'date')}
        </div>
      </div>

      ${renderChipInputField('読了場所', 'editFinishPlace', latestReading['読了場所'], false, 'finishPlaces')}
      ${renderRatingField(latestReading['評価'])}

      <label class="edit-label" for="editImpression">感想</label>
      <textarea id="editImpression" class="edit-textarea" rows="6">${escapeHtml(latestReading['感想'] || '')}</textarea>

      <div class="edit-divider"></div>

      <section class="edit-sub-section">
        <div class="edit-sub-title">引用</div>
        <button class="mini-button" onclick="showQuoteAddView('${bookId}')">＋追加</button>
      </section>

      <section class="edit-sub-section">
        <div class="edit-sub-title">この本から生まれた本</div>
        <button class="mini-button" onclick="alert('本リンク追加は次フェーズ')">＋追加</button>
      </section>
    </div>
  `;
}

function renderEditField(label, id, value, type = 'text') {
  return `
    <label class="edit-label" for="${id}">${label}</label>
    <input
      id="${id}"
      class="edit-input"
      type="${type}"
      value="${escapeHtml(value || '')}"
    >
  `;
}

function renderRatingField(value) {
  const rating = Number(value || 0);

  return `
    <label class="edit-label">評価</label>
    <div class="rating-stars" id="ratingStars">
      ${[1, 2, 3, 4, 5].map(n => `
        <button
          type="button"
          class="rating-star ${n <= rating ? 'selected' : ''}"
          onclick="setRating(${n})"
        >★</button>
      `).join('')}
    </div>
    <input id="editRating" type="hidden" value="${rating || ''}">
  `;
}

function setRating(value) {
  document.getElementById('editRating').value = value;

  document.querySelectorAll('.rating-star').forEach((star, index) => {
    star.classList.toggle('selected', index < value);
  });
}

function formatDateForInput(value) {
  if (!value) return '';

  const date = parseDate(value);
  if (!date) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

async function saveAndCloseEdit(bookId, readingId = '') {
  if (readingId === '__REREAD_DRAFT__') {
    await saveRereadDraftAndClose(bookId);
    return;
  }

  try {
    const result = await saveBookData(bookId);
    updateLocalStateAfterSave(bookId, result);
    showBookDetail(bookId);
  } catch (error) {
    alert(`保存に失敗しました: ${error.message}`);
  }
}

async function saveBookData(bookId) {
  const bookPayload = {
    title: document.getElementById('editTitle')?.value || '',
    author: document.getElementById('editAuthor')?.value || '',
    publisher: document.getElementById('editPublisher')?.value || '',
    genre: document.getElementById('editGenre')?.value || '',
    tags: document.getElementById('editTags')?.value || '',
    purchaseDate: document.getElementById('editPurchaseDate')?.value || '',
    purchasePlace: document.getElementById('editPurchasePlace')?.value || ''
  };

  const readingPayload = {
    startDate: document.getElementById('editStartDate')?.value || '',
    finishDate: document.getElementById('editFinishDate')?.value || '',
    finishPlace: document.getElementById('editFinishPlace')?.value || '',
    rating: document.getElementById('editRating')?.value || '',
    impression: document.getElementById('editImpression')?.value || ''
  };

  const bookResponse = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'updateBook',
      bookId,
      bookData: bookPayload
    })
  });

  await bookResponse.json();

  const readingResponse = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'updateLatestReading',
      bookId,
      readingData: readingPayload
    })
  });

  const readingData = await readingResponse.json();

  return {
    bookPayload,
    readingPayload,
    readingId: readingData.result.readingId,
    skipped: readingData.result.skipped
  };
}

function updateLocalStateAfterSave(bookId, result) {
  const today = new Date().toISOString().slice(0, 10);

  const book = state.books.find(b => b['書籍ID'] === bookId);
  if (book) {
    book['タイトル'] = result.bookPayload.title;
    book['著者'] = result.bookPayload.author;
    book['出版社'] = result.bookPayload.publisher;
    book['ジャンル'] = result.bookPayload.genre;
    book['タグ'] = result.bookPayload.tags;
    book['購入日'] = result.bookPayload.purchaseDate;
    book['購入場所'] = result.bookPayload.purchasePlace;
    book['更新日時'] = today;
  }

  if (result.skipped) return;

  let reading = state.readings.find(r => r['読書体験ID'] === result.readingId);

  if (!reading) {
    reading = {
      '読書体験ID': result.readingId,
      '書籍ID': bookId,
      '作成日時': today
    };
    state.readings.push(reading);
  }

  reading['読始日'] = result.readingPayload.startDate;
  reading['読了日'] = result.readingPayload.finishDate;
  reading['評価'] = result.readingPayload.rating;
  reading['感想'] = result.readingPayload.impression;
  reading['読了場所'] = result.readingPayload.finishPlace;
  reading['更新日時'] = today;
}

async function saveRereadDraftAndClose(bookId) {
  const readingPayload = {
    startDate: document.getElementById('editStartDate')?.value || '',
    finishDate: document.getElementById('editFinishDate')?.value || '',
    finishPlace: document.getElementById('editFinishPlace')?.value || '',
    rating: document.getElementById('editRating')?.value || '',
    impression: document.getElementById('editImpression')?.value || ''
  };

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'createRereadingWithData',
        bookId,
        readingData: readingPayload
      })
    });

    const data = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    state.readings.push({
      '読書体験ID': data.result.readingId,
      '書籍ID': bookId,
      '読始日': readingPayload.startDate,
      '読了日': readingPayload.finishDate,
      '評価': readingPayload.rating,
      '感想': readingPayload.impression,
      '読了場所': readingPayload.finishPlace,
      '作成日時': today,
      '更新日時': today
    });

    showBookDetail(bookId);

  } catch (error) {
    alert(`再読の保存に失敗しました: ${error.message}`);
  }
}

function closeEditWithoutSave(bookId) {
  showBookDetail(bookId);
}

let isbnCameraStream = null;
let isbnScanActive = false;

function showIsbnCameraView() {
  setChromeVisible(false);

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="stopIsbnCamera(); showRegisterView();">←</button>
      <div></div>
    </div>

    <h1 class="page-title">ISBNを読み取る</h1>

    <div class="register-box">
      <video id="isbnCameraVideo" class="camera-preview" autoplay playsinline></video>
      <p id="isbnCameraMessage" class="subtle">カメラを起動しています...</p>
    </div>
  `;

  startIsbnCamera();
}

async function startIsbnCamera() {
  const video = document.getElementById('isbnCameraVideo');
  const message = document.getElementById('isbnCameraMessage');

  if (!navigator.mediaDevices?.getUserMedia) {
    message.textContent = 'この端末ではカメラを使用できません。';
    return;
  }

  if (!('BarcodeDetector' in window)) {
    message.textContent = 'このブラウザはバーコード読み取りに対応していません。';
    return;
  }

  try {
    const detector = new BarcodeDetector({ formats: ['ean_13'] });

    isbnCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    video.srcObject = isbnCameraStream;
    isbnScanActive = true;
    message.textContent = 'ISBNバーコードを映してください。';

    scanIsbnLoop(detector);

  } catch (error) {
    message.textContent = `カメラを起動できませんでした: ${error.message}`;
  }
}

async function scanIsbnLoop(detector) {
  if (!isbnScanActive) return;

  const video = document.getElementById('isbnCameraVideo');
  if (!video) return;

  try {
    const barcodes = await detector.detect(video);

    const isbnBarcode = barcodes.find(barcode => {
      const value = String(barcode.rawValue || '');
      return value.length === 13 &&
        (value.startsWith('978') || value.startsWith('979'));
    });

    if (isbnBarcode) {
      const isbn = isbnBarcode.rawValue;

      stopIsbnCamera();
      showRegisterView();

      setTimeout(() => {
        const input = document.getElementById('bookSearchInput');
        if (input) input.value = isbn;
        searchIsbnFromInput();
      }, 100);

      return;
    }

  } catch (error) {
    // 読み取り途中の一時エラーは無視
  }

  requestAnimationFrame(() => scanIsbnLoop(detector));
}

function stopIsbnCamera() {
  isbnScanActive = false;

  if (isbnCameraStream) {
    isbnCameraStream.getTracks().forEach(track => track.stop());
    isbnCameraStream = null;
  }
}

function splitChipValue(value) {
  return String(value || '')
    .split('|')
    .map(v => v.trim())
    .filter(Boolean);
}

function renderChipInputField(label, id, value, withHash = false, suggestionType = '') {
  const items = splitChipValue(value);

  return `
    <label class="edit-label">${label}</label>
    <input
      id="${id}Input"
      class="edit-input"
      type="text"
      placeholder="${label}を入力してEnter"
      enterkeyhint="enter"
      oninput="renderChipSuggestions('${id}', ${withHash}, '${suggestionType}')"
      onkeydown="handleChipInputKeydown(event, '${id}', ${withHash})"
    >
    <div id="${id}SuggestionList" class="chip-suggestion-list"></div>
    <div id="${id}ChipList" class="chip-list">
      ${items.map(item => renderChip(id, item, withHash)).join('')}
    </div>
    <input id="${id}" type="hidden" value="${escapeHtml(items.join('|'))}">
  `;
}

function renderChip(id, value, withHash = false) {
  const label = withHash && !String(value).startsWith('#')
    ? `#${value}`
    : value;

  return `
    <span class="input-chip" data-value="${escapeHtml(value)}">
      ${escapeHtml(label)}
      <button type="button" class="chip-remove" onclick="removeChip(this, '${id}')">×</button>
    </span>
  `;
}

function handleChipInputKeydown(event, id, withHash = false) {
  if (event.key !== 'Enter') return;

  event.preventDefault();

  const input = event.target;
  const value = input.value.trim();

  if (!value) return;

  addChip(id, value, withHash);
  input.value = '';

  const list = document.getElementById(`${id}SuggestionList`);
  if (list) list.innerHTML = '';
}

function renderChipSuggestions(id, withHash = false, suggestionType = '') {
  const input = document.getElementById(`${id}Input`);
  const list = document.getElementById(`${id}SuggestionList`);
  const hidden = document.getElementById(id);

  if (!input || !list || !hidden) return;

  const keyword = input.value.trim();
  if (!keyword || !suggestionType) {
    list.innerHTML = '';
    return;
  }

  const currentItems = splitChipValue(hidden.value);
  const suggestions = getChipSuggestions(suggestionType, keyword, currentItems).slice(0, 6);

  list.innerHTML = suggestions.map(value => {
    const display = withHash && !value.startsWith('#') ? `#${value}` : value;

    return `
      <button
        type="button"
        class="chip-suggestion"
        onclick="selectChipSuggestion('${id}', '${escapeJs(value)}', ${withHash})"
      >
        ${escapeHtml(display)}
      </button>
    `;
  }).join('');
}

function getChipSuggestions(type, keyword, currentItems) {
  let source = [];

  if (type === 'authors') {
    source = state.books.flatMap(book => splitChipValue(book['著者']));
  }

  if (type === 'tags') {
    source = state.books.flatMap(book =>
      splitChipValue(book['タグ']).map(tag => tag.replace(/^#/, ''))
    );
  }

  if (type === 'purchasePlaces') {
    source = state.books
      .map(book => book['購入場所'])
      .filter(Boolean);
  }

  if (type === 'finishPlaces') {
    source = state.readings
      .map(reading => reading['読了場所'])
      .filter(Boolean);
  }

  const unique = [...new Set(source)]
    .map(v => String(v || '').trim())
    .filter(Boolean);

  return unique.filter(item =>
    item.includes(keyword) &&
    !currentItems.includes(item)
  );
}

function selectChipSuggestion(id, value, withHash = false) {
  addChip(id, value, withHash);

  const input = document.getElementById(`${id}Input`);
  const list = document.getElementById(`${id}SuggestionList`);

  if (input) input.value = '';
  if (list) list.innerHTML = '';
}

function addChip(id, value, withHash = false) {
  const hidden = document.getElementById(id);
  const list = document.getElementById(`${id}ChipList`);
  if (!hidden || !list) return;

  const items = splitChipValue(hidden.value);

  if (!items.includes(value)) {
    items.push(value);
  }

  hidden.value = items.join('|');
  list.innerHTML = items.map(item => renderChip(id, item, withHash)).join('');
}

function removeChip(button, id) {
  const chip = button.closest('.input-chip');
  const value = chip?.dataset.value;
  const hidden = document.getElementById(id);
  const list = document.getElementById(`${id}ChipList`);
  if (!value || !hidden || !list) return;

  const items = splitChipValue(hidden.value).filter(item => item !== value);

  hidden.value = items.join('|');
  list.innerHTML = items.map(item => renderChip(id, item)).join('');
}

function escapeJs(value) {
  return String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'");
}

function renderGenreSelect(currentValue) {
  const currentGenres = String(currentValue || '')
    .split('|')
    .map(v => v.trim())
    .filter(Boolean);

  const displayText = currentGenres.length
    ? currentGenres.join('｜')
    : 'ジャンルを選ぶ';

  return `
    <label class="edit-label">ジャンル</label>
    <button type="button" class="edit-input genre-select-button" onclick="openGenreModal()">
      <span id="genreDisplayText">${escapeHtml(displayText)}</span>
      <span>›</span>
    </button>
    <input id="editGenre" type="hidden" value="${escapeHtml(currentGenres.join('|'))}">
    <div id="genreModal" class="modal-backdrop hidden" onclick="closeGenreModal(event)">
      <div class="bottom-sheet" onclick="event.stopPropagation()">
        <div class="bottom-sheet-header">
          <div class="bottom-sheet-title">ジャンルを選ぶ</div>
          <button type="button" class="mini-button" onclick="applyGenreModal()">決定</button>
        </div>
        <div class="genre-modal-list">
          ${renderGenreModalButtons(currentGenres)}
        </div>
      </div>
    </div>
  `;
}

function renderGenreModalButtons(currentGenres) {
  const activeGenres = (state.genres || [])
    .filter(g => String(g['有効']).toUpperCase() !== 'FALSE')
    .sort((a, b) => Number(a['表示順'] || 999) - Number(b['表示順'] || 999));

  return activeGenres.map(genre => {
    const name = genre['ジャンル名'];
    const selected = currentGenres.includes(name);

    return `
      <button
        type="button"
        class="genre-modal-chip ${selected ? 'selected' : ''}"
        data-genre="${escapeHtml(name)}"
        onclick="toggleGenreModalChip(this)"
      >
        ${escapeHtml(name)}
      </button>
    `;
  }).join('');
}

function openGenreModal() {
  document.getElementById('genreModal')?.classList.remove('hidden');
}

function closeGenreModal(event) {
  if (event.target.id === 'genreModal') {
    document.getElementById('genreModal')?.classList.add('hidden');
  }
}

function toggleGenreModalChip(button) {
  button.classList.toggle('selected');
}

function applyGenreModal() {
  const selectedGenres = [...document.querySelectorAll('#genreModal .genre-modal-chip.selected')]
    .map(btn => btn.dataset.genre);

  const value = selectedGenres.join('|');
  const displayText = selectedGenres.length
    ? selectedGenres.join('｜')
    : 'ジャンルを選ぶ';

  document.getElementById('editGenre').value = value;
  document.getElementById('genreDisplayText').textContent = displayText;
  document.getElementById('genreModal')?.classList.add('hidden');
}

function showStatusBookList(status, title) {
  setChromeVisible(true);
  state.currentView = 'home';
  setActiveNav('home');

  const books = getBooksByStatus(status);

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="showHomeView()">←</button>
      <div></div>
    </div>

    <h1 class="page-title">${escapeHtml(title)}</h1>

    <div class="subtle" style="margin-bottom:12px;">
      ${books.length}冊
    </div>

    <div class="book-grid">
      ${
        books.length
          ? books.map(book => renderBookCard(book)).join('')
          : '<div class="empty-message">該当する本はありません。</div>'
      }
    </div>
  `;
}

function renderQuoteBlock(quote) {
  const page = quote['ページ']
    ? `p.${escapeHtml(quote['ページ'])}`
    : '';

  const date = quote['登録日']
    ? formatDate(quote['登録日'])
    : '';

  return `
    <div class="quote-card">
      ${page || date ? `<div class="archive-meta">${page}${page && date ? '　' : ''}${date}</div>` : ''}
      <p class="archive-text">${escapeHtml(quote['引用本文'] || '')}</p>
    </div>
  `;
}

function showQuoteAddView(bookId) {
  setChromeVisible(false);

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <button class="icon-button" onclick="showBookDetail('${bookId}')">×</button>
      <button class="icon-button" onclick="saveQuoteAndClose('${bookId}')">保存</button>
    </div>

    <h1 class="page-title">引用を追加</h1>

    <div class="edit-form">
      <label class="edit-label" for="quotePageInput">ページ</label>
      <input
        id="quotePageInput"
        class="edit-input"
        type="text"
        inputmode="numeric"
        placeholder="例：32"
      >

      <label class="edit-label" for="quoteTextInput">引用本文</label>
      <textarea
        id="quoteTextInput"
        class="edit-textarea"
        rows="10"
        placeholder="引用を入力"
      ></textarea>
    </div>
  `;
}

async function saveQuoteAndClose(bookId) {
  const page =
    document.getElementById('quotePageInput')?.value.trim() || '';

  const text =
    document.getElementById('quoteTextInput')?.value.trim() || '';

  if (!text) {
    alert('引用本文を入力してください');
    return;
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: 'createQuote',
        bookId,
        quoteData: {
          page,
          text
        }
      })
    });

    const data = await response.json();
    const result = data.result;

    const today = new Date().toISOString().slice(0, 10);

    state.quotes.push({
      '引用ID': result.quoteId,
      '書籍ID': bookId,
      'ページ': page,
      '引用本文': text,
      '登録日': today,
      '作成日時': today
    });

    showBookDetail(bookId);

  } catch (error) {
    alert(`引用の保存に失敗しました: ${error.message}`);
  }
}






