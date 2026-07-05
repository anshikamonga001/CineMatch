/* ===================================================
   CineMatch – Frontend Application Logic (app.js)
   =================================================== */

const API_BASE = 'http://localhost:5000/api';

/* ============================================
   STATE MANAGEMENT
   ============================================ */
const state = {
  user: null,
  token: null,
  currentSection: 'dashboard',
  movies: [],
  watchlist: [],
  recommendations: [],
  filters: { genre: '', language: '', year: '', rating: '', sort: 'rating' },
  pagination: { page: 1, limit: 20 },
  charts: {},
  analyticsTab: 'overview',
  watchlistFilter: 'all',
};

/* ============================================
   INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // Loading animation
  animateLoader();

  // Restore auth session
  const savedToken = localStorage.getItem('cinematch_token');
  const savedUser  = localStorage.getItem('cinematch_user');
  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user  = JSON.parse(savedUser);
    updateUIForAuth();
  }

  // Check API status
  checkApiStatus();

  // Wait for loader then render
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('fade-out');
    initSection('dashboard');
    initEventListeners();
    loadGenresForFilter();
  }, 1800);
});

function animateLoader() {
  const fill = document.getElementById('loader-fill');
  let width = 0;
  const interval = setInterval(() => {
    width += Math.random() * 18 + 5;
    if (width >= 95) { width = 95; clearInterval(interval); }
    fill.style.width = width + '%';
  }, 150);
  setTimeout(() => { fill.style.width = '100%'; }, 1600);
}

/* ============================================
   API HELPERS
   ============================================ */
async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API error on ${endpoint}:`, err.message);
    throw err;
  }
}

async function checkApiStatus() {
  const dot   = document.getElementById('api-status-dot');
  const label = document.getElementById('api-status-label');
  try {
    await fetch(`http://localhost:5000/`);
    dot.classList.add('online');
    label.textContent = 'Online';
  } catch {
    dot.classList.remove('online');
    dot.classList.add('offline');
    label.textContent = 'Offline';
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function initEventListeners() {
  // Sidebar nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      navigateTo(section);
    });
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('topbar-sidebar-toggle').addEventListener('click', toggleSidebar);

  // Auth modal close
  document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  // Movie modal close
  document.getElementById('close-movie-modal').addEventListener('click', () => {
    document.getElementById('movie-modal').classList.add('hidden');
  });

  // Auth forms
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);

  // Global search
  const searchInput = document.getElementById('global-search');
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => globalSearch(searchInput.value), 400);
  });
  searchInput.addEventListener('blur', () => {
    setTimeout(() => document.getElementById('search-results').classList.remove('visible'), 200);
  });

  // Auth button in topbar
  const topbarAuthBtn = document.getElementById('topbar-auth-btn');
  if (state.user) {
    topbarAuthBtn.textContent = 'Sign Out';
    topbarAuthBtn.onclick = handleSignOut;
  }
}

function navigateTo(section) {
  state.currentSection = section;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.getElementById(`nav-${section}`);
  if (activeLink) activeLink.classList.add('active');

  // Update sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const activeSection = document.getElementById(`section-${section}`);
  if (activeSection) activeSection.classList.add('active');

  // Load section data
  initSection(section);

  // On mobile, close sidebar
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function initSection(section) {
  switch(section) {
    case 'dashboard':   loadDashboard(); break;
    case 'discover':    loadMovies(); break;
    case 'recommendations': loadRecommendations(); break;
    case 'watchlist':   loadWatchlist(); break;
    case 'analytics':   loadAnalytics(); break;
    case 'database':    /* static */ break;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('main-content');
  const topbar  = document.querySelector('.topbar');
  if (window.innerWidth <= 900) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed');
    topbar.classList.toggle('sidebar-collapsed');
  }
}

/* ============================================
   AUTH
   ============================================ */
function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('register-error').classList.add('hidden');
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.classList.add('hidden');

  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    state.token = data.token;
    state.user  = data.user;
    localStorage.setItem('cinematch_token', data.token);
    localStorage.setItem('cinematch_user', JSON.stringify(data.user));
    updateUIForAuth();
    closeAuthModal();
    showToast('Welcome back, ' + data.user.first_name + '! 🎬', 'success');
    if (state.currentSection === 'recommendations') loadRecommendations();
    if (state.currentSection === 'watchlist') loadWatchlist();
  } catch (err) {
    errEl.textContent = err.message || 'Invalid email or password.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const firstName = document.getElementById('reg-first-name').value;
  const lastName  = document.getElementById('reg-last-name').value;
  const email     = document.getElementById('reg-email').value;
  const password  = document.getElementById('reg-password').value;
  const gender    = document.getElementById('reg-gender').value;
  const country   = document.getElementById('reg-country').value;
  const errEl     = document.getElementById('register-error');
  const btn       = document.getElementById('register-btn');

  btn.disabled = true;
  btn.textContent = 'Creating account…';
  errEl.classList.add('hidden');

  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, gender, country }),
    });
    state.token = data.token;
    state.user  = data.user;
    localStorage.setItem('cinematch_token', data.token);
    localStorage.setItem('cinematch_user', JSON.stringify(data.user));
    updateUIForAuth();
    closeAuthModal();
    showToast('Account created! Welcome to CineMatch 🎬', 'success');
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function handleSignOut() {
  state.token = null;
  state.user  = null;
  localStorage.removeItem('cinematch_token');
  localStorage.removeItem('cinematch_user');
  updateUIForAuth();
  showToast('Signed out successfully.', 'info');
  navigateTo('dashboard');
}

