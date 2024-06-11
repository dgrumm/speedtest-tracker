const util = require('util');
const exec = util.promisify(require('child_process').exec);
const express = require("express");
const cors = require('cors');
const { createHandler } = require("graphql-http/lib/use/express");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");
const { buildSchema, execute } = require("graphql");
const cron = require('node-cron');
const winston = require('winston');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, process.env.NODE_ENV === 'production' ? '../../.env.production' : '../../.env') });

console.log(`Running in ${process.env.NODE_ENV} mode`);
console.log(`InfluxDB URL: ${process.env.INFLUXDB_URL}`);


// Logger configuration
const logger = winston.createLogger({
  level: 'debug', // Set the log level to 'debug' for detailed logs
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
});

const app = express();
const port = process.env.PORT || 4000;

// use cors for allowing cross-origin requests
app.use(cors());

// Middleware to enable JSON parsing and CORS
app.use(express.json()); // Use Express's built-in JSON parser
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Add morgan to log HTTP requests
app.use(morgan('combined'));

// InfluxDB Configuration
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;
const client = new InfluxDB({ url: process.env.INFLUXDB_URL, token: token });
const queryApi = client.getQueryApi(org);
const writeApi = client.getWriteApi(org, bucket, 'ns', {
  writeOptions: { maxRetries: 3, retryWait: 1000, requestTimeout: 60000 }
});

// Set the host tag based on the environment variable or default to 'home-wifi'
const host = process.env.HOST || 'home-wifi';
writeApi.useDefaultTags({ host: host });

// GraphQL Schema
const schema = buildSchema(`
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
`);

const root = {
  hello: () => {
    logger.debug('hello resolver called');
    return 'Hello world!';
  },
  getSpeedTestResults: async ({ startDate, endDate }) => {
    const query = `
      from(bucket: "speedtest")
        |> range(start: ${startDate}, stop: ${endDate})
        |> filter(fn: (r) => r._measurement == "network_speed")
        |> filter(fn: (r) => r._field == "download" or r._field == "upload" or r._field == "ping")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)`;

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
      logger.error(`Error querying InfluxDB! ${err.message}`);
      logger.error(`Stack trace: ${err.stack}`);
    });

    return results;
  },
  insertSpeedTestResult: async ({ download, upload, ping }) => {
    const point = new Point('network_speed')
      .floatField('download', download)
      .floatField('upload', upload)
      .floatField('ping', ping);

    try {
      logger.debug('Writing data to InfluxDB:', { download, upload, ping });
      writeApi.writePoint(point);
      await writeApi.flush();
      return { timestamp: new Date().toISOString(), download, upload, ping };
    } catch (err) {
      logger.error('Error writing to InfluxDB:', err.message);
      logger.error('Stack trace:', err.stack);
      throw new Error(`Error writing to InfluxDB: ${err.message}`);
    }
  },

  runSpeedTest: () => {
  return new Promise((resolve, reject) => {
    logger.debug('Starting speed test...');
    exec("speedtest --accept-license --accept-gdpr --format=json")
      .then(({ stdout }) => {
        logger.debug(`Speed test output: ${stdout}`);
        const result = JSON.parse(stdout);
        logger.debug('Parsed speed test result:', result);

        const download = result.download.bandwidth / 1e6; // Convert from bps to Mbps
        const upload = result.upload.bandwidth / 1e6; // Convert from bps to Mbps
        const ping = result.ping.latency;
        const timestamp = new Date().toISOString();

        const point = new Point('network_speed')
          .floatField('download', download)
          .floatField('upload', upload)
          .floatField('ping', ping);
        
        // write result to InfluxDB
        logger.debug('Writing point to InfluxDB:', point);
        writeApi.writePoint(point);
        writeApi.flush().then(() => {
          logger.debug('Successfully wrote to InfluxDB');
          resolve({ timestamp, download, upload, ping });
        }).catch(err => {
          logger.error('Error flushing InfluxDB writeApi:', err.message);
          reject(new Error(`Error writing to InfluxDB: ${err.message}`));
        });
      })
      .catch(err => {
        logger.error(`Speed test error: ${err.message}`);
        reject(new Error("Error running speed test"));
      });
  });
},
};

// Schedule the speed test to run every hour
cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running scheduled speed test...');
      const result = await root.runSpeedTest();
      logger.info('Scheduled speed test completed successfully:', result);
    } catch (err) {
      logger.error('Error running scheduled speed test:', err.message);
    }
  });

// GraphQL endpoint
app.use('/graphql', (req, res, next) => {
  if (req.method === 'GET') {
    const { query } = req.query;
    req.body = { query };
  }
  logger.debug(`GraphQL request received: ${JSON.stringify(req.body)}`);
  next();
}, (req, res, next) => {
  logger.debug(`GraphQL handler called with query: ${req.body.query}`);
  next();
}, createHandler({
  schema: schema,
  rootValue: root,
  context: ({ request }) => {
    logger.debug(`GraphQL context called with request body: ${JSON.stringify(request)}`);
    return {};
  },
  execute: async (args) => {
    logger.debug(`Executing GraphQL query: ${args.document}`);
    const result = await execute(args);
    logger.debug(`GraphQL execution result: ${JSON.stringify(result)}`);
    return result;
  }
}));

// Start the server
app.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});

// Gracefully close the InfluxDB connection on shutdown
const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  writeApi.close().then(() => {
    logger.info('InfluxDB connection closed.');
    process.exit(0);
  }).catch(err => {
    logger.error('Error closing InfluxDB connection:', err.message);
    process.exit(1);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  root,
  queryApi, 
  writeApi,
  logger,
  gracefulShutdown
};
