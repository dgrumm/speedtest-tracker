const { expect } = require('chai');
//const sinon = require('sinon');
const { root } = require('../src/server'); 
const { describe, it } = require('mocha');


describe('GraphQL Resolvers', () => {
  describe('hello', () => {
    it('should return "Hello world!"', () => {
      const result = root.hello();
      expect(result).to.equal('Hello world!');
    });
  });

  // Add more tests for other resolvers and functions...
});
