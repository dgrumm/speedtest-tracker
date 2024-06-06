const sinon = require('sinon');
//const child_process = require("child_process");
const { expect } = require('chai');
const { root, queryApi, writeApi, logger, gracefulShutdown } = require('../src/server'); 
const { describe, it } = require('mocha');


describe('GraphQL Resolvers', () => {
  describe('hello', () => {
    it('should return "Hello world!"', () => {
      const result = root.hello();
      expect(result).to.equal('Hello world!');
    });
  });

  describe('getSpeedTestResults', () => {
    it('should return results from InfluxDB', async () => {
      // Mock the InfluxDB query method
      const mock = sinon.stub(queryApi, 'collectRows').returns(Promise.resolve([
        {
          _time: '2022-01-01T00:00:00Z',
          download: 100,
          upload: 100,
          ping: 10,
        }
      ]));

      const results = await root.getSpeedTestResults({ startDate: '2022-01-01T00:00:00Z', endDate: '2022-01-02T00:00:00Z' });

      expect(results).to.deep.equal([
        {
          timestamp: '2022-01-01T00:00:00Z',
          download: 100,
          upload: 100,
          ping: 10,
        }
      ]);

      // Restore the original method
      mock.restore();
    });
  });

  describe('insertSpeedTestResult', () => {
    it('should write data to InfluxDB', async () => {
      // Mock the InfluxDB write method
      const mock = sinon.stub(writeApi, 'writePoint');
      const flushMock = sinon.stub(writeApi, 'flush').returns(Promise.resolve());

      const result = await root.insertSpeedTestResult({ download: 100, upload: 100, ping: 10 });

      expect(result).to.have.property('download', 100);
      expect(result).to.have.property('upload', 100);
      expect(result).to.have.property('ping', 10);
      expect(result).to.have.property('timestamp').that.is.a('string');

      // Check that the write method was called with the correct arguments
      expect(mock.calledOnce).to.be.true;
      expect(flushMock.calledOnce).to.be.true;

      // Restore the original methods
      mock.restore();
      flushMock.restore();
    });
  });

  describe('runSpeedTest', () => {
    it('should run a speed test and correctly handle the output', async () => {
      // Mock the runSpeedTest function to simulate a speed test
      const runSpeedTestMock = sinon.stub(root, 'runSpeedTest');
      runSpeedTestMock.returns(Promise.resolve({
        download: 100,
        upload: 100,
        ping: 10,
        timestamp: new Date().toISOString()
      }));

      // Call the function under test
      const result = await root.runSpeedTest();

      // Check that the result has the correct properties
      expect(result).to.have.property('download', 100);
      expect(result).to.have.property('upload', 100);
      expect(result).to.have.property('ping', 10);
      expect(result).to.have.property('timestamp').that.is.a('string');

      // Restore the original runSpeedTest function
      runSpeedTestMock.restore();
    });
  });

  describe('gracefulShutdown', () => {
    it('should close the InfluxDB connection and exit the process', async () => {
      
      const closeMock = sinon.stub(writeApi, 'close').returns(Promise.resolve());  
      const exitMock = sinon.stub(process, 'exit');
      const loggerMock = sinon.stub(logger, 'info');
  
      await gracefulShutdown();
  
      // Check that the writeApi.close method was called
      expect(closeMock.calledOnce).to.be.true;
  
      // Check that the logger.info method was called with the correct arguments
      expect(loggerMock.calledWith('Shutting down gracefully...')).to.be.true;
      expect(loggerMock.calledWith('InfluxDB connection closed.')).to.be.true;
  
      // Check that the process.exit method was called with the correct argument
      expect(exitMock.calledWith(0)).to.be.true;
  
      // Restore the original methods
      closeMock.restore();
      exitMock.restore();
      loggerMock.restore();
    });
  });
  // Add more tests for other resolvers and functions...

});