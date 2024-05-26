FROM node:18-buster

WORKDIR /app
COPY ["package*.json", "/app"]
RUN npm install
COPY . /app

EXPOSE 4040

#CMD ["npm", "start"]
# command to run src/run-speedtest.js on start
CMD ["node", "src/run-speedtest.js"]
