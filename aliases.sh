# marp-ppt-kit — 셸 단축 명령 (선택)
# bash·zsh / Linux·macOS·WSL·Git Bash 에서 동작. (Windows 네이티브 PowerShell/cmd는 미지원 — WSL/Git Bash 사용)
#
# 사용법: ~/.bashrc (또는 ~/.zshrc) 에 아래 한 줄 추가 후 새 셸 열기
#     source /클론한_경로/marp-ppt-kit/aliases.sh
# → ppt · pv · po · use · deck · pptime + 덱·테마 Tab 자동완성(bash)을 쓸 수 있다.

# 이 파일 위치 = 레포 루트 (하드코딩 경로 없이 bash·zsh 모두 자동감지)
if [ -n "${BASH_SOURCE:-}" ]; then
  _ppt_self="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  _ppt_self="$(eval 'printf %s "${(%):-%x}"')"
else
  _ppt_self="$0"
fi
PPT_ROOT="$(cd "$(dirname "$_ppt_self")" >/dev/null 2>&1 && pwd)"
unset _ppt_self

ppt()  { node "$PPT_ROOT/build.mjs" "$@"; }                       # 빌드: ppt <덱> [테마|pdf|pptx|png|all]   예: ppt example editorial
pv()   { case "$*" in *--port=*) ppt "$@" --serve --no-open;; *) ppt "$@" --serve --port=1122 --no-open;; esac; }  # 라이브 뷰어(새창 안 띄움): pv <덱> [테마]
use()  { echo "$1" > "$PPT_ROOT/decks/.active" && echo "활성 덱 → $1"; }                # 활성 덱 지정
deck() { cat "$PPT_ROOT/decks/.active" 2>/dev/null || echo "(활성 덱 없음 — use <덱>)"; } # 현재 활성 덱

pptime() {                                                        # 대본(notes.md) 기반 예상 발표시간
  local f="$PPT_ROOT/decks/$1/notes.md"
  [ -f "$f" ] || { echo "대본 없음: decks/$1/notes.md (먼저 /notes 로 작성)"; return 1; }
  local n; n=$(sed '/^#/d;/^>/d' "$f" | tr -d '[:space:]' | wc -m)
  awk -v c="$n" -v d="$1" 'BEGIN{m=c/330; printf "🎤 %s 대본: %d자 → 예상 %d분 %02d초 (330자/분)\n", d, c, int(m), (m-int(m))*60}'
}

po() {                                                            # 빌드된 dist/<덱>[.테마].html 을 OS 기본으로 열기: po <덱> [테마]
  local f="$PPT_ROOT/dist/$1${2:+.$2}.html"
  [ -f "$f" ] || { echo "없음: dist/$1${2:+.$2}.html (먼저 ppt $1 ${2:-} 로 빌드)"; return 1; }
  case "$(uname -sr 2>/dev/null)" in
    *icrosoft*|*WSL*)     explorer.exe "$(wslpath -w "$f")" ;;    # WSL → Windows 브라우저
    Darwin*)              open "$f" ;;                            # macOS
    MINGW*|MSYS*|CYGWIN*) start "" "$f" ;;                        # Git Bash / MSYS
    *)                    xdg-open "$f" ;;                        # Linux
  esac
}

# Tab 자동완성 (bash 전용; zsh는 함수만)
if [ -n "${BASH_VERSION:-}" ]; then
  _ppt_decklist()  { ( cd "$PPT_ROOT/decks" 2>/dev/null && find . -type d -name slides 2>/dev/null | sed 's#/slides$##; s#^\./##'; echo all ); }
  _ppt_themelist() { ( cd "$PPT_ROOT/themes" 2>/dev/null && ls *.css 2>/dev/null | grep -v '^base\.css$' | sed 's/\.css$//'; ); }
  _ppt_decks() { COMPREPLY=( $(compgen -W "$(_ppt_decklist)" -- "${COMP_WORDS[COMP_CWORD]}") ); }
  _ppt_dt() {
    if [ "$COMP_CWORD" -eq 1 ]; then
      COMPREPLY=( $(compgen -W "$(_ppt_decklist)" -- "${COMP_WORDS[COMP_CWORD]}") )
    else
      COMPREPLY=( $(compgen -W "$(_ppt_themelist) pdf pptx png html all" -- "${COMP_WORDS[COMP_CWORD]}") )
    fi
  }
  complete -F _ppt_decks use pptime
  complete -F _ppt_dt    ppt pv po
fi