function updateUIForAuth() {
  const authBtn      = document.getElementById('auth-btn');
  const topbarBtn    = document.getElementById('topbar-auth-btn');
  const avatar       = document.getElementById('sidebar-avatar');
  const name         = document.getElementById('sidebar-name');
  const role         = document.getElementById('sidebar-role');

  if (state.user) {
    authBtn.textContent = 'Sign Out';
    authBtn.onclick = handleSignOut;
    topbarBtn.textContent = 'Sign Out';
    topbarBtn.onclick = handleSignOut;
    avatar.textContent = state.user.first_name[0].toUpperCase();
    name.textContent   = `${state.user.first_name} ${state.user.last_name}`;
    role.textContent   = state.user.email;
  } else {
    authBtn.textContent = 'Sign In';
    authBtn.onclick = openAuthModal;
    topbarBtn.textContent = 'Sign In';
    topbarBtn.onclick = openAuthModal;
    avatar.textContent = '?';
    name.textContent   = 'Guest User';
    role.textContent   = 'Not signed in';
  }
}

/* ============================================
   DASHBOARD
   ============================================ */
async function loadDashboard() {
  loadDashboardStats();
  loadTopRatedList();
  loadActiveUsersList();
  loadTrendingList();
  loadGenreChart();
  loadActivityChart();
  loadLanguageChart();
}

async function loadDashboardStats() {
  try {
    const data = await apiCall('/analytics/dashboard-stats');
    animateCount('stat-users-val', data.total_users || 0);
    animateCount('stat-movies-val', data.total_movies || 0);
    animateCount('stat-ratings-val', data.total_ratings || 0);
    animateCount('stat-reviews-val', data.total_reviews || 0);
    animateCount('stat-genres-val', data.total_genres || 0);
    animateCount('stat-directors-val', data.total_directors || 0);
  } catch {
    setStatsFallback();
  }
}

function setStatsFallback() {
  ['stat-users-val','stat-movies-val','stat-ratings-val','stat-reviews-val','stat-genres-val','stat-directors-val']
    .forEach(id => { document.getElementById(id).textContent = '—'; });
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const increment = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current.toLocaleString();
  }, 40);
}

async function loadTopRatedList() {
  const el = document.getElementById('top-rated-list');
  try {
    const data = await apiCall('/analytics/top-rated-movies');
    el.innerHTML = '';
    const movies = Array.isArray(data) ? data : (data.movies || data.data || []);
    movies.slice(0, 8).forEach((m, i) => {
      el.appendChild(createRankedItem(i + 1, m.title, `${m.genre_name || ''} • ${m.release_year || ''}`, `⭐ ${parseFloat(m.avg_rating || m.imdb_rating || 0).toFixed(1)}`, () => openMovieModal(m.movie_id)));
    });
    if (!movies.length) el.innerHTML = '<p class="loading-placeholder">No data available</p>';
  } catch {
    el.innerHTML = '<p class="loading-placeholder">Connect to backend to see data</p>';
  }
}

async function loadActiveUsersList() {
  const el = document.getElementById('active-users-list');
  try {
    const data = await apiCall('/analytics/most-active-users');
    el.innerHTML = '';
    const users = Array.isArray(data) ? data : (data.users || data.data || []);
    users.slice(0, 8).forEach((u, i) => {
      const total = (u.ratings_count || 0) + (u.reviews_count || 0) + (u.watchlist_count || 0);
      el.appendChild(createRankedItem(i + 1, `${u.first_name} ${u.last_name}`, u.country || 'Unknown', `${total} actions`));
    });
    if (!users.length) el.innerHTML = '<p class="loading-placeholder">No data available</p>';
  } catch {
    el.innerHTML = '<p class="loading-placeholder">Connect to backend to see data</p>';
  }
}

async function loadTrendingList() {
  const el = document.getElementById('trending-list');
  try {
    const data = await apiCall('/analytics/trending-movies');
    el.innerHTML = '';
    const movies = Array.isArray(data) ? data : (data.movies || data.data || []);
    movies.slice(0, 6).forEach((m, i) => {
      el.appendChild(createRankedItem(i + 1, m.title, m.genre_name || '', `🔥 ${m.activity_count || m.total_ratings || ''}`, () => openMovieModal(m.movie_id)));
    });
    if (!movies.length) el.innerHTML = '<p class="loading-placeholder">No trending data</p>';
  } catch {
    el.innerHTML = '<p class="loading-placeholder">Connect to backend to see data</p>';
  }
}

function createRankedItem(rank, title, sub, score, onClick) {
  const div = document.createElement('div');
  div.className = 'ranked-item';
  if (onClick) div.addEventListener('click', onClick);
  const badgeClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default';
  div.innerHTML = `
    <div class="rank-badge ${badgeClass}">${rank}</div>
    <div class="ranked-info">
      <div class="ranked-title">${escapeHTML(title)}</div>
      <div class="ranked-sub">${escapeHTML(sub)}</div>
    </div>
    <div class="ranked-score">${escapeHTML(score)}</div>`;
  return div;
}

async function loadGenreChart() {
  try {
    const data = await apiCall('/analytics/genre-popularity');
    const genres = Array.isArray(data) ? data : (data.genres || data.data || []);
    if (!genres.length) return;

    const ctx = document.getElementById('genre-chart').getContext('2d');
    if (state.charts.genre) state.charts.genre.destroy();
    state.charts.genre = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: genres.slice(0,12).map(g => g.genre_name),
        datasets: [{
          label: 'Movies',
          data: genres.slice(0,12).map(g => g.total_movies || 0),
          backgroundColor: genres.slice(0,12).map((_, i) =>
            `hsla(${200 + i * 22}, 80%, 60%, 0.75)`),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#9fa3be', font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: '#9fa3be', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  } catch { /* fallback demo data */ renderDemoGenreChart(); }
}

function renderDemoGenreChart() {
  const ctx = document.getElementById('genre-chart').getContext('2d');
  if (state.charts.genre) state.charts.genre.destroy();
  const labels = ['Action','Drama','Comedy','Thriller','Sci-Fi','Romance','Crime','Animation','Horror','Fantasy'];
  const values = [87,74,68,61,55,48,43,38,32,28];
  state.charts.genre = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Movies', data: values, backgroundColor: labels.map((_,i) => `hsla(${200+i*22},80%,60%,0.75)`), borderRadius: 6, borderSkipped: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color:'#9fa3be', font:{size:11} }, grid:{display:false} }, y: { ticks: { color:'#9fa3be', font:{size:11} }, grid: { color:'rgba(255,255,255,0.05)' } } } }
  });
}

async function loadActivityChart() {
  try {
    const data = await apiCall('/analytics/monthly-activity');
    const months = Array.isArray(data) ? data : (data.months || data.data || []);
    if (!months.length) { renderDemoActivityChart(); return; }
    const ctx = document.getElementById('activity-chart').getContext('2d');
    if (state.charts.activity) state.charts.activity.destroy();
    state.charts.activity = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.map(m => m.month_label || m.month),
        datasets: [
          { label: 'Ratings', data: months.map(m => m.ratings_count || 0), borderColor: '#7c6bff', backgroundColor: 'rgba(124,107,255,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#7c6bff' },
          { label: 'Reviews', data: months.map(m => m.reviews_count || 0), borderColor: '#3ecfff', backgroundColor: 'rgba(62,207,255,0.08)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#3ecfff' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9fa3be', font:{size:11} } } },
        scales: {
          x: { ticks: { color:'#9fa3be', font:{size:11} }, grid:{display:false} },
          y: { ticks: { color:'#9fa3be', font:{size:11} }, grid: { color:'rgba(255,255,255,0.05)' } }
        }
      }
    });
  } catch { renderDemoActivityChart(); }
}

