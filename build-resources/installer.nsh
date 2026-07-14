; Custom NSIS macros for Citizen Hub installer

; Before installing: wipe the entire install dir so no stale files from
; previous versions or auto-updater remain. User data lives in %APPDATA%,
; not here, so nothing is lost.
!macro customInstall
  ; Remove all old files before extracting new ones
  RMDir /r "$INSTDIR"
!macroend
