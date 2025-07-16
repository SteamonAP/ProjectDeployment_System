FROM ubuntu:focal

RUN apt-get update && apt-get install -y \
    curl \
    git \
    gnupg \
    ca-certificates \
    lsb-release


RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs



WORKDIR /app

COPY main.sh main.sh
COPY script.js script.js
COPY package*.json .

RUN npm install



RUN chmod +x main.sh
RUN chmod +x script.js




ENTRYPOINT [ "/app/main.sh" ]