function renderDemoActivityChart() {
  const ctx = document.getElementById('activity-chart').getContext('2d');
  if (state.charts.activity) state.charts.activity.destroy();
  const months = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  state.charts.activity = new Chart(ctx, {
    type:'line',
    data: {
      labels: months,
      datasets:[
        { label:'Ratings', data:[420,510,480,620,740,890,750,810,920,880,960,1040], borderColor:'#7c6bff', backgroundColor:'rgba(124,107,255,0.1)', tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#7c6bff' },
        { label:'Reviews', data:[180,210,195,280,340,410,360,390,450,420,480,520], borderColor:'#3ecfff', backgroundColor:'rgba(62,207,255,0.08)', tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#3ecfff' }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{labels:{color:'#9fa3be',font:{size:11}}} }, scales:{ x:{ticks:{color:'#9fa3be',font:{size:11}},grid:{display:false}}, y:{ticks:{color:'#9fa3be',font:{size:11}},grid:{color:'rgba(255,255,255,0.05)'}} } }
  });
}

async function loadLanguageChart() {
  try {
    const data = await apiCall('/analytics/language-popularity');
    const langs = Array.isArray(data) ? data : (data.languages || data.data || []);
    if (!langs.length) { renderDemoLanguageChart(); return; }
    renderLanguageChart(langs);
  } catch { renderDemoLanguageChart(); }
}

function renderLanguageChart(langs) {
  const ctx = document.getElementById('language-chart').getContext('2d');
  if (state.charts.language) state.charts.language.destroy();
  state.charts.language = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: langs.slice(0,7).map(l => l.language),
      datasets: [{ data: langs.slice(0,7).map(l => l.movie_count || 0), backgroundColor: ['#7c6bff','#3ecfff','#f5c842','#ff6b9d','#56c596','#f5a623','#c44cce'], borderWidth: 2, borderColor: '#0f1118' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color:'#9fa3be', font:{size:11}, boxWidth:12 }, position:'right' } }, cutout: '60%' }
  });
}

function renderDemoLanguageChart() {
  const ctx = document.getElementById('language-chart').getContext('2d');
  if (state.charts.language) state.charts.language.destroy();
  state.charts.language = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:['English','Hindi','Korean','French','Spanish','Japanese','Other'],
      datasets:[{data:[450,180,95,72,65,48,90],backgroundColor:['#7c6bff','#3ecfff','#f5c842','#ff6b9d','#56c596','#f5a623','#c44cce'],borderWidth:2,borderColor:'#0f1118'}]
    },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#9fa3be',font:{size:11},boxWidth:12},position:'right'}}, cutout:'60%' }
  });
}

/* ============================================
   DISCOVER / MOVIES
   ============================================ */
async function loadMovies() {
  const grid = document.getElementById('movies-grid');
  grid.innerHTML = '<div class="loading-placeholder large">Loading movies…</div>';

  const params = new URLSearchParams({
    page: state.pagination.page,
    limit: state.pagination.limit,
    ...(state.filters.genre    && { genre:    state.filters.genre }),
    ...(state.filters.language && { language: state.filters.language }),
    ...(state.filters.year     && { year:     state.filters.year }),
    ...(state.filters.rating   && { min_rating: state.filters.rating }),
    sort: state.filters.sort,
  });

  try {
    const data = await apiCall(`/movies?${params}`);
    state.movies = Array.isArray(data) ? data : (data.movies || data.data || []);
    renderMoviesGrid(state.movies, 'movies-grid');
    updatePagination(data.total || state.movies.length, data.page || state.pagination.page, data.totalPages || 1);
  } catch {
    renderDemoMovies();
  }
}

