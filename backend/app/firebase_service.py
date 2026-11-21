"""
Serviço de persistência e sincronização direta com o Google Cloud Firestore (Firebase)
utilizando as credenciais do arquivo .env (FIREBASE_projectId e FIREBASE_API_KEY) via REST API v1.
"""
from __future__ import annotations

from datetime import datetime
import json
import os
from typing import Any
from urllib.parse import quote
from fastapi import HTTPException
import httpx

from .config_manager import ler_env_bruto
from .models import AvaliacaoGrupoModel


COLECAO_FIRESTORE = "psof3_avaliacoes_tcc"
COLECAO_DOCENTES_AUTORIZADOS = "psof3_docentes_autorizados"
EMAIL_PROFESSOR_TITULAR = "williamdevide@gmail.com"
EMAILS_CONVIDADOS_PRE_AUTORIZADOS = frozenset(
    {
        "edivan.andrade2025@gmail.com",
        "joaopaulooliveiira@hotmail.com",
    }
)


def extrair_bearer_token(auth_header: str | None) -> str | None:
    """Extrai o JWT Bearer token do cabeçalho Authorization."""
    if not auth_header:
        return None
    partes = auth_header.strip().split(" ", 1)
    if len(partes) == 2 and partes[0].lower() == "bearer" and partes[1].strip():
        return partes[1].strip()
    return None


def verificar_id_token_firebase(id_token: str) -> dict[str, Any]:
    """Valida um Firebase ID Token via Identity Toolkit API e retorna o perfil autenticado."""
    _, api_key = obter_credenciais_firebase()
    if not api_key:
        raise HTTPException(status_code=500, detail="FIREBASE_API_KEY ausente no servidor.")

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}"
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json={"idToken": id_token})
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Falha ao validar token no Firebase Auth: {exc}",
        ) from exc

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Sessão Firebase inválida ou expirada.")

    users = (resp.json() or {}).get("users") or []
    if not users:
        raise HTTPException(status_code=401, detail="Usuário Firebase não encontrado.")

    usuario = users[0]
    email = str(usuario.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Conta autenticada sem endereço de e-mail válido.")
    return usuario


def verificar_docente_autorizado_firestore(email: str, id_token: str) -> bool:
    """
    Verifica na coleção `psof3_docentes_autorizados` se o docente está autorizado.
    Convidados pré-autorizados (Edivan e João) também são aceitos quando ainda não houver
    documento explícito; se houver documento com status diferente de 'autorizado', nega acesso.
    """
    email_limpo = email.strip().lower()
    if not email_limpo:
        return False

    project_id, api_key = obter_credenciais_firebase()
    if not project_id or not api_key:
        return email_limpo in EMAILS_CONVIDADOS_PRE_AUTORIZADOS

    doc_id = quote(email_limpo, safe="")
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        f"/databases/(default)/documents/{COLECAO_DOCENTES_AUTORIZADOS}/{doc_id}?key={api_key}"
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers={"Authorization": f"Bearer {id_token}"})
        if resp.status_code == 200:
            fields = (resp.json() or {}).get("fields") or {}
            status_val = _converter_de_firestore(fields.get("status", {}))
            return str(status_val or "").strip().lower() == "autorizado"
        if resp.status_code == 404:
            return email_limpo in EMAILS_CONVIDADOS_PRE_AUTORIZADOS
        return False
    except Exception:
        return False


