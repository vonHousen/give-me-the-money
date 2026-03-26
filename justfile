set shell := ["bash", "-cu"]

default:
  @just --list

up *args:
  docker compose up --build {{args}}

down:
  docker compose down

rebuild:
  docker compose build --no-cache backend

health:
  curl -fsS http://127.0.0.1:8000/health
