// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Listen to Auth State changes to switch views automatically
auth.onAuthStateChanged(user => {
  const authSec = document.getElementById('authSection');
  const mainAppSec = document.getElementById('mainAppSection');
  
  if (user) {
    currentUser = {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0],
      handle: '@' + (user.displayName || user.email.split('@')[0]).toLowerCase().replace(/\s+/g, ''),
      bio: 'Exploring and sharing on Sulex.',
      followers: 0,
      email: user.email
    };
    users.me = currentUser;
    
    if (authSec) authSec.style.display = 'none';
    if (mainAppSec) mainAppSec.style.display = 'block';
    
    const avatarEl = document.getElementById('headerUserAvatar');
    if (avatarEl) avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
    
    loadPostsFromFirestore();
  } else {
    if (mainAppSec) mainAppSec.style.display = 'none';
    if (authSec) authSec.style.display = 'flex';
  }
});

// State Store
let isSignUpMode = true;
let currentUser = null;
let currentTheme = 'dark';
let searchQuery = '';

const users = {
  user1: { id: 'user1', name: 'Alex Johnson', handle: '@alexj', bio: 'Tech enthusiast & dev.', followers: 128, isFollowing: false },
  user2: { id: 'user2', name: 'Sarah Connor', handle: '@sconnor', bio: 'Digital creator & artist.', followers: 342, isFollowing: true }
};

let posts = [
  {
    id: 1,
    userId: 'user1',
    timeAgo: '10m ago',
    distanceKm: 0.4,
    isAroundMe: true,
    type: 'text',
    content: 'Is anyone going to the live tech talk nearby today?',
    likes: 3,
    views: 12,
    
    isLiked: false,
    comments: [
      { id: 101, author: 'Sarah Connor', text: 'Yes! I will be there shortly.' }
    ],
    showComments: false
  },
  {
    id: 2,
    userId: 'user2',
    timeAgo: '2h ago',
    distanceKm: 3.2,
    isAroundMe: false,
    type: 'article',
    title: 'Building Interactive Web Interfaces',
    content: 'Clean code structures combined with modular stylesheets make mobile app experiences quick and reliable.',
    views: 45,
    
    likes: 12,
    isLiked: false,
    comments: [],
    showComments: false
  }
];

let reelsList = [
  { id: 201, userId: 'user2', videoUrl: '', caption: 'Creating interactive components with code 🎬' }
];

let selectedFile = null;
let activeType = 'text';
let currentFeedFilter = 'foryou';

// Toast Notification System
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

// Theme Toggle
function toggleTheme() {
  const body = document.body;
  const themeBtn = document.getElementById('themeToggleBtn');

  if (currentTheme === 'dark') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    currentTheme = 'light';
    if (themeBtn) themeBtn.innerText = '☀️ Light Mode';
    showToast('Switched to Light Theme');
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    currentTheme = 'dark';
    if (themeBtn) themeBtn.innerText = '🌙 Dark Mode';
    showToast('Switched to Dark Theme');
  }
}

function showSettingsNotice(settingName) {
  showToast(`${settingName}`);
}

// Search Filter
function handleSearch(event) {
  searchQuery = event.target.value.toLowerCase().trim();
  renderFeed();
}

// Like Functionality
function toggleLike(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  post.isLiked = !post.isLiked;
  post.likes += post.isLiked ? 1 : -1;

  if (post.isLiked) {
    showToast('Liked post');
  } else {
    showToast('Unliked post');
  }

  renderFeed();
}

// Toggle Comment View
function toggleCommentsView(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  post.showComments = !post.showComments;
  renderFeed();
}

// Submit Comment
function submitComment(postId) {
  const inputEl = document.getElementById(`commentInput-${postId}`);
  if (!inputEl || !inputEl.value.trim()) return;

  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const authorName = currentUser ? currentUser.name : (localStorage.getItem('sulex_username') || 'Sulex');

  post.comments.push({
    id: Date.now(),
    author: authorName,
    text: inputEl.value.trim()
  });

  inputEl.value = '';
  showToast('Comment added');
  renderFeed();
}

