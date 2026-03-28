from fastapi import FastAPI

from app.api import router

app = FastAPI()
app.include_router(router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