function renderDemoMovies() {
  const demoMovies = [
    { movie_id:1, title:'The Dark Knight', release_year:2008, imdb_rating:9.0, genre_name:'Action', language:'English', avg_rating:4.8 },
    { movie_id:2, title:'Inception', release_year:2010, imdb_rating:8.8, genre_name:'Sci-Fi', language:'English', avg_rating:4.7 },
    { movie_id:3, title:'Parasite', release_year:2019, imdb_rating:8.5, genre_name:'Thriller', language:'Korean', avg_rating:4.6 },
    { movie_id:4, title:'Interstellar', release_year:2014, imdb_rating:8.6, genre_name:'Sci-Fi', language:'English', avg_rating:4.7 },
    { movie_id:5, title:'The Godfather', release_year:1972, imdb_rating:9.2, genre_name:'Crime', language:'English', avg_rating:4.9 },
    { movie_id:6, title:'Pulp Fiction', release_year:1994, imdb_rating:8.9, genre_name:'Crime', language:'English', avg_rating:4.7 },
    { movie_id:7, title:'The Shawshank Redemption', release_year:1994, imdb_rating:9.3, genre_name:'Drama', language:'English', avg_rating:4.9 },
    { movie_id:8, title:'Fight Club', release_year:1999, imdb_rating:8.8, genre_name:'Drama', language:'English', avg_rating:4.6 },
    { movie_id:9, title:'Goodfellas', release_year:1990, imdb_rating:8.7, genre_name:'Crime', language:'English', avg_rating:4.7 },
    { movie_id:10, title:'Joker', release_year:2019, imdb_rating:8.4, genre_name:'Drama', language:'English', avg_rating:4.4 },
    { movie_id:11, title:'Forrest Gump', release_year:1994, imdb_rating:8.8, genre_name:'Drama', language:'English', avg_rating:4.8 },
    { movie_id:12, title:'The Matrix', release_year:1999, imdb_rating:8.7, genre_name:'Sci-Fi', language:'English', avg_rating:4.6 },
    { movie_id:13, title:'Avengers: Endgame', release_year:2019, imdb_rating:8.4, genre_name:'Action', language:'English', avg_rating:4.5 },
    { movie_id:14, title:'Schindler\'s List', release_year:1993, imdb_rating:9.0, genre_name:'Drama', language:'English', avg_rating:4.8 },
    { movie_id:15, title:'The Silence of the Lambs', release_year:1991, imdb_rating:8.6, genre_name:'Thriller', language:'English', avg_rating:4.6 },
    { movie_id:16, title:'Spirited Away', release_year:2001, imdb_rating:8.6, genre_name:'Animation', language:'Japanese', avg_rating:4.7 },
    { movie_id:17, title:'Whiplash', release_year:2014, imdb_rating:8.5, genre_name:'Drama', language:'English', avg_rating:4.6 },
    { movie_id:18, title:'3 Idiots', release_year:2009, imdb_rating:8.4, genre_name:'Comedy', language:'Hindi', avg_rating:4.6 },
    { movie_id:19, title:'Memento', release_year:2000, imdb_rating:8.4, genre_name:'Thriller', language:'English', avg_rating:4.5 },
    { movie_id:20, title:'No Country for Old Men', release_year:2007, imdb_rating:8.2, genre_name:'Thriller', language:'English', avg_rating:4.4 },
  ];
  renderMoviesGrid(demoMovies, 'movies-grid');
}

