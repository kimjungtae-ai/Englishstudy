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

`index.html`을 브라우저로 열면 됩니다. 빌드 과정이 없는 HTML 파일 하나입니다.

- 예시 단어 6개(transport, export, predict, visible, construct, inspect)는 페이지에 들어 있어 어디서나 보입니다.
- 그 밖의 단어는 Claude가 즉석에서 만듭니다.
  - claude.ai Artifact로 열면 보는 사람의 Claude 계정으로 만듭니다(`window.claude` 의 `sample` 기능).
  - GitHub Pages나 로컬 파일로 열면 검색창 아래에 "Claude API 키 넣기" 칸이 나옵니다. [Anthropic Console](https://console.anthropic.com/settings/keys)에서 만든 키를 넣으면 그 키로 만듭니다. 키는 그 브라우저의 localStorage에만 저장되고 Anthropic API로만 보내집니다. 요금이 키 주인에게 청구되므로 학생 기기·공용 컴퓨터에는 넣지 마세요.

## 알려진 제약

- 외부 이미지를 불러오지 않으므로 그림은 SVG로 그리고, 실제 사진은 Wikimedia Commons 링크로 연결합니다.
- playphrase.me는 페이지 안에 넣을 수 없어 새 탭 링크로 엽니다. 사이트에 A2 필터가 없어서 짧고 쉬운 표현으로 검색합니다.
