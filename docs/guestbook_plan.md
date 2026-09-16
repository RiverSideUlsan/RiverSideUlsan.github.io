# 📝 방명록(Guestbook) 기능 개발 계획서

본 문서는 `RiverSideUlsan.github.io` 웹사이트에 **방명록(Guestbook)** 메뉴를 추가하고, 사용자가 입력한 데이터를 **Supabase** 데이터베이스에 안전하게 저장 및 조회하는 기능에 대한 상세 개발 계획서입니다.

---

## 1. 개요 및 목적

* **목적**: 웹사이트 방문자가 자유롭게 방명록 글(닉네임, 메시지)을 작성하고 기존 글 목록을 열람할 수 있는 기능 구현.
* **기술 스택**: HTML5, CSS3, Vanilla JavaScript, Supabase (Database & RLS, JS SDK CDN)
* **호스팅 환경**: GitHub Pages (정적 웹 호스팅)

---

## 2. 보안 및 키 관리 전략 (중요)

GitHub Pages와 같은 정적(Client-side) 호스팅 환경에서는 프론트엔드 코드가 브라우저에 모두 노출되므로, **키 분리 및 데이터베이스 레벨 보안(RLS)**이 필수적입니다.

### 2.1 Supabase 키 관리 원칙
1. **`anon` (공개 키)만 사용**:
   * 프론트엔드(브라우저)에서는 RLS로 권한이 엄격히 제한된 **`anon` Public Key**만 사용합니다.
   * `service_role` (모든 보안을 우회하는 관리자 키)은 **절대로 클라이언트 코드나 Git 저장소에 포함/커밋하지 않습니다.**
2. **설정 파일 분리 및 Git 보호**:
   * 로컬 개발 및 설정 정보를 분리하기 위해 설정 템플릿(`supabase-config.example.js`)을 제공하고, 실제 설정 파일(`supabase-config.js` 또는 `.env`)은 `.gitignore`에 등록하여 민감 정보가 Git에 노출되는 것을 방지합니다.
3. **Database 레벨 보안 (RLS - Row Level Security)**:
   * DB 테이블에 RLS를 활성화하여, `anon` 키로 접근하더라도 사전에 정의된 정책(Policy) 범위 내의 작업만 허용합니다.
   * **조회(SELECT)**: 누구나 공개된 방명록 조회 가능
   * **등록(INSERT)**: 누구나 작성 가능 (단, 글자 수 및 필수값 유효성 검증)
   * **수정(UPDATE) / 삭제(DELETE)**: 일반 클라이언트는 수정/삭제 불가 (비활성화 또는 인증된 관리자만 가능)
4. **프론트엔드 XSS(Cross-Site Scripting) 방어**:
   * 사용자가 입력한 악성 스크립트(HTML/JS)가 브라우저에서 실행되지 않도록 모든 텍스트 출력 시 HTML 엔티티 이스케이프(Sanitization) 처리 적용.

---

## 3. 데이터베이스 설계 (Supabase)

### 3.1 `guestbook` 테이블 스키마
| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` 또는 `UUID` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | 방명록 고유 식별자 |
| `nickname` | `VARCHAR(50)` | NOT NULL | 작성자 닉네임 (1~50자) |
| `message` | `TEXT` | NOT NULL | 방명록 내용 (1~500자) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `now()`, NOT NULL | 작성 일시 |
| `is_public` | `BOOLEAN` | DEFAULT `true`, NOT NULL | 공개 여부 (관리자 검토용) |

### 3.2 SQL 스크립트 계획 (DB 실행용)
```sql
-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.guestbook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_public BOOLEAN NOT NULL DEFAULT true
);

-- 2. RLS 활성화
ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;