// Share Function
function sharePost(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const shareData = {
    title: 'Sulex Post',
    text: post.content,
    url: window.location.href
  };

  if (navigator.share) {
    navigator.share(shareData).then(() => {
      showToast('Post shared!');
    }).catch(() => {
      showToast('Link copied to clipboard');
    });
  } else {
    navigator.clipboard.writeText(`${window.location.href}#post-${postId}`);
    showToast('Link copied to clipboard!');
  }
}

// Follow / Toast Action
function toggleFollow(userId) {
  if (!users[userId]) return;
  
  users[userId].isFollowing = !users[userId].isFollowing;
  users[userId].followers += users[userId].isFollowing ? 1 : -1;

  if (users[userId].isFollowing) {
    showToast(`You started toasting ${users[userId].name}`);
  } else {
    showToast(`You stopped toasting ${users[userId].name}`);
  }

  renderFeed();
  const profileSection = document.getElementById('profileSection');
  if (profileSection && profileSection.style.display === 'block') {
    navigateToProfile(userId);
  }
}

// Auth Switch Mode
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;

  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const signUpFields = document.getElementById('signUpFields');
  const submitBtn = document.getElementById('authSubmitBtn');
  const switchPrompt = document.getElementById('switchPromptText');
  const switchBtn = document.getElementById('authSwitchBtn');
  const dividerText = document.getElementById('dividerText');

  if (isSignUpMode) {
    if (title) title.innerHTML = 'Create Your<br>Sulex Account';
    if (subtitle) subtitle.innerHTML = 'Start connecting and sharing.<br>It\'s quick and easy!';
    if (signUpFields) signUpFields.style.display = 'block';
    if (submitBtn) submitBtn.innerText = 'SIGN UP';
    if (dividerText) dividerText.innerText = 'Or sign up with';
    if (switchPrompt) switchPrompt.innerText = 'Already have an account?';
    if (switchBtn) switchBtn.innerText = 'Log In';
  } else {
    if (title) title.innerHTML = 'Welcome Back to<br>Sulex';
    if (subtitle) subtitle.innerHTML = 'Log in to continue sharing with your circle.';
    if (signUpFields) signUpFields.style.display = 'none';
    if (submitBtn) submitBtn.innerText = 'LOG IN';
    if (dividerText) dividerText.innerText = 'Or log in with';
    if (switchPrompt) switchPrompt.innerText = "Don't have an account?";
    if (switchBtn) switchBtn.innerText = 'Sign Up';
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();

  const firstNameField = document.getElementById('firstName');
  const lastNameField = document.getElementById('lastName');
  const firstName = firstNameField ? firstNameField.value : '';
  const lastName = lastNameField ? lastNameField.value : '';

  const fullName = isSignUpMode && (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (localStorage.getItem('sulex_username') || 'Sulex');
  const handle = '@' + fullName.toLowerCase().replace(/\s+/g, '');

  currentUser = {
    id: 'me',
    name: fullName,
    handle: handle,
    bio: 'Exploring and sharing on Sulex.',
    followers: 0
  };

  users.me = currentUser;
  localStorage.setItem('sulex_username', fullName);

  const avatarEl = document.getElementById('headerUserAvatar');
  if (avatarEl) avatarEl.innerText = currentUser.name.charAt(0);
  
  const authSec = document.getElementById('authSection');
  const mainAppSec = document.getElementById('mainAppSection');
  if (authSec) authSec.style.display = 'none';
  if (mainAppSec) mainAppSec.style.display = 'block';

  showToast(`Welcome, ${currentUser.name}!`);
  renderFeed();
}

function socialLogin(provider) {
  currentUser = {
    id: 'me',
    name: 'Sulex User',
    handle: '@sulexuser',
    bio: `Signed in via ${provider}.`,
    followers: 12
  };

  users.me = currentUser;
  localStorage.setItem('sulex_username', currentUser.name);

  const avatarEl = document.getElementById('headerUserAvatar');
  if (avatarEl) avatarEl.innerText = 'S';
  
  const authSec = document.getElementById('authSection');
  const mainAppSec = document.getElementById('mainAppSection');
  if (authSec) authSec.style.display = 'none';
  if (mainAppSec) mainAppSec.style.display = 'block';

  showToast(`Logged in via ${provider}`);
  renderFeed();
}

function logout() {
  currentUser = null;
  const mainAppSec = document.getElementById('mainAppSection');
  const authSec = document.getElementById('authSection');
  if (mainAppSec) mainAppSec.style.display = 'none';
  if (authSec) authSec.style.display = 'flex';
  showToast('Logged out successfully');
}

// --- SKELETON LOADER FUNCTION ---
function renderFeedSkeletons() {
  const stream = document.getElementById('feedStream');
  if (!stream) return;

  const name = localStorage.getItem('sulex_username') || 'Sulex';
  const avatar = localStorage.getItem('sulex_avatar');
  
  const avHtml = avatar 
    ? `<img src="${avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` 
    : name.charAt(0).toUpperCase();

  stream.innerHTML = `
    <div class="post-card">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <div class="avatar-sm" style="display:flex; align-items:center; justify-content:center;">${avHtml}</div>
        <div><strong>${name}</strong></div>
      </div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line" style="width: 60%;"></div>
    </div>
  `.repeat(3);
}

// Render Posts Stream
function renderFeed() {
  const feedStream = document.getElementById('feedStream');
  if (!feedStream) return;

  // Show skeletons featuring your name first while loading
  renderFeedSkeletons();

  setTimeout(() => {
    const filtered = posts.filter(post => {
      const author = users[post.userId] || users.me;

      if (searchQuery) {
        const matchContent = post.content.toLowerCase().includes(searchQuery);
        const matchTitle = post.title ? post.title.toLowerCase().includes(searchQuery) : false;
        const matchAuthor = author.name.toLowerCase().includes(searchQuery);
        if (!matchContent && !matchTitle && !matchAuthor) return false;
      }

      if (currentFeedFilter === 'aroundme') return post.isAroundMe;
      if (currentFeedFilter === 'following') return users[post.userId] && users[post.userId].isFollowing;
      return true;
    });

    if (filtered.length === 0) {
      feedStream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:12px;">No posts found in this feed view.</div>`;
      return;
    }

    const savedName = localStorage.getItem('sulex_username') || 'Sulex';
    const savedAvatar = localStorage.getItem('sulex_avatar');

    feedStream.innerHTML = filtered.map(post => {
      const author = post.userId === 'me' 
        ? { name: savedName, avatar: savedAvatar, isFollowing: false } 
        : (users[post.userId] || users.me);
        
      const avHtml = author.avatar 
        ? `<img src="${author.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` 
        : author.name.charAt(0).toUpperCase();

      return `
        <div class="post-card" id="post-${post.id}">
          <div class="post-card-header">
            <div class="post-user-info" onclick="navigateToProfile('${post.userId}')">
              <div class="avatar-sm" style="display:flex; align-items:center; justify-content:center;">
                ${avHtml}
              </div>
              <div>
                <div class="post-author-name">
                  ${author.name}
                  ${post.distanceKm ? `<span class="distance-badge">📍 ${post.distanceKm} km away</span>` : ''}
                </div>
                <div class="post-meta-sub">${post.timeAgo}</div>
              </div>
            </div>
            ${post.userId !== 'me' ? `
              <button class="btn-follow ${author.isFollowing ? 'following' : ''}" onclick="toggleFollow('${post.userId}')">
                ${author.isFollowing ? 'Toasting' : 'Toast'}
              </button>
            ` : ''}
          </div>

          <div class="post-content-body">
            ${post.title ? `<div class="article-title-heading" style="font-weight:700; font-size:14px; margin-bottom:4px;">${post.title}</div>` : ''}
            ${post.content}
          </div>

          ${post.mediaUrl ? `
            <div class="post-media-box">
              ${post.mediaType === 'image' ? `
                <img src="${post.mediaUrl}" />
              ` : `
                <video src="${post.mediaUrl}" controls></video>
              `}
            </div>` : ''
          }

          <!-- Post Action Controls -->
          <div class="post-actions-bar">
            <button class="action-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
              ${post.isLiked ? '❤️' : '🤍'} ${post.likes} Likes
            </button>
            
            <button class="action-btn" onclick="toggleCommentsView(${post.id})">
              💬 ${post.comments.length} Comments
            </button>
            
            <button class="action-btn" onclick="sharePost(${post.id})">
            <span class="action-btn">👁️ ${post.views} Views</span>
            
              🔗 Share
            </button>
          </div>

          <!-- Comments Drawer -->
          ${post.showComments ? `
            <div class="comments-drawer">
              <div class="comments-list">
                ${post.comments.length === 0 ? '<p style="font-size:11px; color:var(--text-muted);">No comments yet. Be the first!</p>' : ''}
                ${post.comments.map(c => `
                  <div class="comment-bubble">
                    <strong>${c.author}:</strong> ${c.text}
                  </div>
                `).join('')}
              </div>
              <div class="comment-input-box">
                <input type="text" id="commentInput-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') submitComment(${post.id})" />
                <button class="btn-send-comment" onclick="submitComment(${post.id})">Send</button>
              </div>
            </div>
          ` : ''}

        </div>
      `;
    }).join('');
  }, 400);
}

function filterFeed(filter) {
  currentFeedFilter = filter;
  document.querySelectorAll('.feed-tabs .tab-item').forEach(el => el.classList.remove('active'));

  if (filter === 'foryou') {
    const tabEl = document.getElementById('tab-for-you');
    if (tabEl) tabEl.classList.add('active');
  }
  if (filter === 'aroundme') {
    const tabEl = document.getElementById('tab-around-me');
    if (tabEl) tabEl.classList.add('active');
  }
  if (filter === 'following') {
    const tabEl = document.getElementById('tab-following');
    if (tabEl) tabEl.classList.add('active');
  }

  renderFeed();
}

// Render Reels
function renderReels() {
  const container = document.getElementById('reelsContainer');
  if (!container) return;

  const savedName = localStorage.getItem('sulex_username') || 'Sulex';
  const savedAvatar = localStorage.getItem('sulex_avatar');

  container.innerHTML = reelsList.map(reel => {
    const author = reel.userId === 'me' 
      ? { name: savedName, avatar: savedAvatar } 
      : (users[reel.userId] || users.me);
      
    const avHtml = author.avatar 
      ? `<img src="${author.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` 
      : author.name.charAt(0).toUpperCase();

    return `
      <div class="reel-box" style="position:relative; width:100%; height:calc(100vh - 140px); background:#000; border-radius:12px; overflow:hidden; margin-bottom:12px; display:flex; align-items:center; justify-content:center;">
        ${reel.videoUrl ? `<video src="${reel.videoUrl}" controls autoplay loop style="width:100%; height:100%; object-fit:cover;"></video>` : `
          <div style="color:#fff; text-align:center;">Sample Reel Video</div>
        `}
        <div class="reel-overlay" style="position:absolute; bottom:20px; left:16px; right:16px; z-index:10; text-shadow:0 2px 4px rgba(0,0,0,0.8);">
          <div class="post-user-info" onclick="navigateToProfile('${reel.userId}')" style="display:flex; align-items:center; cursor:pointer;">
            <div class="avatar-sm" style="display:flex; align-items:center; justify-content:center;">${avHtml}</div>
            <strong style="margin-left: 6px; color:#fff;">${author.name}</strong>
          </div>
          <p style="font-size: 13px; margin-top: 6px; color:#fff;">${reel.caption}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Navigation Controls
function switchTab(tab) {
  const sections = ['feedSection', 'reelsSection', 'notificationsSection', 'settingsSection', 'profileSection'];
  sections.forEach(sec => {
    const el = document.getElementById(sec);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));

  if (tab === 'home') {
    document.getElementById('feedSection').style.display = 'block';
    document.getElementById('nav-home').classList.add('active');
    renderFeed();
  } else if (tab === 'reels') {
    document.getElementById('reelsSection').style.display = 'block';
    document.getElementById('nav-reels').classList.add('active');
    renderReels();
  } else if (tab === 'notifications') {
    document.getElementById('notificationsSection').style.display = 'block';
    document.getElementById('nav-notifications').classList.add('active');
  } else if (tab === 'settings') {
    document.getElementById('settingsSection').style.display = 'block';
    document.getElementById('nav-settings').classList.add('active');
  }
}

function navigateToProfile(userId) {
  const savedName = localStorage.getItem('sulex_username') || 'Sulex';
  const savedAvatar = localStorage.getItem('sulex_avatar');
  
  const user = userId === 'me' 
    ? { name: savedName, handle: '@' + savedName.toLowerCase().replace(/\s+/g, ''), bio: 'Exploring and sharing on Sulex.', followers: 0, avatar: savedAvatar }
    : (users[userId] || users.me);

  document.getElementById('profileName').innerText = user.name;
  document.getElementById('profileHandle').innerText = user.handle;
  document.getElementById('profileBio').innerText = user.bio;
  
  const profAvatar = document.getElementById('profileAvatar');
  if (user.avatar) {
    profAvatar.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
  } else {
    profAvatar.innerText = user.name.charAt(0).toUpperCase();
  }

  const metricsEl = document.querySelector('.profile-metrics');
  if (metricsEl) {
    metricsEl.innerHTML = `
      <div>
        <span class="metric-num">14</span>
        <span class="metric-lbl">Posts</span>
      </div>
      <div>
        <span class="metric-num" id="profileFollowers">${user.followers || 0}</span>
        <span class="metric-lbl">Toasters</span>
      </div>
      <div>
        <span class="metric-num">56</span>
        <span class="metric-lbl">Toasting</span>
      </div>
    `;
  }

  const actionArea = document.getElementById('profileActionArea');
  if (actionArea) {
    if (userId !== 'me') {
      actionArea.innerHTML = `
        <button class="btn-primary-blue" style="background:${user.isFollowing ? 'var(--bg-input)' : 'var(--accent-blue)'}; color:${user.isFollowing ? 'var(--text-muted)' : '#fff'}" onclick="toggleFollow('${userId}')">
          ${user.isFollowing ? 'Toasting' : 'Toast'}
        </button>
      `;
    } else {
      actionArea.innerHTML = '';
    }
  }

  const sections = ['feedSection', 'reelsSection', 'notificationsSection', 'settingsSection'];
  sections.forEach(sec => {
    const el = document.getElementById(sec);
    if (el) el.style.display = 'none';
  });

  document.getElementById('profileSection').style.display = 'block';
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
}

// Modal Logic
function openCreateModal() {
  document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
  document.getElementById('createModal').style.display = 'none';
  selectedFile = null;
  document.getElementById('previewContainer').style.display = 'none';
}
function triggerFileUpload(acceptType) {
  const input = document.getElementById('mediaFileInput');
  if (!input) return;
  input.accept = acceptType;
  input.click();
}
function handleAuthSubmit(e) {
  e.preventDefault();
  const emailInput = document.getElementById('authEmail');
  const passInput = document.getElementById('authPassword');
  const email = emailInput ? emailInput.value : '';
  const password = passInput ? passInput.value : '';

  if (!email || !password) {
    showToast('Please enter email and password');
    return;
  }

  if (isSignUpMode) {
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => showToast('Account created successfully!'))
      .catch((error) => showToast(error.message));
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .then(() => showToast('Logged in successfully!'))
      .catch((error) => showToast(error.message));
  }
}

function socialLogin(providerName) {
  if (providerName === 'Google') {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(() => showToast('Logged in with Google!'))
      .catch((error) => showToast(error.message));
  }
}

function logout() {
  auth.signOut()
    .then(() => showToast('Logged out successfully'))
    .catch(() => showToast('Error logging out'));
}
// Real-time listener for posts
function loadPostsFromFirestore() {
  db.collection('posts').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (typeof renderFeed === 'function') {
      renderFeed();
    }
  }, (error) => {
    console.error('Error fetching posts: ', error);
  });
}

// Publish post to Firestore
async function handleCreatePost() {
  const captionInput = document.getElementById('postCaption');
  const caption = captionInput ? captionInput.value : '';
  const user = auth.currentUser;

  if (!caption.trim() && !selectedFile) {
    showToast('Please write something or attach media.');
    return;
  }

  try {
    await db.collection('posts').add({
      userId: user ? user.uid : 'me',
      timeAgo: 'Just now',
      distanceKm: 0.5,
      isAroundMe: true,
      type: activeType || 'text',
      content: caption,
      likes: 0,
      views: 1,
      isLiked: false,
      comments: [],
      showComments: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (captionInput) captionInput.value = '';
    closeCreateModal();
    showToast('Post published successfully!');
  } catch (error) {
    console.error('Error adding post: ', error);
    showToast('Failed to publish post.');
  }
}
