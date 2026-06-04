FROM python:3.12-slim

# Utilisateur non-root (DevSecOps)
RUN groupadd --gid 1000 siniko \
    && useradd --uid 1000 --gid siniko --shell /bin/bash --create-home siniko

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN chown -R siniko:siniko /app
USER siniko

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
