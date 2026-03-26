from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