function renderMoviesGrid(movies, gridId) {
  const grid = document.getElementById(gridId);
  if (!movies.length) {
    grid.innerHTML = '<div class="loading-placeholder large">No movies found.</div>';
    return;
  }
  grid.innerHTML = '';
  movies.forEach(m => {
    const card = createMovieCard(m);
    grid.appendChild(card);
  });
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.setAttribute('data-movie-id', movie.movie_id);
  card.addEventListener('click', () => openMovieModal(movie.movie_id, movie));

  const rating = movie.imdb_rating || movie.avg_rating || 0;
  const userRating = movie.avg_rating ? parseFloat(movie.avg_rating).toFixed(1) : null;

  card.innerHTML = `
    ${movie.poster_url
      ? `<img class="movie-poster" src="${escapeHTML(movie.poster_url)}" alt="${escapeHTML(movie.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="movie-poster-placeholder" style="display:none;"><div class="poster-icon">🎬</div>${escapeHTML(movie.title)}</div>`
      : `<div class="movie-poster-placeholder"><div class="poster-icon">🎬</div><span>${escapeHTML(movie.title)}</span></div>`
    }
    ${movie.genre_name ? `<div class="movie-genre-badge">${escapeHTML(movie.genre_name)}</div>` : ''}
    <div class="movie-rating-badge">⭐ ${parseFloat(rating).toFixed(1)}</div>
    <div class="movie-overlay">
      <div class="movie-title">${escapeHTML(movie.title)}</div>
      <div class="movie-meta">${movie.release_year || ''} ${movie.language ? '• ' + movie.language : ''} ${userRating ? '• ★' + userRating + ' user' : ''}</div>
    </div>`;
  return card;
}

async function openMovieModal(movieId, movieData) {
  const modal   = document.getElementById('movie-modal');
  const content = document.getElementById('movie-modal-content');
  modal.classList.remove('hidden');
  content.innerHTML = '<div class="loading-placeholder" style="padding:60px">Loading…</div>';

  try {
    let movie = movieData;
    try {
      const fullData = await apiCall(`/movies/${movieId}`);
      movie = fullData.movie || fullData || movie;
    } catch { /* use passed data */ }

    if (!movie) throw new Error('No movie data');

    const reviews = await safeApiCall(`/movies/${movieId}/reviews`) || [];
    renderMovieModal(movie, reviews, content);
  } catch {
    content.innerHTML = '<p class="loading-placeholder">Could not load movie details.</p>';
  }
}

async function safeApiCall(endpoint) {
  try { return await apiCall(endpoint); } catch { return null; }
}

function renderMovieModal(movie, reviews, container) {
  const reviewList = Array.isArray(reviews) ? reviews : (reviews.reviews || reviews.data || []);
  container.innerHTML = `
    <div class="movie-detail">
      <div>
        ${movie.poster_url
          ? `<img class="movie-detail-poster" src="${escapeHTML(movie.poster_url)}" alt="${escapeHTML(movie.title)}">`
          : `<div class="movie-detail-poster-placeholder">🎬</div>`}
      </div>
      <div class="movie-detail-info">
        <h2 class="movie-detail-title">${escapeHTML(movie.title)}</h2>
        <div class="movie-detail-meta">
          ${movie.release_year || ''} ${movie.language ? '• ' + movie.language : ''} ${movie.duration ? '• ' + movie.duration + ' min' : ''} ${movie.age_rating ? '• ' + movie.age_rating : ''}
        </div>
        <div class="movie-detail-badges">
          ${movie.genre_name ? `<span class="badge badge-purple">${escapeHTML(movie.genre_name)}</span>` : ''}
          ${movie.imdb_rating ? `<span class="badge badge-gold">⭐ IMDb ${movie.imdb_rating}</span>` : ''}
          ${movie.avg_rating ? `<span class="badge badge-cyan">★ ${parseFloat(movie.avg_rating).toFixed(1)} User</span>` : ''}
          ${movie.director_name ? `<span class="badge badge-purple">🎥 ${escapeHTML(movie.director_name)}</span>` : ''}
        </div>
        ${movie.description ? `<p class="movie-detail-desc">${escapeHTML(movie.description)}</p>` : ''}

        <div class="movie-detail-actions">
          <button class="btn btn-outline btn-sm" onclick="addToWatchlistUI(${movie.movie_id})">📋 Watchlist</button>
          ${state.user ? `<button class="btn btn-outline btn-sm" onclick="showRatingUI(${movie.movie_id})">⭐ Rate</button>` : ''}
        </div>

        ${state.user ? `
          <div class="rating-input-wrap" id="rating-ui-${movie.movie_id}" style="display:none">
            <span style="font-size:0.85rem;color:var(--text-secondary)">Your rating:</span>
            <div class="star-rating" id="stars-${movie.movie_id}">
              ${[1,2,3,4,5].map(n => `<button class="star-btn" onclick="setRating(${movie.movie_id},${n})" id="star-${movie.movie_id}-${n}">★</button>`).join('')}
            </div>
            <button class="btn btn-primary btn-sm" onclick="submitRating(${movie.movie_id})">Submit</button>
          </div>
        ` : ''}

        <div class="reviews-section">
          <div class="reviews-title">💬 Reviews (${reviewList.length})</div>
          ${reviewList.slice(0, 5).map(r => `
            <div class="review-item">
              <span class="review-user">${escapeHTML(r.first_name || r.user_name || 'User')}</span>
              <span class="review-date">${r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</span>
              <p class="review-text">${escapeHTML(r.review_text)}</p>
            </div>`).join('') || '<p style="color:var(--text-muted);font-size:0.85rem">No reviews yet. Be the first!</p>'}

          ${state.user ? `
            <div class="write-review-form">
              <textarea id="review-text-${movie.movie_id}" placeholder="Write your review…" style="width:100%;height:80px;resize:vertical;margin-bottom:8px;background:rgba(255,255,255,0.04);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-primary);padding:10px;font-family:var(--font-body);font-size:0.85rem"></textarea>
              <button class="btn btn-primary btn-sm" onclick="submitReview(${movie.movie_id})">Post Review</button>
            </div>` : `<p style="color:var(--text-muted);font-size:0.82rem;margin-top:8px"><a href="#" onclick="openAuthModal()" style="color:var(--accent-purple)">Sign in</a> to write a review.</p>`}
        </div>
      </div>
    </div>`;
}

let selectedRating = 0;
function showRatingUI(movieId) {
  const ui = document.getElementById(`rating-ui-${movieId}`);
  if (ui) ui.style.display = ui.style.display === 'none' ? 'flex' : 'none';
}
function setRating(movieId, value) {
  selectedRating = value;
  for (let i = 1; i <= 5; i++) {
    const star = document.getElementById(`star-${movieId}-${i}`);
    if (star) star.classList.toggle('active', i <= value);
  }
}
async function submitRating(movieId) {
  if (!selectedRating) { showToast('Please select a rating', 'error'); return; }
  try {
    await apiCall('/interactions/rate', { method: 'POST', body: JSON.stringify({ movie_id: movieId, rating: selectedRating }) });
    showToast(`Rated ${selectedRating}/5 ⭐`, 'success');
    selectedRating = 0;
  } catch (e) { showToast(e.message || 'Rating failed', 'error'); }
}
async function submitReview(movieId) {
  const text = document.getElementById(`review-text-${movieId}`).value.trim();
  if (!text) { showToast('Review cannot be empty', 'error'); return; }
  try {
    await apiCall('/interactions/review', { method: 'POST', body: JSON.stringify({ movie_id: movieId, review_text: text }) });
    showToast('Review posted! 💬', 'success');
    document.getElementById(`review-text-${movieId}`).value = '';
  } catch (e) { showToast(e.message || 'Review failed', 'error'); }
}
async function addToWatchlistUI(movieId) {
  if (!state.user) { openAuthModal(); return; }
  try {
    await apiCall('/interactions/watchlist', { method: 'POST', body: JSON.stringify({ movie_id: movieId, watch_status: 'Plan to Watch' }) });
    showToast('Added to watchlist 📋', 'success');
  } catch (e) { showToast(e.message || 'Could not add to watchlist', 'error'); }
}

function applyFilters() {
  state.filters.genre    = document.getElementById('filter-genre').value;
  state.filters.language = document.getElementById('filter-language').value;
  state.filters.year     = document.getElementById('filter-year').value;
  state.filters.rating   = document.getElementById('filter-rating').value;
  state.filters.sort     = document.getElementById('filter-sort').value;
  state.pagination.page  = 1;
  loadMovies();
}
function resetFilters() {
  ['filter-genre','filter-language','filter-year','filter-rating','filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  state.filters = { genre:'', language:'', year:'', rating:'', sort:'rating' };
  state.pagination.page = 1;
  loadMovies();
}
function changePage(dir) {
  state.pagination.page = Math.max(1, state.pagination.page + dir);
  loadMovies();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updatePagination(total, page, totalPages) {
  document.getElementById('page-info').textContent = `Page ${page} of ${totalPages || 1} (${total} movies)`;
  document.getElementById('prev-page-btn').disabled = page <= 1;
  document.getElementById('next-page-btn').disabled = page >= (totalPages || 1);
}

async function loadGenresForFilter() {
  try {
    const data = await apiCall('/movies');
    // Just request genres from a separate endpoint if available
    const genreSelect = document.getElementById('filter-genre');
    // Try fetching genres
    const genres = await safeApiCall('/analytics/genre-popularity');
    const genreList = Array.isArray(genres) ? genres : (genres?.genres || genres?.data || []);
    genreList.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.genre_name;
      opt.textContent = g.genre_name;
      genreSelect.appendChild(opt);
    });
  } catch { /* no genres available */ }
}

/* ============================================
   GLOBAL SEARCH
   ============================================ */
async function globalSearch(query) {
  const resultsEl = document.getElementById('search-results');
  if (!query || query.length < 2) { resultsEl.classList.remove('visible'); return; }

  try {
    const data = await apiCall(`/movies/search?q=${encodeURIComponent(query)}&limit=8`);
    const movies = Array.isArray(data) ? data : (data.movies || data.data || []);
    if (!movies.length) { resultsEl.classList.remove('visible'); return; }
    resultsEl.innerHTML = movies.map(m => `
      <div class="search-result-item" onclick="openMovieModal(${m.movie_id}, ${JSON.stringify(m).replace(/"/g,'&quot;')})">
        <div>
          <div class="search-result-title">${escapeHTML(m.title)}</div>
          <div class="search-result-meta">${m.release_year || ''} • ${m.genre_name || ''} • ⭐ ${m.imdb_rating || ''}</div>
        </div>
      </div>`).join('');
    resultsEl.classList.add('visible');
  } catch { resultsEl.classList.remove('visible'); }
}

/* ============================================
   RECOMMENDATIONS
   ============================================ */
async function loadRecommendations() {
  const authBox = document.getElementById('recs-auth-box');
  const grid    = document.getElementById('recs-grid');

  if (!state.user) {
    authBox.style.display = 'block';
    grid.classList.add('hidden');
    return;
  }
  authBox.style.display = 'none';
  grid.classList.remove('hidden');
  grid.innerHTML = '<div class="loading-placeholder large">Generating recommendations…</div>';

  try {
    const data = await apiCall('/recommendations/me');
    const movies = Array.isArray(data) ? data : (data.recommendations || data.movies || data.data || []);
    if (movies.length) {
      renderMoviesGrid(movies, 'recs-grid');
    } else {
      grid.innerHTML = '<div class="auth-required-box glass-card"><span class="big-icon">🎬</span><h3>Rate some movies first!</h3><p>Go to Discover, rate a few films, and we\'ll generate personalized picks for you.</p></div>';
    }
  } catch {
    grid.innerHTML = '<div class="loading-placeholder large">Connect to backend to get recommendations</div>';
  }
}

/* ============================================
   WATCHLIST
   ============================================ */
async function loadWatchlist() {
  const authBox = document.getElementById('watchlist-auth-box');
  const tabs    = document.getElementById('watchlist-tabs');

  if (!state.user) {
    authBox.style.display = 'block';
    tabs.classList.add('hidden');
    return;
  }
  authBox.style.display = 'none';
  tabs.classList.remove('hidden');

  try {
    const data = await apiCall('/users/me/watchlist');
    state.watchlist = Array.isArray(data) ? data : (data.watchlist || data.data || []);
    filterWatchlist('all');
  } catch {
    document.getElementById('watchlist-grid').innerHTML = '<div class="loading-placeholder large">Connect to backend to see watchlist</div>';
  }
}

function filterWatchlist(status) {
  state.watchlistFilter = status;
  document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById(`wl-tab-${status === 'all' ? 'all' : status === 'Plan to Watch' ? 'plan' : status === 'Watching' ? 'watching' : 'completed'}`);
  if (activeTab) activeTab.classList.add('active');

  const filtered = status === 'all' ? state.watchlist : state.watchlist.filter(w => w.watch_status === status);
  renderMoviesGrid(filtered.map(w => ({ ...w, ...w.movie })), 'watchlist-grid');
}

/* ============================================
   ANALYTICS
   ============================================ */
function switchAnalyticsTab(tab) {
  state.analyticsTab = tab;
  document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`atab-${tab}`).classList.add('active');
  document.querySelectorAll('.analytics-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`analytics-${tab}`).classList.add('active');
  loadAnalyticsTab(tab);
}

function loadAnalytics() {
  loadAnalyticsTab(state.analyticsTab);
}

async function loadAnalyticsTab(tab) {
  switch(tab) {
    case 'overview':   loadOverviewAnalytics(); break;
    case 'movies':     loadMoviesTable(); break;
    case 'users':      loadUsersTable(); break;
    case 'genres':     loadGenresTable(); break;
    case 'directors':  loadDirectorsTable(); break;
    case 'watchlist':  loadWatchlistAnalytics(); break;
  }
}

async function loadOverviewAnalytics() {
  try {
    const countryData = await apiCall('/analytics/country-distribution');
    const countries = Array.isArray(countryData) ? countryData : (countryData.countries || countryData.data || []);
    const ctx = document.getElementById('country-chart').getContext('2d');
    if (state.charts.country) state.charts.country.destroy();
    state.charts.country = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: countries.slice(0,10).map(c => c.country || 'Unknown'),
        datasets: [{ label: 'Users', data: countries.slice(0,10).map(c => c.user_count || 0), backgroundColor: 'rgba(124,107,255,0.7)', borderRadius: 6, borderSkipped: false }]
      },
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9fa3be',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#9fa3be',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}}, indexAxis:'y' }
    });
  } catch { renderDemoCountryChart(); }

  // Ratings distribution
  const rCtx = document.getElementById('ratings-dist-chart').getContext('2d');
  if (state.charts.ratingsDist) state.charts.ratingsDist.destroy();
  state.charts.ratingsDist = new Chart(rCtx, {
    type: 'bar',
    data: {
      labels: ['1 ★','2 ★','3 ★','4 ★','5 ★'],
      datasets: [{ label:'Ratings', data:[320,480,1240,3820,4140], backgroundColor:['#ff4757','#ff6b35','#ffd32a','#5cb85c','#2ecc71'], borderRadius:8, borderSkipped:false }]
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9fa3be'},grid:{display:false}},y:{ticks:{color:'#9fa3be'},grid:{color:'rgba(255,255,255,0.05)'}}} }
  });
}

function renderDemoCountryChart() {
  const ctx = document.getElementById('country-chart').getContext('2d');
  if (state.charts.country) state.charts.country.destroy();
  state.charts.country = new Chart(ctx, {
    type:'bar',
    data:{labels:['India','USA','UK','Canada','Germany','France','Australia','Japan','Brazil','South Korea'],datasets:[{label:'Users',data:[380,290,175,140,120,105,98,87,76,65],backgroundColor:'rgba(124,107,255,0.7)',borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#9fa3be',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#9fa3be',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}},indexAxis:'y'}
  });
}

async function loadMoviesTable() {
  const tbody = document.getElementById('movies-table-body');
  try {
    const data = await apiCall('/analytics/top-rated-movies?limit=20');
    const movies = Array.isArray(data) ? data : (data.movies || data.data || []);
    tbody.innerHTML = movies.map((m,i) => `
      <tr>
        <td>${i+1}</td>
        <td style="font-weight:600;cursor:pointer;color:var(--accent-cyan)" onclick="openMovieModal(${m.movie_id})">${escapeHTML(m.title)}</td>
        <td>${escapeHTML(m.genre_name||'—')}</td>
        <td>${escapeHTML(m.director_name||'—')}</td>
        <td><span class="rating-stars-display">${'★'.repeat(Math.round(m.avg_rating||0))}</span> ${parseFloat(m.avg_rating||0).toFixed(2)}</td>
        <td>${m.total_ratings||0}</td>
        <td>⭐ ${m.imdb_rating||'—'}</td>
      </tr>`).join('') || '<tr><td colspan="7" class="loading-placeholder">No data</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-placeholder">Connect to backend</td></tr>';
  }
}

async function loadUsersTable() {
  const tbody = document.getElementById('users-table-body');
  try {
    const data = await apiCall('/analytics/most-active-users?limit=20');
    const users = Array.isArray(data) ? data : (data.users || data.data || []);
    tbody.innerHTML = users.map((u,i) => `
      <tr>
        <td>${i+1}</td>
        <td style="font-weight:600">${escapeHTML(u.first_name+' '+u.last_name)}</td>
        <td style="color:var(--text-secondary);font-size:0.8rem">${escapeHTML(u.email||'')}</td>
        <td>${escapeHTML(u.country||'—')}</td>
        <td>${u.ratings_count||0}</td>
        <td>${u.reviews_count||0}</td>
        <td>${u.watchlist_count||0}</td>
        <td style="color:var(--accent-gold);font-weight:700">${(u.ratings_count||0)+(u.reviews_count||0)+(u.watchlist_count||0)}</td>
      </tr>`).join('') || '<tr><td colspan="8" class="loading-placeholder">No data</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-placeholder">Connect to backend</td></tr>';
  }
}

async function loadGenresTable() {
  const tbody = document.getElementById('genres-table-body');
  try {
    const data = await apiCall('/analytics/genre-popularity');
    const genres = Array.isArray(data) ? data : (data.genres || data.data || []);
    tbody.innerHTML = genres.map(g => `
      <tr>
        <td style="font-weight:600">${escapeHTML(g.genre_name)}</td>
        <td>${g.total_movies||0}</td>
        <td>${parseFloat(g.avg_rating||0).toFixed(2)}</td>
        <td>${g.total_reviews||0}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="loading-placeholder">No data</td></tr>';

    // Genre donut chart
    const ctx = document.getElementById('genre-donut-chart').getContext('2d');
    if (state.charts.genreDonut) state.charts.genreDonut.destroy();
    state.charts.genreDonut = new Chart(ctx, {
      type:'doughnut',
      data:{labels:genres.slice(0,10).map(g=>g.genre_name),datasets:[{data:genres.slice(0,10).map(g=>g.total_movies||0),backgroundColor:genres.slice(0,10).map((_,i)=>`hsla(${i*36},70%,60%,0.8)`),borderWidth:2,borderColor:'#0f1118'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9fa3be',font:{size:10},boxWidth:12},position:'right'}},cutout:'55%'}
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-placeholder">Connect to backend</td></tr>';
  }
}

async function loadDirectorsTable() {
  const tbody = document.getElementById('directors-table-body');
  try {
    const data = await apiCall('/analytics/director-stats');
    const directors = Array.isArray(data) ? data : (data.directors || data.data || []);
    tbody.innerHTML = directors.map((d,i) => `
      <tr>
        <td>${i+1}</td>
        <td style="font-weight:600">${escapeHTML(d.director_name)}</td>
        <td>${escapeHTML(d.country||'—')}</td>
        <td>${d.movie_count||0}</td>
        <td>⭐ ${parseFloat(d.avg_imdb_rating||0).toFixed(1)}</td>
        <td>${parseFloat(d.avg_user_rating||0).toFixed(2)}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="loading-placeholder">No data</td></tr>';
  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Connect to backend</td></tr>';
  }
}

async function loadWatchlistAnalytics() {
  try {
    const data = await apiCall('/analytics/watchlist-analytics');
    const statusData = data.status_distribution || [];
    const topWatchlisted = data.most_watchlisted || [];

    const ctx = document.getElementById('watchlist-status-chart').getContext('2d');
    if (state.charts.watchlistStatus) state.charts.watchlistStatus.destroy();
    state.charts.watchlistStatus = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels:statusData.map(s=>s.watch_status)||['Plan to Watch','Watching','Completed'],
        datasets:[{data:statusData.map(s=>s.count)||[4200,1800,4000],backgroundColor:['#7c6bff','#f5c842','#56c596'],borderWidth:2,borderColor:'#0f1118'}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9fa3be',font:{size:11},boxWidth:12},position:'right'}},cutout:'60%'}
    });

    const el = document.getElementById('most-watchlisted');
    el.innerHTML = '';
    topWatchlisted.slice(0,8).forEach((m,i) => el.appendChild(createRankedItem(i+1, m.title, m.genre_name||'', `${m.watchlist_count||0} saves`)));
  } catch {
    // Demo data
    const ctx = document.getElementById('watchlist-status-chart').getContext('2d');
    if (state.charts.watchlistStatus) state.charts.watchlistStatus.destroy();
    state.charts.watchlistStatus = new Chart(ctx, {
      type:'doughnut',
      data:{labels:['Plan to Watch','Watching','Completed'],datasets:[{data:[4200,1800,4000],backgroundColor:['#7c6bff','#f5c842','#56c596'],borderWidth:2,borderColor:'#0f1118'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#9fa3be',font:{size:11},boxWidth:12},position:'right'}},cutout:'60%'}
    });
    document.getElementById('most-watchlisted').innerHTML = '<p class="loading-placeholder">Connect to backend</p>';
  }
}

/* ============================================
   DATABASE SECTION – SCHEMA INFO
   ============================================ */
const schemaInfo = {
  users: { cols: [
    { name:'user_id', type:'INT', keys:'PK' }, { name:'first_name', type:'VARCHAR(50)', keys:'' },
    { name:'last_name', type:'VARCHAR(50)', keys:'' }, { name:'email', type:'VARCHAR(100)', keys:'UQ' },
    { name:'password', type:'VARCHAR(255)', keys:'' }, { name:'gender', type:'ENUM', keys:'' },
    { name:'date_of_birth', type:'DATE', keys:'' }, { name:'country', type:'VARCHAR(50)', keys:'' },
    { name:'created_at', type:'TIMESTAMP', keys:'' }
  ], desc: 'Stores registered user accounts and profile information.' },
  movies: { cols: [
    { name:'movie_id', type:'INT', keys:'PK' }, { name:'title', type:'VARCHAR(200)', keys:'' },
    { name:'release_year', type:'YEAR', keys:'' }, { name:'duration', type:'INT', keys:'' },
    { name:'language', type:'VARCHAR(50)', keys:'' }, { name:'imdb_rating', type:'DECIMAL(3,1)', keys:'' },
    { name:'description', type:'TEXT', keys:'' }, { name:'poster_url', type:'VARCHAR(500)', keys:'' },
    { name:'age_rating', type:'VARCHAR(10)', keys:'' }, { name:'genre_id', type:'INT', keys:'FK' },
    { name:'director_id', type:'INT', keys:'FK' }, { name:'avg_rating', type:'DECIMAL(3,2)', keys:'' },
    { name:'total_ratings', type:'INT', keys:'' }, { name:'engagement_count', type:'INT', keys:'' }
  ], desc: 'Core movie catalog with metadata, ratings, and media information.' },
  genres: { cols: [
    { name:'genre_id', type:'INT', keys:'PK' }, { name:'genre_name', type:'VARCHAR(50)', keys:'UQ' }
  ], desc: 'Movie genre categories (Action, Drama, Comedy, etc.).' },
  directors: { cols: [
    { name:'director_id', type:'INT', keys:'PK' }, { name:'director_name', type:'VARCHAR(100)', keys:'' },
    { name:'country', type:'VARCHAR(50)', keys:'' }, { name:'birth_date', type:'DATE', keys:'' }
  ], desc: 'Movie directors with biographical information.' },
  actors: { cols: [
    { name:'actor_id', type:'INT', keys:'PK' }, { name:'actor_name', type:'VARCHAR(100)', keys:'' },
    { name:'birth_date', type:'DATE', keys:'' }, { name:'country', type:'VARCHAR(50)', keys:'' }
  ], desc: 'Actors with biographical information.' },
  movie_actors: { cols: [
    { name:'movie_id', type:'INT', keys:'FK' }, { name:'actor_id', type:'INT', keys:'FK' }
  ], desc: 'Junction table for many-to-many relationship between movies and actors.' },
  ratings: { cols: [
    { name:'rating_id', type:'INT', keys:'PK' }, { name:'user_id', type:'INT', keys:'FK' },
    { name:'movie_id', type:'INT', keys:'FK' }, { name:'rating', type:'INT (1-5)', keys:'' },
    { name:'rated_on', type:'TIMESTAMP', keys:'' }
  ], desc: 'User ratings for movies on a 1-5 scale. Enforces one rating per user per movie.' },
  reviews: { cols: [
    { name:'review_id', type:'INT', keys:'PK' }, { name:'user_id', type:'INT', keys:'FK' },
    { name:'movie_id', type:'INT', keys:'FK' }, { name:'review_text', type:'TEXT', keys:'' },
    { name:'review_date', type:'TIMESTAMP', keys:'' }
  ], desc: 'User written reviews for movies.' },
  watchlist: { cols: [
    { name:'watchlist_id', type:'INT', keys:'PK' }, { name:'user_id', type:'INT', keys:'FK' },
    { name:'movie_id', type:'INT', keys:'FK' }, { name:'added_on', type:'TIMESTAMP', keys:'' },
    { name:'watch_status', type:'ENUM', keys:'UQ' }
  ], desc: 'User watchlists tracking movie watch status (Plan to Watch, Watching, Completed).' },
  recommendations: { cols: [
    { name:'recommendation_id', type:'INT', keys:'PK' }, { name:'user_id', type:'INT', keys:'FK' },
    { name:'movie_id', type:'INT', keys:'FK' }, { name:'recommendation_score', type:'DECIMAL(5,2)', keys:'' },
    { name:'recommendation_reason', type:'VARCHAR(200)', keys:'' }, { name:'created_at', type:'TIMESTAMP', keys:'' }
  ], desc: 'Auto-generated movie recommendations per user based on genre preferences and similar users.' }
};

function showTableInfo(tableName) {
  document.querySelectorAll('.schema-table-item').forEach(i => i.classList.remove('active'));
  const items = document.querySelectorAll('.schema-table-item');
  items.forEach(item => { if (item.querySelector('span:nth-child(2)').textContent === tableName) item.classList.add('active'); });

  const info  = schemaInfo[tableName];
  const title = document.getElementById('db-table-title');
  const body  = document.getElementById('db-table-info');
  if (!info) { title.textContent = tableName; body.innerHTML = ''; return; }

  title.textContent = `📊 ${tableName}`;
  body.innerHTML = `
    <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:14px">${info.desc}</p>
    <div class="db-table-columns">
      ${info.cols.map(col => `
        <div class="db-col-item">
          <span class="db-col-name">${col.name}</span>
          <span class="db-col-type">${col.type}</span>
          ${col.keys ? `<span class="db-col-key ${col.keys.toLowerCase()}">${col.keys}</span>` : ''}
        </div>`).join('')}
    </div>`;
}

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

/* ============================================
   UTILITY
   ============================================ */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
