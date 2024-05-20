const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const speedTest = require('speedtest-net');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const cron = require('node-cron');

const token = '45Jv5JxHqFSoOkP5HrLEU8tyCdGCulP1i85IdjbzA8lk5bPbdAxxuzmByb-CFPiUMG-VvydK2Z4REcVKbY5dvg=='; // "all-access" token
const org = 'speedtest'; 
const bucket = 'speedtest';

const client = new InfluxDB({ url: 'http://localhost:8086', token: token });
const queryApi = client.getQueryApi(org);
const writeApi = client.getWriteApi(org, bucket);
writeApi.useDefaultTags({ host: 'home' });

const app = express();
const schema = buildSchema(`
  type SpeedTestResult {
    time: String
    download: Float
    upload: Float
  }

  type Query {
    hello: String
    getSpeedTestResults: [SpeedTestResult]
  }

  type Mutation {
    insertSpeedTestResult(download: Float!, upload: Float!): SpeedTestResult
  }
`);

const root = {
  hello: () => 'Hello world!',
  getSpeedTestResults: async () => {
    const query = `from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "network_speed")
      |> filter(fn: (r) => r._field == "download" or r._field == "upload")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)`;

    const results = [];

    await queryApi.collectRows(query).then(rows => {
      rows.forEach(row => {
        results.push({
          time: row._time,
          download: row.download,
          upload: row.upload
        });
      });
    }).catch(err => {
      console.error(`Error querying InfluxDB! ${err.message}`);
      console.error(`Stack trace: ${err.stack}`);
    });

    return results;
  },
  insertSpeedTestResult: async ({ download, upload }) => {
    const point = new Point('network_speed')
      .floatField('download', download)
      .floatField('upload', upload);

    try {
      await writeApi.writePoint(point);
      await writeApi.close();
      return { time: new Date().toISOString(), download, upload };
    } catch (err) {
      console.error(`Error writing to InfluxDB! ${err.message}`);
      console.error(`Stack trace: ${err.stack}`);
      throw new Error('Error writing to InfluxDB');
    }
  }
};

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

cron.schedule('0 * * * *', () => {
  const test = speedTest({ acceptGdpr: true });
  test.on('data', data => {
    const point = new Point('network_speed')
      .floatField('download', data.speeds.download)
      .floatField('upload', data.speeds.upload);

    writeApi.writePoint(point);
    writeApi
      .close()
      .then(() => {
        console.log('WRITE FINISHED');
      })
      .catch(err => {
        console.error(`Error writing to InfluxDB! ${err.message}`);
        console.error(`Stack trace: ${err.stack}`);
      });
  });

  test.on('error', err => {
    console.error(`Error running speed test! ${err.stack}`);
  });
});

app.listen(4000, () => console.log('Server is running on http://localhost:4000/graphql'));