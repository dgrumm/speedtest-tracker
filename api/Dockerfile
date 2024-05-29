# FROM node:18-buster

#WORKDIR /app
#COPY package.json /app
#RUN npm install
#COPY . /app

#CMD [ "/bin/sh" ]
#CMD [ "npm", "start"]
#CMD [ "node", "src/speed-test-cli.js" ]

FROM node:18-buster

WORKDIR /app

COPY ["package*.json", "./"]

RUN npm install

# Install Ookla Speedtest CLI
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    && curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | bash \
    && apt-get install -y speedtest \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
