const { createSchema, createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const cron = require('node-cron');
require('dotenv').config();

const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

const client = new InfluxDB({ url: process.env.INFLUXDB_URL, token: token });
const queryApi = client.getQueryApi(org);
const writeApi = client.getWriteApi(org, bucket);
writeApi.useDefaultTags({ host: 'home' });

const typeDefs = `
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
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    getSpeedTestResults: async () => {
      const query = `from(bucket: "${bucket}")
        |> range(start: -24h)
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
            upload: row.upload,
          });
        });
      }).catch(err => {
        console.error(`Error querying InfluxDB! ${err.message}`);
        console.error(`Stack trace: ${err.stack}`);
      });

      return results;
    },
  },
  Mutation: {
    insertSpeedTestResult: async (_, { download, upload }) => {
      if (typeof download !== 'number' || typeof upload !== 'number') {
        throw new Error('Download and upload speeds must be numbers');
      }

      if (download <= 0 || upload <= 0) {
        throw new Error('Download and upload speeds must be greater than zero');
      }

      if (download > 1000 || upload > 1000) {
        throw new Error('Download and upload speeds must be less than 1000 Mbps');
      }

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
        throw new Error(`Error writing to InfluxDB: ${err.message}`);
      }
    },
  },
};

const yoga = createYoga({
    schema: createSchema({
      typeDefs,
      resolvers,
    }),
  });
  
  const server = createServer(yoga);
  
  server.listen(4000, () => {
    console.log('Server is running on http://localhost:4000/graphql');
  });

cron.schedule('0 * * * *', () => {
  const test = speedTest({ acceptGdpr: true, acceptLicense: true });
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
