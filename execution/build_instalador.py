"""
Script determinístico da Camada 3 (/execution) para compilar a interface React (Vite)
e gerar o executável desktop Windows (AvaliadorBancasTCC_SENAI.exe).
"""
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys


RAIZ = Path(__file__).resolve().parents[1]


def main() -> int:
    print("🔨 [1/2] Compilando Frontend React + TypeScript + Tailwind CSS (Vite)...")
    pasta_front = RAIZ / "frontend"
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    subprocess.run([npm_cmd, "run", "build"], cwd=str(pasta_front), check=True)
    print("✅ Frontend compilado em frontend/dist!")

    print("📦 [2/2] Gerando lançador executável Windows (AvaliadorBancasTCC_SENAI.exe)...")
    icone = RAIZ / "frontend" / "public" / "favicon.ico"
    cmd_pyinstaller = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--noconsole",
        "--name",
        "AvaliadorBancasTCC_SENAI",
        "--add-data",
        f"{pasta_front / 'dist'}{';' if sys.platform == 'win32' else ':'}frontend/dist",
    ]
    if icone.exists():
        cmd_pyinstaller.extend(["--icon", str(icone)])
    cmd_pyinstaller.append(str(RAIZ / "backend" / "launcher_app.py"))

    subprocess.run(cmd_pyinstaller, cwd=str(RAIZ), check=True)
    exe_gerado = RAIZ / "dist" / "AvaliadorBancasTCC_SENAI.exe"
    pasta_dist_inst = RAIZ / "dist_instalador"
    pasta_dist_inst.mkdir(parents=True, exist_ok=True)
    if exe_gerado.exists():
        destino_final = pasta_dist_inst / "AvaliadorBancasTCC_SENAI.exe"
        shutil.copy2(exe_gerado, destino_final)
        print(f"🎉 Executável gerado com sucesso em: {destino_final}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
