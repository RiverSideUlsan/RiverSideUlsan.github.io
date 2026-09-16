// Enhanced Guestbook Frontend Logic with Supabase & XSS Protection
document.addEventListener('DOMContentLoaded', () => {
  // 1. Supabase 설정 확인
  const config = window.SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey) {
    showStatus('Supabase 설정(config.js)을 찾을 수 없습니다.', 'error');
    return;
  }

  const { createClient } = window.supabase;
  const supabase = createClient(config.url, config.anonKey);

  // 2. DOM 요소 참조
  const form = document.getElementById('guestbook-form');
  const nicknameInput = document.getElementById('nickname');
  const messageInput = document.getElementById('message');
  const charCounter = document.getElementById('char-counter');
  const submitBtn = document.getElementById('submit-btn');
  const listContainer = document.getElementById('guestbook-list');
  const refreshBtn = document.getElementById('refresh-btn');
  const formStatus = document.getElementById('form-status');
  const avatarPreview = document.getElementById('avatar-preview');
  const moodSelector = document.getElementById('mood-selector');
  const statTotalCount = document.getElementById('stat-total-count');
  const feedCountBadge = document.getElementById('feed-count-badge');

  let selectedMood = '🌿 안부';
  const avatarEmojis = ['✍️', '🌿', '☕', '💡', '🎨', '🚀', '🌟', '🍀', '✨', '🌊', '🐱', '🌱'];

  // 3. XSS 방어용 HTML 이스케이프 함수
  function escapeHtml(str) {
    if (!str) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, (m) => map[m]);
  }

  // 4. 상대 시간 계산 함수
  function getRelativeTime(dateString) {
    try {
      const now = new Date();
      const past = new Date(dateString);
      const diffMs = now - past;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return '방금 전';
      if (diffMin < 60) return `${diffMin}분 전`;
      if (diffHour < 24) return `${diffHour}시간 전`;
      if (diffDay < 7) return `${diffDay}일 전`;

      const year = past.getFullYear();
      const month = String(past.getMonth() + 1).padStart(2, '0');
      const day = String(past.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    } catch (e) {
      return dateString;
    }
  }

  // 닉네임 기반 일관된 아바타/색상 생성
  function getAvatarForName(name) {
    if (!name) return { emoji: '✍️', colorClass: 'avatar-c1' };
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const emoji = avatarEmojis[Math.abs(hash) % avatarEmojis.length];
    const colorIndex = (Math.abs(hash) % 5) + 1;
    return { emoji, colorClass: `avatar-c${colorIndex}` };
  }

  // 5. 상태 메시지 표시
  function showStatus(message, type = 'info') {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    if (type === 'success') {
      setTimeout(() => {
        formStatus.textContent = '';
        formStatus.className = 'form-status';
      }, 4000);
    }
  }

  // 6. 무드 태그 선택 처리
  if (moodSelector) {
    moodSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.mood-btn');
      if (!btn) return;
      moodSelector.querySelectorAll('.mood-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = btn.dataset.mood || '🌿 안부';
    });
  }

  // 7. 닉네임 입력 시 실시간 아바타 미리보기 변경
  if (nicknameInput && avatarPreview) {
    nicknameInput.addEventListener('input', () => {
      const name = nicknameInput.value.trim();
      const avatar = getAvatarForName(name);
      avatarPreview.textContent = avatar.emoji;
    });
  }

  // 8. 글자 수 카운터 업데이트
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      const length = messageInput.value.length;
      charCounter.textContent = `${length} / 500`;
      if (length >= 480) {
        charCounter.style.color = '#b93838';
      } else {
        charCounter.style.color = '';
      }
    });
  }

  // 로컬 스토리지 기반 좋아요 토글
  function getLikedIds() {
    try {
      return JSON.parse(localStorage.getItem('guestbook_likes') || '[]');
    } catch (e) {
      return [];
    }
  }

  function toggleLike(cardId, button) {
    const liked = getLikedIds();
    const isLiked = liked.includes(cardId);
    let newLiked;
    if (isLiked) {
      newLiked = liked.filter((id) => id !== cardId);
      button.classList.remove('liked');
    } else {
      newLiked = [...liked, cardId];
      button.classList.add('liked');
      // 하트 애니메이션 효과
      button.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.35)' },
          { transform: 'scale(1)' }
        ],
        { duration: 300, easing: 'ease-out' }
      );
    }
    localStorage.setItem('guestbook_likes', JSON.stringify(newLiked));
  }

  // 9. 스켈레톤 로딩 UI
  function showSkeleton() {
    if (!listContainer) return;
    listContainer.innerHTML = Array(3)
      .fill(0)
      .map(
        () => `
        <div class="gb-card skeleton-card">
          <div class="card-top">
            <div class="skeleton-avatar skeleton-pulse"></div>
            <div class="skeleton-meta">
              <div class="skeleton-line skeleton-pulse" style="width: 80px; height: 16px;"></div>
              <div class="skeleton-line skeleton-pulse" style="width: 50px; height: 12px; margin-top: 6px;"></div>
            </div>
          </div>
          <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 18px; margin-top: 16px;"></div>
          <div class="skeleton-line skeleton-pulse" style="width: 75%; height: 18px; margin-top: 8px;"></div>
        </div>
      `
      )
      .join('');
  }

  // 10. 방명록 목록 불러오기
  async function loadGuestbook() {
    if (!listContainer) return;
    showSkeleton();

    if (refreshBtn) {
      refreshBtn.classList.add('rotating');
    }

    try {
      const { data, error } = await supabase
        .from('guestbook')
        .select('id, nickname, message, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = data ? data.length : 0;
      if (statTotalCount) statTotalCount.textContent = total;
      if (feedCountBadge) feedCountBadge.textContent = `${total} stories`;

      if (!data || data.length === 0) {
        listContainer.innerHTML = `
          <div class="gb-empty-state">
            <div class="empty-icon">🍃</div>
            <h3>아직 작성된 방명록이 없습니다</h3>
            <p>첫 번째 따뜻한 발자국을 남겨주시면 큰 힘이 됩니다!</p>
          </div>
        `;
        return;
      }

      const likedIds = getLikedIds();

      listContainer.innerHTML = data
        .map((item, index) => {
          const avatar = getAvatarForName(item.nickname);
          const relativeTime = getRelativeTime(item.created_at);
          const isLiked = likedIds.includes(item.id);
          const orderNum = String(data.length - index).padStart(2, '0');

          return `
            <article class="gb-card" data-id="${escapeHtml(item.id)}" style="animation-delay: ${index * 0.05}s">
              <div class="card-top">
                <div class="author-info">
                  <div class="card-avatar ${avatar.colorClass}">${avatar.emoji}</div>
                  <div class="meta-texts">
                    <span class="card-author">${escapeHtml(item.nickname)}</span>
                    <time class="card-time" title="${escapeHtml(item.created_at)}">${relativeTime}</time>
                  </div>
                </div>
                <div class="card-right-badge">
                  <span class="card-index">#${orderNum}</span>
                </div>
              </div>

              <div class="card-content">
                <p class="card-body-text">${escapeHtml(item.message).replace(/\n/g, '<br>')}</p>
              </div>

              <div class="card-bottom">
                <div class="card-actions">
                  <button type="button" class="like-btn ${isLiked ? 'liked' : ''}" data-id="${escapeHtml(item.id)}" aria-label="좋아요">
                    <span class="heart-icon">♥</span>
                    <span class="like-label">${isLiked ? '공감됨' : '공감'}</span>
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      // 좋아요 이벤트 바인딩
      listContainer.querySelectorAll('.like-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          toggleLike(id, btn);
          const label = btn.querySelector('.like-label');
          if (label) {
            label.textContent = btn.classList.contains('liked') ? '공감됨' : '공감';
          }
        });
      });
    } catch (err) {
      console.error('방명록 로딩 오류:', err);
      listContainer.innerHTML = `
        <div class="gb-error-state">
          <div class="error-icon">⚠️</div>
          <h3>방명록을 불러오지 못했습니다</h3>
          <p>${escapeHtml(err.message || '네트워크 연결을 확인한 뒤 다시 시도해 주세요.')}</p>
        </div>
      `;
    } finally {
      if (refreshBtn) {
        setTimeout(() => refreshBtn.classList.remove('rotating'), 500);
      }
    }
  }

  // 11. 방명록 등록 제출
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nickname = nicknameInput.value.trim();
      let message = messageInput.value.trim();

      // 유효성 검사
      if (!nickname) {
        showStatus('닉네임을 입력해 주세요.', 'error');
        nicknameInput.focus();
        return;
      }
      if (nickname.length > 50) {
        showStatus('닉네임은 최대 50자까지 가능합니다.', 'error');
        nicknameInput.focus();
        return;
      }
      if (!message) {
        showStatus('메시지를 입력해 주세요.', 'error');
        messageInput.focus();
        return;
      }

      // 무드 태그를 메시지 앞부분에 자연스럽게 결합 (원하는 경우)
      let fullMessage = message;
      if (selectedMood && !message.startsWith('[')) {
        fullMessage = `[${selectedMood}] ${message}`;
      }

      if (fullMessage.length > 500) {
        showStatus('메시지 길이가 500자를 초과했습니다. 조금만 줄여주세요.', 'error');
        messageInput.focus();
        return;
      }

      // 제출 중 UI 처리
      submitBtn.disabled = true;
      const originalHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>남기는 중...</span> <span class="spinner-small"></span>';
      showStatus('발자국을 안전하게 남기고 있습니다...', 'info');

      try {
        const { error } = await supabase.from('guestbook').insert([
          {
            nickname: nickname,
            message: fullMessage
          }
        ]);

        if (error) throw error;

        // 성공 처리
        form.reset();
        if (charCounter) charCounter.textContent = '0 / 500';
        if (avatarPreview) avatarPreview.textContent = '✍️';
        showStatus('소중한 발자국이 등록되었습니다! 감사합니다 ✨', 'success');

        // 목록 새로고침
        await loadGuestbook();
      } catch (err) {
        console.error('방명록 등록 오류:', err);
        showStatus(`등록 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
      }
    });
  }

  // 12. 새로고침 버튼 핸들러
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadGuestbook();
    });
  }

  // 초기 로드
  loadGuestbook();
});
