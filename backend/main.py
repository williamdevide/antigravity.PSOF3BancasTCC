"""Entrypoint para o servidor FastAPI de Auditoria de Bancas de TCC.
Permite execucao direta via uvicorn (ex: uvicorn main:app) ou via python main.py.
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
