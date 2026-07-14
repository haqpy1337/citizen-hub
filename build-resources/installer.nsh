; Custom NSIS macros for Citizen Hub installer

; During uninstall: wipe the entire install dir so no stale files from
; the auto-updater remain. User data lives in %APPDATA%, not here.
!macro customUninstall
  RMDir /r "$INSTDIR"
!macroend
