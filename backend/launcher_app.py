"""
Launcher Desktop unificado da Central de Agentes SENAI — Avaliador de Bancas TCC (PSOF3).
Empacotado via PyInstaller (--noconsole) em AvaliadorBancasTCC_SENAI.exe.
"""
from __future__ import annotations

import ctypes
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PORTA_PADRAO = 8766
HOST_PADRAO = "127.0.0.1"
URL_CENTRAL = f"http://{HOST_PADRAO}:{PORTA_PADRAO}"


def _aplicar_patch_sem_console_windows() -> None:
    if sys.platform != "win32":
        return

    create_no_window = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
    popen_original = subprocess.Popen

    class _PopenSemConsole(popen_original):  # type: ignore[misc, valid-type]
        def __init__(self, *args, **kwargs):
            if "creationflags" not in kwargs or kwargs["creationflags"] == 0:
                kwargs["creationflags"] = create_no_window
            super().__init__(*args, **kwargs)

    subprocess.Popen = _PopenSemConsole  # type: ignore[misc]


def _configurar_streams_log(raiz_instalacao: Path) -> None:
    pasta_logs = raiz_instalacao / "backend" / "data" / "logs"
    pasta_logs.mkdir(parents=True, exist_ok=True)
    arquivo_log = pasta_logs / "central_bancas_tcc.log"
    stream_log = open(arquivo_log, "a", encoding="utf-8", buffering=1)
    if sys.stdout is None:
        sys.stdout = stream_log
    if sys.stderr is None:
        sys.stderr = stream_log


def _servidor_ja_ativo(url_base: str = URL_CENTRAL) -> bool:
    try:
        with urllib.request.urlopen(f"{url_base}/api/health", timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False


def _aguardar_servidor_pronto(url_base: str = URL_CENTRAL, timeout_s: float = 15.0) -> bool:
    inicio = time.time()
    while time.time() - inicio < timeout_s:
        if _servidor_ja_ativo(url_base):
            return True
        time.sleep(0.2)
    return False


def _localizar_navegador_app() -> str | None:
    candidatos = [
        shutil.which("msedge"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        shutil.which("chrome"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for caminho in candidatos:
        if caminho and Path(caminho).exists():
            return str(caminho)
    return None


def abrir_janela_dedicada(url: str = URL_CENTRAL, raiz: Path | None = None) -> None:
    raiz_base = raiz or Path.cwd()
    pasta_perfil_app = raiz_base / "backend" / "data" / "app_window_profile"
    pasta_perfil_app.mkdir(parents=True, exist_ok=True)

    navegador = _localizar_navegador_app()
    if navegador:
        try:
            startupinfo = None
            if sys.platform == "win32":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 3  # SW_MAXIMIZE

            subprocess.Popen(
                [
                    navegador,
                    f"--app={url}",
                    f"--user-data-dir={pasta_perfil_app}",
                    "--start-maximized",
                    "--new-window",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
                startupinfo=startupinfo,
            )
            return
        except Exception:
            pass
    webbrowser.open(url)


def main() -> int:
    try:
        if sys.platform == "win32":
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
                "SENAI.Ourinhos.AvaliadorBancasTCC.1.0.0"
            )
    except Exception:
        pass

    modo_silencioso = "--background" in sys.argv
    modo_teste_smoke = "--smoke-test" in sys.argv

    _aplicar_patch_sem_console_windows()

    from backend.app.config_manager import obter_raiz_projeto

    raiz = obter_raiz_projeto()
    os.chdir(raiz)
    _configurar_streams_log(raiz)

    if _servidor_ja_ativo(URL_CENTRAL):
        if not modo_silencioso and not modo_teste_smoke:
            abrir_janela_dedicada(URL_CENTRAL, raiz=raiz)
        return 0

    import uvicorn
    from backend.app.main import app

    config = uvicorn.Config(
        app=app,
        host=HOST_PADRAO,
        port=PORTA_PADRAO,
        log_config=None,
        access_log=False,
    )
    servidor = uvicorn.Server(config)

    if modo_teste_smoke:
        def _auto_encerrar() -> None:
            if _aguardar_servidor_pronto(URL_CENTRAL, timeout_s=15.0):
                time.sleep(0.5)
            servidor.should_exit = True

        threading.Thread(target=_auto_encerrar, daemon=True).start()
        servidor.run()
        return 0

    if not modo_silencioso:
        def _abrir_quando_pronto() -> None:
            if _aguardar_servidor_pronto(URL_CENTRAL, timeout_s=15.0):
                abrir_janela_dedicada(URL_CENTRAL, raiz=raiz)

        threading.Thread(target=_abrir_quando_pronto, daemon=True).start()

    servidor.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
