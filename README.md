# 어원 단어 교실

영어 단어를 넣으면 어원으로 풀어 주는 중학생용 어휘 학습 페이지입니다. 선생님이 옆에서 설명해 주는 말투로 7가지를 보여 줍니다.

1. 어근 분석 (접두사·어근·접미사)
2. 문화·역사 배경
3. 같은 어근의 자주 쓰는 파생어 (10개 이내)
4. 파생어마다 A2 수준 예문 1개
5. 단어를 대표하는 그림
6. playphrase.me 영화 장면 링크
7. 파생어로 만든 300자 이내의 웃긴 이야기 (영어(한글 뜻) 형식)

## 사용법

배포된 주소(Vercel)나 GitHub Pages에서 바로 쓰면 됩니다. API 키를 넣을 필요가 없습니다.

- 예시 단어 6개(transport, export, predict, visible, construct, inspect)는 페이지에 들어 있어 어디서나 보입니다.
- 그 밖의 단어는 Claude가 즉석에서 만듭니다.
  - Vercel·GitHub Pages에서 열면 이 저장소의 서버 함수(`api/word.js`)가 Claude를 부릅니다. API 키는 Vercel 환경 변수에만 있고 브라우저로는 나가지 않습니다.
  - claude.ai Artifact로 열면 보는 사람의 Claude 계정으로 만듭니다(`window.claude` 의 `sample` 기능).
- 같은 단어는 Vercel CDN이 30일 동안 저장해 두었다가 바로 돌려줍니다. 학생 여럿이 같은 단어를 찾아도 Claude 비용은 한 번만 듭니다.

## 파일 구성

| 파일 | 하는 일 |
|---|---|
| `index.html` | 화면 전부 (빌드 과정 없음) |
| `prompt.js` | Claude에게 보내는 지시문. 화면과 서버가 같이 씀 |
| `api/word.js` | `GET /api/word?w=단어` → 어원 카드 JSON. 단어 하나만 받으므로 다른 용도로 쓸 수 없음 |
| `vercel.json` | 서버 함수가 최대 120초까지 기다리게 하는 설정 |

## 배포 (Vercel, 무료)

처음 한 번만 하면, 그다음부터는 `main`에 올릴 때마다 자동으로 다시 배포됩니다.

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 로그인 → **Add New… → Project** → `Englishstudy` 저장소 **Import**
2. **Environment Variables**에 `ANTHROPIC_API_KEY` = [Anthropic Console](https://console.anthropic.com/settings/keys)에서 만든 키 → **Deploy**
3. 배포 주소가 `https://englishstudy.vercel.app`가 아니면 `index.html`의 `BACKEND` 값을 그 주소로 바꿉니다 (GitHub Pages·로컬 파일에서 열 때 쓰는 주소).
4. [Anthropic Console → Limits](https://console.anthropic.com/settings/limits)에서 월 사용 한도를 걸어 두면, 누가 많이 써도 그 이상은 청구되지 않습니다.

선택 환경 변수:

- `RATE_LIMIT_PER_HOUR` (기본 30): 한 사람(IP)이 한 시간에 새로 만들 수 있는 단어 수
- `ALLOWED_ORIGINS` (기본 `https://kimjungtae-ai.github.io`): Vercel 밖에서 이 서버를 부를 수 있는 사이트, 쉼표로 구분

## 알려진 제약

- 외부 이미지를 불러오지 않으므로 그림은 SVG로 그리고, 실제 사진은 Wikimedia Commons 링크로 연결합니다.
- playphrase.me는 페이지 안에 넣을 수 없어 새 탭 링크로 엽니다. 사이트에 A2 필터가 없어서 짧고 쉬운 표현으로 검색합니다.
