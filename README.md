# 어원 단어 교실

영어 단어를 넣으면 어원으로 풀어 주는 수능을 준비하는 고등학생용 어휘 학습 페이지입니다. 선생님이 옆에서 설명해 주는 말투로 7가지를 보여 줍니다.

1. 어근 분석 (접두사·어근·접미사)
2. 문화·역사 배경
3. 같은 어근의 자주 쓰는 파생어 (10개 이내)
4. 파생어마다 수능 지문 수준 예문 1개, 유의어·반의어
5. 단어를 대표하는 그림
6. playphrase.me 영화 장면 링크
7. 파생어로 만든 300자 이내의 웃긴 이야기 (영어(한글 뜻) 형식)

## 사용법

배포된 주소(Vercel)나 GitHub Pages에서 바로 쓰면 됩니다. 학생이 API 키를 넣을 필요가 없습니다.

단어를 찾는 순서는 이렇습니다.

1. 예시 단어 6개(transport, export, predict, visible, construct, inspect)는 페이지에 들어 있습니다.
2. **수능 단어 사전**(`data/words/<단어>.json`)에 있으면 바로 보여 줍니다. AI를 부르지 않으므로 빠르고, 오류와 비용이 없습니다.
3. 사전에 없으면 서버 함수(`api/word.js`)가 AI로 그 자리에서 만듭니다. 같은 단어는 Vercel CDN이 30일 동안 저장해 두고, 학생 브라우저에도 저장됩니다.

## 파일 구성

| 파일 | 하는 일 |
|---|---|
| `index.html` | 화면 전부 (빌드 과정 없음) |
| `prompt.js` | AI에게 보내는 지시문 (수능 준비 고등학생 수준). 화면·서버·사전 스크립트가 같이 씀 |
| `lib/generate.js` | 단어 하나로 어원 카드를 만드는 부분. Gemini(기본) 또는 Claude |
| `api/word.js` | `GET /api/word?w=단어` → 어원 카드 JSON. 단어 하나만 받으므로 다른 용도로 쓸 수 없음 |
| `data/wordlist.txt` | 미리 만들 단어 목록 (한 줄에 한 단어) |
| `data/words/` | 미리 만든 사전. 단어마다 JSON 파일 하나 |
| `scripts/build-dictionary.js` | 목록의 단어로 사전을 만드는 스크립트. 이미 만든 단어는 건너뜀 |
| `.github/workflows/build-dictionary.yml` | 사전을 GitHub에서 매일 이어서 만들어 올리는 설정 |

## 배포 (Vercel, 무료)

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 로그인 → **Add New… → Project** → `Englishstudy` 저장소 **Import**
2. **Settings → Environment Variables**에 AI 키를 넣고 다시 배포합니다.
   - `GEMINI_API_KEY` = [Google AI Studio](https://aistudio.google.com/apikey)에서 만든 키 (무료 등급 가능, 권장)
   - 또는 `ANTHROPIC_API_KEY` = Claude 키 (유료). 이 칸에 Gemini 키(AIza…)를 넣어도 Gemini로 알아서 보냅니다.
3. 배포 주소가 `https://englishstudy.vercel.app`가 아니면 `index.html`의 `BACKEND` 값을 그 주소로 바꿉니다 (GitHub Pages·로컬 파일에서 열 때 쓰는 주소).

선택 환경 변수:

- `GEMINI_MODEL` (기본 `gemini-flash-latest`), `CLAUDE_MODEL` (기본 `claude-sonnet-5-5`)
- `RATE_LIMIT_PER_HOUR` (기본 30): 한 사람(IP)이 한 시간에 새로 만들 수 있는 단어 수
- `ALLOWED_ORIGINS` (기본 `https://kimjungtae-ai.github.io`): Vercel 밖에서 이 서버를 부를 수 있는 사이트, 쉼표로 구분

## 수능 단어 사전 만들기

1. `data/wordlist.txt`에 단어 목록(예: 교육과정 기본 어휘 3,000개)을 한 줄에 하나씩 붙여 넣고 `main`에 올립니다.
2. GitHub 저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 이름 `GEMINI_API_KEY`로 키를 넣습니다.
3. **Actions → 단어 사전 만들기 → Run workflow**를 누릅니다. 한 번에 최대 800개씩 만들고, 그 뒤로도 매일 새벽 3시에 이어서 만듭니다. 무료 등급 하루 한도에 걸리면 거기서 멈췄다가 다음 날 이어 갑니다.
4. 만든 사전은 저장소에 자동으로 올라가고, Vercel이 다시 배포하면 바로 쓰입니다. 선생님이 `data/words/<단어>.json`을 직접 고쳐 검수할 수도 있습니다.

내 컴퓨터에서 돌리려면: `GEMINI_API_KEY=키 LIMIT=100 node scripts/build-dictionary.js`

## 알려진 제약

- 외부 이미지를 불러오지 않으므로 그림은 SVG로 그리고, 실제 사진은 Wikimedia Commons 링크로 연결합니다.
- playphrase.me는 페이지 안에 넣을 수 없어 새 탭 링크로 엽니다. 사이트에 A2 필터가 없어서 짧고 쉬운 표현으로 검색합니다.
