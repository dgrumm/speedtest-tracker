const { createSchema, createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const cron = require('node-cron');
const speedTest = require('speedtest-net');
require('dotenv').config({ path: '../.env' });

const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

const client = new InfluxDB({ url: process.env.INFLUXDB_URL, token: token });
const queryApi = client.getQueryApi(org);
const writeApi = client.getWriteApi(org, bucket, 'ns', {
  writeOptions: { maxRetries: 3, retryWait: 1000, requestTimeout: 60000 }
});
writeApi.useDefaultTags({ host: 'home' });

const typeDefs = `
  type SpeedTestResult {
    timestamp: String
    download: Float
    upload: Float
    ping: Float
  }

  type Query {
    hello: String
    getSpeedTestResults(startDate: String!, endDate: String!): [SpeedTestResult]
  }

  type Mutation {
    insertSpeedTestResult(download: Float!, upload: Float!, ping: Float!): SpeedTestResult
    runSpeedTest: SpeedTestResult
  }
`;

const resolvers = {
  Query: {
    getSpeedTestResults: async (_, { startDate, endDate }) => {
      const query = `
        from(bucket: "${bucket}")
          |> range(start: ${startDate}, stop: ${endDate})
          |> filter(fn: (r) => r._measurement == "network_speed")
          |> filter(fn: (r) => r._field == "download" or r._field == "upload" or r._field == "ping")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: true)`;

      const results = [];

      await queryApi.collectRows(query).then(rows => {
        rows.forEach(row => {
          results.push({
            timestamp: row._time,
            download: row.download,
            upload: row.upload,
            ping: row.ping,
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
    insertSpeedTestResult: async (_, { download, upload, ping }) => {
      if (typeof download !== 'number' || typeof upload !== 'number' || typeof ping !== 'number') {
        throw new Error('Download, upload, and ping speeds must be numbers');
      }

      if (download <= 0 || upload <= 0 || ping <= 0) {
        throw new Error('Download, upload, and ping speeds must be greater than zero');
      }

      if (download > 1000 || upload > 1000 || ping > 1000) {
        throw new Error('Download, upload, and ping speeds must be less than 1000 Mbps');
      }

      const point = new Point('network_speed')
        .floatField('download', download)
        .floatField('upload', upload)
        .floatField('ping', ping);

      try {
        console.log('Writing data to InfluxDB:', { download, upload, ping });
        await writeApi.writePoint(point);
        await writeApi.close();
        return { timestamp: new Date().toISOString(), download, upload, ping };
      } catch (err) {
        console.error(`Error writing to InfluxDB! ${err.message}`);
        console.error(`Stack trace: ${err.stack}`);
        throw new Error(`Error writing to InfluxDB: ${err.message}`);
      }
    },

    runSpeedTest: async () => {
      try {
        console.log('Starting speed test...');
        const data = await speedTest({ acceptGdpr: true, acceptLicense: true });

        console.log('Speed test data:', data);
        const result = {
          download: data.download.bandwidth / 1e6, // Convert from bps to Mbps
          upload: data.upload.bandwidth / 1e6, // Convert from bps to Mbps
          ping: data.ping.latency,
          timestamp: new Date().toISOString(),
        };

        const point = new Point('network_speed')
          .floatField('download', result.download)
          .floatField('upload', result.upload)
          .floatField('ping', result.ping);

        console.log('Writing speed test result to InfluxDB:', result);
        await writeApi.writePoint(point);
        await writeApi.close();

        return result;
      } catch (err) {
        console.error(`Error running speed test or writing to InfluxDB: ${err.message}`);
        console.error(`Stack trace: ${err.stack}`);
        throw new Error(`Error running speed test or writing to InfluxDB: ${err.message}`);
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

cron.schedule('0 * * * *', async () => {
  try {
    console.log('Starting scheduled speed test...');
    const data = await speedTest({ acceptGdpr: true, acceptLicense: true });

    console.log('Scheduled speed test data:', data);
    const point = new Point('network_speed')
      .floatField('download', data.download.bandwidth / 1e6) // Convert from bps to Mbps
      .floatField('upload', data.upload.bandwidth / 1e6) // Convert from bps to Mbps
      .floatField('ping', data.ping.latency);

    console.log('Writing scheduled speed test result to InfluxDB:', {
      download: data.download.bandwidth / 1e6,
      upload: data.upload.bandwidth / 1e6,
      ping: data.ping.latency,
    });

    await writeApi.writePoint(point);
    await writeApi.close();
    console.log('Scheduled speed test results saved:', data);
  } catch (err) {
    console.error(`Error running scheduled speed test or writing to InfluxDB: ${err.message}`);
    console.error(`Stack trace: ${err.stack}`);
  }
});
