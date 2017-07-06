import chai, { util, expect } from 'chai';
import chailint from 'chai-lint';
import feathers from 'feathers';
import configuration from 'feathers-configuration';
import mongodb from 'mongodb';
import plugin from '../src';
import DatabaseService from '../src/database';
import CollectionService from '../src/collection';

describe('feathers-mongodb-management', () => {
  let app, feathersDb, adminDb, testDb, databaseService, collectionService;

  before(() => {
    chailint(chai, util);
    app = feathers();
    // Load app configuration first
    app.configure(configuration());
    return mongodb.connect(app.get('db').url)
    .then(mongo => {
      feathersDb = mongo;
      adminDb = feathersDb.admin();
      return adminDb.listDatabases();
    });
  });

  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  it('registers the plugin', () => {
    app.configure(plugin);
  });

  it('creates the database service', () => {
    app.use('databases', DatabaseService({
      db: feathersDb
    }));
    databaseService = app.service('databases')
    expect(databaseService).toExist();
  });

  it('creates a database', () => {
    return databaseService.create({
      name: 'test-db'
    })
    .then(db => {
      testDb = feathersDb.db('test-db');
      expect(testDb).toExist();
      return adminDb.listDatabases();
    });
  });

  it('creates the collection service', () => {
    app.use('collections', CollectionService({
      db: testDb
    }));
    collectionService = app.service('collections')
    expect(collectionService).toExist();
  });

  it('creates a collection', () => {
    return collectionService.create({
      name: 'test-collection'
    })
    .then(db => {
      expect(testDb.collection('test-collection')).toExist();
      return testDb.collections();
    })
    .then(collections => {
      expect(collections.length).to.equal(1);
    });
  });

  it('finds collections', () => {
    return collectionService.find({
      query: { $select: ['ns'] }
    })
    .then(serviceCollections => {
      return testDb.collections()
      .then(collections => {
        expect(serviceCollections.length).to.equal(collections.length);
      });
    });
  });

  it('finds databases', () => {
    return databaseService.find({
      query: { $select: ['db'] }
    })
    .then(serviceDbs => {
      return adminDb.listDatabases()
      .then(dbsInfo => {
        expect(serviceDbs.length).to.equal(dbsInfo.databases.length);
      });
    });
  });

  // Cleanup
  after(() => {
    feathersDb.close();
  });
});