def validar_permissao_docente_backend(
    auth_header: str | None,
    exigir_titular: bool = False,
) -> tuple[str | None, dict[str, Any] | None]:
    """
    Valida token Bearer quando presente e aplica controle de autorização quando
    EXIGIR_AUTH_FIREBASE_BACKEND='true' estiver configurada no .env / ambiente:
      - Titular: williamdevide@gmail.com com emailVerified == True
      - Convidado: autorizado em psof3_docentes_autorizados ou pré-autorizado
    """
    token = extrair_bearer_token(auth_header)
    raw_env = ler_env_bruto()
    exigir_auth = (
        os.environ.get("EXIGIR_AUTH_FIREBASE_BACKEND", raw_env.get("EXIGIR_AUTH_FIREBASE_BACKEND", ""))
        .strip()
        .lower()
        == "true"
    )

    if not token:
        if exigir_auth:
            raise HTTPException(
                status_code=401,
                detail="Autenticação de professor obrigatória.",
            )
        return None, None

    usuario = verificar_id_token_firebase(token)
    email = str(usuario.get("email") or "").strip().lower()
    email_verificado = bool(usuario.get("emailVerified"))
    eh_titular = email == EMAIL_PROFESSOR_TITULAR and email_verificado

    if exigir_titular:
        if not eh_titular:
            raise HTTPException(
                status_code=403,
                detail=f"Ação exclusiva do Professor Titular ({EMAIL_PROFESSOR_TITULAR}).",
            )
        return token, usuario

    if eh_titular:
        return token, usuario

    if email == EMAIL_PROFESSOR_TITULAR and not email_verificado:
        raise HTTPException(
            status_code=403,
            detail="A conta do Professor Titular precisa estar com o e-mail verificado.",
        )

    if not verificar_docente_autorizado_firestore(email, token):
        raise HTTPException(
            status_code=403,
            detail=f"Acesso aguardando autorização do Professor Titular ({EMAIL_PROFESSOR_TITULAR}).",
        )
    return token, usuario


def _converter_valor_firestore(val: Any) -> dict[str, Any]:
    """Converte um valor nativo Python para o formato tipado da API REST do Firestore."""
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int) and not isinstance(val, bool):
        return {"integerValue": str(val)}
    if isinstance(val, float):
        return {"doubleValue": val}
    if isinstance(val, str):
        return {"stringValue": val}
    if isinstance(val, list):
        return {
            "arrayValue": {
                "values": [_converter_valor_firestore(item) for item in val]
            }
        }
    if isinstance(val, dict):
        fields = {str(k): _converter_valor_firestore(v) for k, v in val.items()}
        return {"mapValue": {"fields": fields}}
    return {"stringValue": str(val)}


def _converter_de_firestore(field_obj: dict[str, Any]) -> Any:
    """Converte um campo tipado da API REST do Firestore de volta para Python."""
    if "nullValue" in field_obj:
        return None
    if "booleanValue" in field_obj:
        return bool(field_obj["booleanValue"])
    if "integerValue" in field_obj:
        return int(field_obj["integerValue"])
    if "doubleValue" in field_obj:
        return float(field_obj["doubleValue"])
    if "stringValue" in field_obj:
        return str(field_obj["stringValue"])
    if "arrayValue" in field_obj:
        vals = field_obj["arrayValue"].get("values", [])
        return [_converter_de_firestore(v) for v in vals]
    if "mapValue" in field_obj:
        fields = field_obj["mapValue"].get("fields", {})
        return {k: _converter_de_firestore(v) for k, v in fields.items()}
    return None


def obter_credenciais_firebase() -> tuple[str, str]:
    raw = ler_env_bruto()
    project_id = raw.get("FIREBASE_projectId", raw.get("FIREBASE_PROJECT_ID", "")).strip()
    api_key = raw.get("FIREBASE_API_KEY", "").strip()
    return project_id, api_key


