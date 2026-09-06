@echo off
chcp 65001 >nul
title Holo Foil

rem 用預設瀏覽器打開調參台。
rem 這是純本機網頁，不需要伺服器、不需要網路、不會裝任何東西。

start "" "%~dp0index.html"
exit
