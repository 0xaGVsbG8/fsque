FROM python:3.12-alpine

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app_self/ .

EXPOSE 9010

CMD ["python", "deploy.py"]