-- 3. 조회 정책 (누구나 공개된 글 조회 가능)
CREATE POLICY "Allow public read access"
ON public.guestbook
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- 4. 등록 정책 (누구나 글 작성 가능, 내용 검증 포함)
CREATE POLICY "Allow public insert access"
ON public.guestbook
FOR INSERT
TO anon, authenticated
WITH CHECK (
    char_length(trim(nickname)) > 0 AND char_length(nickname) <= 50 AND
    char_length(trim(message)) > 0 AND char_length(message) <= 500
);
```

---

## 4. UI 및 페이지 구성 계획

### 4.1 네비게이션 메뉴 업데이트
* 대상 파일: `index.html`, `about.html`, `projects.html`, `blank.html`, 신규 `guestbook.html`
* 네비게이션 바에 **`방명록`** 메뉴 링크 추가 (`<a href="guestbook.html">방명록</a>`)

### 4.2 방명록 페이지 (`guestbook.html`) 화면 구성
1. **헤더 / 네비게이션**: 기존 사이트와 일관된 상단 네비게이션
2. **방명록 작성 영역 (Input Form)**:
   * 닉네임 입력란 (`<input type="text" maxlength="50">`)
   * 메시지 입력란 (`<textarea maxlength="500">`)
   * 남은 글자 수 카운터 및 유효성 검사 안내
   * 등록 버튼 (`<button type="submit">남기기</button>`)
   * 작성 중 로딩 인디케이터 (스피너 또는 비활성화 상태)
3. **방명록 목록 영역 (List Section)**:
   * 작성일시 역순(최신순) 정렬 표시
   * 각 아이템: 닉네임, 작성시간(예: `2026.09.16 14:30`), 내용
   * 빈 상태(Empty state) 안내 문구 ("첫 번째 방명록을 남겨보세요!")
   * 목록 새로고침 버튼 또는 실시간 반영(Realtime/Fetch)
4. **푸터**: 기존 공통 푸터

### 4.3 스타일링 (`style.css` 확장)
* 기존 사이트의 다크/미니멀 테마 및 타이포그래피 스타일 계승
* 반응형(모바일, 태블릿, 데스크톱) 폼 및 리스트 카드 레이아웃 적용

---

## 5. 프론트엔드 연동 계획 (JavaScript)

### 5.1 파일 구조
```
RiverSideUlsan.github.io/
├── docs/
│   └── guestbook_plan.md      # 본 개발 계획서
├── assets/
│   └── ...
├── config.example.js          # Supabase 환경설정 템플릿 (공개용)
├── config.js                  # 실제 키 설정 파일 (.gitignore 처리)
├── guestbook.html             # 방명록 페이지
├── guestbook.js               # 방명록 프론트엔드 비즈니스 로직
├── index.html                 # 네비게이션 메뉴 업데이트
├── about.html                 # 네비게이션 메뉴 업데이트
├── projects.html              # 네비게이션 메뉴 업데이트
├── blank.html                 # 네비게이션 메뉴 업데이트
├── style.css                  # 방명록 UI 스타일 추가
└── .gitignore                 # 민감 설정 파일 제외 규칙
```

### 5.2 주요 스크립트 기능 (`guestbook.js`)
1. **Supabase 클라이언트 초기화**:
   * CDN(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)을 통한 라이브러리 로드
   * 프로젝트 URL 및 `anon` Key 연동
2. **데이터 조회 (`fetchGuestbook`)**:
   * `supabase.from('guestbook').select('*').order('created_at', { ascending: false })`
   * 조회 결과 렌더링 및 XSS 방어 처리 (Text escaping)
3. **데이터 등록 (`submitGuestbook`)**:
   * 공백 및 유효성 검사 (닉네임/메시지 필수 입력)
   * `supabase.from('guestbook').insert([{ nickname, message }])`
   * 등록 성공 시 폼 리셋 및 목록 즉시 갱신
   * 중복 제출 방지 (버튼 비활성화 및 로딩 표시)
4. **에러 핸들링**:
   * 네트워크 에러 또는 전송 실패 시 사용자 친화적 에러 메시지 알림

---

## 6. 단계별 개발 및 검증 절차

```
[1단계] 계획 수립 및 검토 (현재 단계)
   ↓
[2단계] Supabase DB 테이블 생성 및 RLS 정책 적용
   ↓
[3단계] 보안 파일 분리 및 .gitignore 설정
   ↓
[4단계] guestbook.html / guestbook.js / style.css 작성 및 메뉴 링크 연결
   ↓
[5단계] 프론트엔드 ↔ Supabase 통신 및 XSS/RLS 보안 테스트
   ↓
[6단계] 최종 검증 및 문서 업데이트
```

---

## 7. 오픈 질문 및 사전 확인 사항
1. 방명록 작성 시 사용자의 **비밀번호(또는 수정/삭제 권한)** 기능이 필요한지, 아니면 **누구나 글을 남기고 읽기만 가능한 자유 방명록 형태**인지 확인이 필요합니다. (기본 계획: 자유 방명록 형태)
2. Supabase 테이블 생성 시 직접 Supabase MCP를 통해 생성할지, 또는 제공되는 SQL을 관리자 콘솔에서 실행하실지 결정할 수 있습니다.

