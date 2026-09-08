#!/usr/bin/env bash
# webharvester setup for macOS and Linux.
#
#   ./setup.sh              install the Claude Code plugin
#   ./setup.sh --measure    also install Growser (where available), add a
#                           launcher that loads the all-permissions extension,
#                           and regenerate the guides for that browser
#
# The plugin needs no browser. --measure is only for re-measuring which
# permissions your own browser grants and rebuilding the guides from that.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MARKETPLACE_NAME="webharvester"
MARKETPLACE_SLUG="dsfox-idea/webharvester"  # public repo, used when this script is run outside a clone
PLUGIN="web-harvester@${MARKETPLACE_NAME}"
GROWSER_DMG="https://github.com/dsfox-idea/brave-core/releases/latest/download/Growser-mac-arm64.dmg"

log()  { printf '\033[1;34m[setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[setup]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[setup]\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

install_plugin() {
  have claude || die "Claude Code CLI 'claude' not found. Install it first: https://claude.com/claude-code"
  local source="${MARKETPLACE_SLUG}"
  [ -f "${REPO}/.claude-plugin/marketplace.json" ] && source="${REPO}"
  log "Adding marketplace from ${source}"
  claude plugin marketplace add "${source}" 2>/dev/null || claude plugin marketplace update "${MARKETPLACE_NAME}" || true
  log "Installing ${PLUGIN}"
  claude plugin install "${PLUGIN}" --yes
  log "Plugin installed. It loads as a skill in your next Claude Code session."
}

growser_binary() {
  for p in "/Applications/Growser.app/Contents/MacOS/Growser" "${HOME}/Applications/Growser.app/Contents/MacOS/Growser"; do
    [ -x "$p" ] && { printf '%s' "$p"; return 0; }
  done
  return 1
}

install_growser_mac() {
  if growser_binary >/dev/null; then log "Growser already installed"; return 0; fi
  [ "$(uname -m)" = "arm64" ] || die "growser.org ships macOS only for Apple Silicon; this is $(uname -m). Install Growser manually or run without --measure."
  local dmg mount
  dmg="$(mktemp -d)/Growser.dmg"
  log "Downloading Growser"
  curl -fL --progress-bar "${GROWSER_DMG}" -o "${dmg}"
  mount="$(mktemp -d)"
  log "Mounting and copying Growser.app to /Applications"
  hdiutil attach -nobrowse -quiet -mountpoint "${mount}" "${dmg}"
  trap 'hdiutil detach -quiet "${mount}" 2>/dev/null || true' RETURN
  cp -R "${mount}/Growser.app" "/Applications/" || cp -R "${mount}/Growser.app" "${HOME}/Applications/"
  hdiutil detach -quiet "${mount}" || true
  trap - RETURN
  growser_binary >/dev/null || die "Growser did not install where expected"
}

make_launcher_mac() {
  local bin ext launcher
  bin="$(growser_binary)"
  ext="${REPO}/extension"
  launcher="${HOME}/Applications/Growser (webharvester).command"
  mkdir -p "${HOME}/Applications"
  cat > "${launcher}" <<LAUNCH
#!/usr/bin/env bash
# Starts Growser with the bundled webharvester extension enabled. Quit any
# running Growser first: a second instance on the same profile will not apply
# the flag (single-instance). On a Growser build that does not yet bundle the
# extension, replace --enable-webharvester with --load-extension="${ext}".
exec "${bin}" --enable-webharvester "\$@"
LAUNCH
  chmod +x "${launcher}"
  log "Launcher written: ${launcher}"
  log "Quit Growser, then open that file to run it with the extension loaded."
}

make_launcher_linux() {
  local ext launcher bin
  ext="${REPO}/extension"
  bin="$(command -v growser || command -v growser-browser || true)"
  [ -n "${bin}" ] || { warn "Growser binary not found on PATH; skipping launcher"; return 0; }
  launcher="${REPO}/growser-webharvester.sh"
  cat > "${launcher}" <<LAUNCH
#!/usr/bin/env bash
# On a Growser build without the bundled extension, use --load-extension="${ext}".
exec "${bin}" --enable-webharvester "\$@"
LAUNCH
  chmod +x "${launcher}"
  log "Launcher written: ${launcher}"
}

measure() {
  have node || die "Node.js is required for --measure. Install Node 20+ and retry."
  have npm  || die "npm is required for --measure."
  local os bin
  os="$(uname -s)"
  case "${os}" in
    Darwin) install_growser_mac; bin="$(growser_binary)"; make_launcher_mac ;;
    Linux)  bin="$(command -v growser || command -v growser-browser || true)"
            [ -n "${bin}" ] || die "growser.org has no Linux build. Install a Chromium-based browser and set CHROME_PATH, or skip --measure."
            make_launcher_linux ;;
    *) die "Unsupported OS for --measure: ${os}" ;;
  esac
  log "Installing project dependencies"
  ( cd "${REPO}" && npm install --no-audit --no-fund )
  log "Measuring the browser and regenerating guides"
  ( cd "${REPO}" \
    && npm run build-manifest -- --full \
    && CHROME_PATH="${bin}" HEADED=1 npm run test:live \
    && npm run mark-non-working \
    && npm run build-manifest \
    && npm run build-guides )
  log "Refreshing the installed plugin"
  claude plugin marketplace update "${MARKETPLACE_NAME}" || true
  log "Done. Guides now reflect ${bin}."
}

main() {
  local do_measure=0
  for arg in "$@"; do
    case "${arg}" in
      --measure) do_measure=1 ;;
      -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
      *) die "Unknown argument: ${arg}" ;;
    esac
  done
  install_plugin
  [ "${do_measure}" -eq 1 ] && measure || true
  log "All set."
}

main "$@"