def sincronizar_avaliacao_firestore(
    avaliacao: AvaliacaoGrupoModel,
    id_token: str | None = None,
) -> tuple[bool, str]:
    """
    Salva/atualiza o documento da avaliação de um grupo diretamente na coleção
    `psof3_avaliacoes_tcc` do Firebase Firestore configurado no `.env`, autenticando com Bearer token quando disponível.
    """
    project_id, api_key = obter_credenciais_firebase()
    if not project_id or not api_key:
        return False, "Credenciais FIREBASE_projectId ou FIREBASE_API_KEY ausentes no .env."

    doc_id = avaliacao.id
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        f"/databases/(default)/documents/{COLECAO_FIRESTORE}/{doc_id}?key={api_key}"
    )

    agora = datetime.now().isoformat(timespec="seconds")
    avaliacao.sincronizado_firebase = True
    avaliacao.firebase_sync_em = agora

    dados_dict = avaliacao.model_dump()
    # Também salvamos o JSON serializado compacto para restauração 100% fiel
    payload_firestore = {
        "fields": {
            "id": _converter_valor_firestore(avaliacao.id),
            "turma": _converter_valor_firestore(avaliacao.turma),
            "grupo": _converter_valor_firestore(avaliacao.grupo),
            "projeto": _converter_valor_firestore(avaliacao.projeto),
            "tema": _converter_valor_firestore(avaliacao.tema),
            "data_banca": _converter_valor_firestore(avaliacao.data_banca),
            "horario": _converter_valor_firestore(avaliacao.horario),
            "integrantes": _converter_valor_firestore(avaliacao.integrantes),
            "entregue_na_pasta": _converter_valor_firestore(avaliacao.entregue_na_pasta),
            "status_avaliacao": _converter_valor_firestore(avaliacao.status_avaliacao),
            "banca_realizada": _converter_valor_firestore(bool(avaliacao.banca_realizada)),
            "avaliador": _converter_valor_firestore(avaliacao.avaliador),
            "p1_total": _converter_valor_firestore(avaliacao.p1_total),
            "p2_total": _converter_valor_firestore(avaliacao.p2_total),
            "p3_grupo_base": _converter_valor_firestore(avaliacao.p3_grupo_base),
            "media_nota_final_grupo": _converter_valor_firestore(avaliacao.media_nota_final_grupo),
            "status_liberacao_nota": _converter_valor_firestore(avaliacao.status_liberacao_nota),
            "adiamento_data_futura": _converter_valor_firestore(avaliacao.adiamento_data_futura.model_dump()),
            "revisao_pos_banca": _converter_valor_firestore(avaliacao.revisao_pos_banca.model_dump()),
            "parecer_tecnico": _converter_valor_firestore(avaliacao.parecer_tecnico),
            "atualizado_em": _converter_valor_firestore(agora),
            "payload_json": _converter_valor_firestore(json.dumps(dados_dict, ensure_ascii=False)),
        }
    }

    headers = {"Authorization": f"Bearer {id_token}"} if id_token else {}
    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.patch(url, json=payload_firestore, headers=headers)
            if resp.status_code in (200, 201):
                return True, f"Sincronizado com sucesso no Firebase ({project_id}/{COLECAO_FIRESTORE}/{doc_id})."
            if resp.status_code == 403:
                return (
                    False,
                    f"Salvo localmente em backend/data/avaliacoes.json. No Firebase ({project_id}), a coleção '{COLECAO_FIRESTORE}' exige autenticação do Professor Titular (HTTP 403).",
                )
            return False, f"Firestore retornou HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        return False, f"Falha de conexão com Firebase Firestore: {exc}"


def listar_avaliacoes_firestore(id_token: str | None = None) -> tuple[bool, dict[str, dict[str, Any]], str]:
    """Busca todos os documentos salvos na coleção `psof3_avaliacoes_tcc` do Firebase Firestore."""
    project_id, api_key = obter_credenciais_firebase()
    if not project_id or not api_key:
        return False, {}, "Credenciais Firebase ausentes no .env."

    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}"
        f"/databases/(default)/documents/{COLECAO_FIRESTORE}?pageSize=100&key={api_key}"
    )

    headers = {"Authorization": f"Bearer {id_token}"} if id_token else {}
    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code != 200:
                return False, {}, f"HTTP {resp.status_code}: {resp.text[:200]}"
            data = resp.json()
            docs = data.get("documents", [])
            resultado: dict[str, dict[str, Any]] = {}
            for doc in docs:
                fields = doc.get("fields", {})
                doc_id = _converter_de_firestore(fields.get("id", {}))
                raw_json = _converter_de_firestore(fields.get("payload_json", {}))
                if doc_id and raw_json:
                    try:
                        resultado[str(doc_id)] = json.loads(raw_json)
                    except Exception:
                        pass
            return True, resultado, f"{len(resultado)} avaliação(ões) carregada(s) do Firebase Firestore."
    except Exception as exc:
        return False, {}, f"Erro ao consultar Firestore: {exc}"
