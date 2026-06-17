const GAS_WEB_APP_URL = 'PASTE_YOUR_GAS_URL_HERE';

const state = {
  books: [],
  readings: [],
  quotes: [],
  links: [],
  genres: [],
  currentView: 'home'
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
      body: JSON.stringify({
        type: 'getBooks'
      })
    });

    const data = await response.json();

    state.books = data.books || [];
    state.readings = [];
    state.quotes = [];
    state.links = [];
    state.genres = [];

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

  document.getElementById('app').innerHTML = `
    <h1 class="page-title">ホーム</h1>

    <section class="section">
      <h2 class="section-title">📚 読書アプリ外部化テスト</h2>
      <div class="register-box">
        <p>Cloudflare版 dokusyo の土台です。</p>
        <div class="subtle">取得冊数：${state.books.length}冊</div>
      </div>
    </section>
  `;
}

function showBookshelfView() {
  setChromeVisible(true);
  state.currentView = 'bookshelf';
  setActiveNav('bookshelf');

  document.getElementById('app').innerHTML = `
    <div class="detail-header">
      <h1 class="page-title">本棚</h1>
    </div>

    <div class="bookshelf-condition-card">
      <div class="bookshelf-condition-title">本を探す</div>
      <div class="bookshelf-condition-summary">
        直近順 ｜ 全て（${state.books.length}冊）
      </div>
    </div>

    <div class="book-grid">
      ${state.books.map(book => renderBookCard(book)).join('')}
    </div>
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
  alert('本登録は次に移植します');
}

function renderBookCard(book) {
  return `
    <div class="book-card">
      <div class="cover-wrap">
        ${renderCover(book)}
      </div>
      <div class="book-title">${escapeHtml(book.title || '')}</div>
    </div>
  `;
}

function renderCover(book) {
  const url = String(book.coverUrl || '').trim().replace(/^http:/, 'https:');

  if (url) {
    return `
      <img
        class="book-cover"
        src="${escapeHtml(url)}"
        alt="${escapeHtml(book.title || '')}"
        data-title="${escapeHtml(book.title || 'No Title')}"
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
  const title = escapeHtml(book.title || 'No Title');
  return `<div class="dummy-cover">${title}</div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
