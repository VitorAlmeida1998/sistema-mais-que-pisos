"""Testes: autenticação e autorização por papel."""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import get_auth_header


def test_login_sucesso(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "senha": "senha123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_senha_errada(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "senha": "errada"})
    assert resp.status_code == 401


def test_login_email_inexistente(client):
    resp = client.post("/api/v1/auth/login", json={"email": "nao@existe.com", "senha": "qualquer"})
    assert resp.status_code == 401


def test_refresh_token(client, admin_user):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "senha": "senha123"})
    refresh = resp.json()["refresh_token"]
    resp2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp2.status_code == 200
    assert "access_token" in resp2.json()


def test_acesso_sem_token_retorna_403(client):
    resp = client.get("/api/v1/instaladores")
    assert resp.status_code in (401, 403)


def test_visualizador_nao_pode_criar_instalador(client, db):
    from app.models.usuario import Usuario, PapelUsuario
    from app.utils.auth import hash_senha

    viz = Usuario(
        nome="Visualizador",
        email="viz@test.com",
        senha_hash=hash_senha("senha123"),
        papel=PapelUsuario.visualizador,
    )
    db.add(viz)
    db.commit()

    headers = get_auth_header(client, "viz@test.com", "senha123")
    resp = client.post(
        "/api/v1/instaladores",
        json={
            "nome": "Teste",
            "cpf": "11144477735",
        },
        headers=headers,
    )
    assert resp.status_code == 403


def test_admin_pode_criar_servico(client, admin_user):
    headers = get_auth_header(client, "admin@test.com", "senha123")
    resp = client.post(
        "/api/v1/servicos",
        json={"descricao": "Teste Serviço", "unidade": "m2", "valor_unitario": "25.00"},
        headers=headers,
    )
    assert resp.status_code == 201


def test_gestor_nao_pode_criar_servico(client, gestor_user):
    headers = get_auth_header(client, "gestor@test.com", "senha123")
    resp = client.post(
        "/api/v1/servicos",
        json={"descricao": "Teste", "unidade": "m2", "valor_unitario": "25.00"},
        headers=headers,
    )
    assert resp.status_code == 403


def test_endpoint_audit_log_apenas_admin(client, gestor_user):
    headers = get_auth_header(client, "gestor@test.com", "senha123")
    resp = client.get("/api/v1/audit-log", headers=headers)
    assert resp.status_code == 403
