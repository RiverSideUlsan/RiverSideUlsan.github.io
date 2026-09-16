// Guestbook Logic with Supabase & XSS Protection
document.addEventListener('DOMContentLoaded', () => {
  // 1. Supabase 클라이언트 초기화
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

  // 4. 날짜 포맷 함수
  function formatDate(dateString) {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}.${month}.${day} ${hours}:${minutes}`;
    } catch (e) {
      return dateString;
    }
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

  // 6. 글자 수 카운터 업데이트
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      const length = messageInput.value.length;
      charCounter.textContent = `${length} / 500`;
    });
  }

  // 7. 방명록 목록 불러오기 (Read)
  async function loadGuestbook() {
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="guestbook-loading"><div class="spinner"></div>방명록을 불러오는 중입니다...</div>';

    try {
      const { data, error } = await supabase
        .from('guestbook')
        .select('id, nickname, message, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        listContainer.innerHTML = `
          <div class="guestbook-empty">
            <p>아직 작성된 방명록이 없습니다.</p>
            <span>첫 번째 발자국을 남겨보세요! ✨</span>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = data
        .map(
          (item) => `
          <article class="guestbook-card" data-id="${escapeHtml(item.id)}">
            <div class="card-header">
              <span class="card-nickname">${escapeHtml(item.nickname)}</span>
              <time class="card-date" datetime="${escapeHtml(item.created_at)}">
                ${formatDate(item.created_at)}
              </time>
            </div>
            <p class="card-message">${escapeHtml(item.message).replace(/\n/g, '<br>')}</p>
          </article>
        `
        )
        .join('');
    } catch (err) {
      console.error('방명록 로딩 오류:', err);
      listContainer.innerHTML = `
        <div class="guestbook-error">
          <p>방명록을 불러오지 못했습니다.</p>
          <span>${escapeHtml(err.message || '네트워크 상태를 확인해 주세요.')}</span>
        </div>
      `;
    }
  }

  // 8. 방명록 작성 제출 (Create)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nickname = nicknameInput.value.trim();
      const message = messageInput.value.trim();

      // 유효성 검사
      if (!nickname) {
        showStatus('닉네임을 입력해 주세요.', 'error');
        nicknameInput.focus();
        return;
      }
      if (nickname.length > 50) {
        showStatus('닉네임은 최대 50자까지 입력 가능합니다.', 'error');
        nicknameInput.focus();
        return;
      }
      if (!message) {
        showStatus('메시지를 입력해 주세요.', 'error');
        messageInput.focus();
        return;
      }
      if (message.length > 500) {
        showStatus('메시지는 최대 500자까지 입력 가능합니다.', 'error');
        messageInput.focus();
        return;
      }

      // 제출 진행 중 UI 처리
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = '남기는 중...';
      showStatus('방명록을 등록하고 있습니다...', 'info');

      try {
        const { error } = await supabase.from('guestbook').insert([
          {
            nickname: nickname,
            message: message
          }
        ]);

        if (error) throw error;

        // 성공 처리
        form.reset();
        if (charCounter) charCounter.textContent = '0 / 500';
        showStatus('방명록이 성공적으로 등록되었습니다! 감사합니다.', 'success');

        // 목록 새로고침
        await loadGuestbook();
      } catch (err) {
        console.error('방명록 등록 오류:', err);
        showStatus(`등록 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }

  // 새로고침 버튼 핸들러
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadGuestbook();
    });
  }

  // 초기 목록 로드
  loadGuestbook();
});

