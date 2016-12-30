const debug = require('debug')('app:server');
const service = require('feathers-knex');
const hooks = require('feathers-hooks');
const knex = require('knex');
const ilmoconfig = require('../../config/ilmomasiina.config.js'); // eslint-disable-line

// const user require('./user');


module.exports = function () { // eslint-disable-line
  debug('Feathers');
  const app = this; // function can't be nameless beacause of this
  // initialize db

  // create database connection
  const db = knex({
    client: 'mysql',
    connection: {
      user: ilmoconfig.mysqlUser,
      password: ilmoconfig.mysqlPassword,
      database: ilmoconfig.mysqlDatabase,
    },
  });

  // initialize services
  app.use('/api/events', service({
    Model: db,
    name: 'events',
  }));

  app.use('/api/signups', service({
    Model: db,
    name: 'signups',
  }));

  app.use('/api/quotas', service({
    Model: db,
    name: 'quotas',
  }));

  app.use('/api/questions', service({
    Model: db,
    name: 'questions',
  }));

  app.use('/api/answers', service({
    Model: db,
    name: 'answers',
  }));

  // Disable external use
  app.service('/api/answers').before({
    // disable external use (rest / websocket ) of /api/answers
    all: hooks.disable('external'),
  });
  app.service('/api/quotas').before({
    // disable external use (rest / websocket ) of /api/quotas
    all: hooks.disable('external'),
  });

  // drop tables
  db.schema.dropTableIfExists('events')
  .then(() => db.schema.dropTableIfExists('signups'))
  .then(() => db.schema.dropTableIfExists('quotas'))
  .then(() => db.schema.dropTableIfExists('questions'))
  .then(() => db.schema.dropTableIfExists('answers'))

  // create tables
  .then(() =>
    db.schema.createTable('events', (table) => {
      debug('Creating events table');
      table.increments('id');
      table.string('title');
      table.dateTime('date');
      table.string('description');
      table.string('price');
      table.string('location');
      table.string('homepage');
      table.string('facebooklink');
    }))
  .then(() =>
    db.schema.createTable('signups', (table) => {
      debug('Creating signups table');
      table.increments('id');
      table.integer('quotaId');
      table.dateTime('timestamp');
      table.string('title');
      table.string('email');
    }))
  .then(() =>
    db.schema.createTable('quotas', (table) => {
      debug('Creating quotas table');
      table.increments('id');
      table.integer('eventId');
      table.string('title');
      table.integer('going');
      table.integer('size');
      table.dateTime('signupOpens');
      table.dateTime('signupCloses');
    }))
  .then(() =>
    db.schema.createTable('answers', (table) => {
      debug('Creating answers table');
      table.increments('id');
      table.integer('signupId');
      table.integer('questionId');
      table.string('answer');
    }))
  .then(() =>
    db.schema.createTable('questions', (table) => {
      debug('Creating questions table');
      table.increments('id');
      table.integer('eventId');
      table.string('type');
      table.string('question');
      table.string('options');
      table.boolean('required');
      table.boolean('public');
    }))
  .then(() => {
    // create dummy events
    app.service('/api/events').create({
      title: 'Minuuttikalja 2016',
      date: '2016-4-27 18:00:00',
      description: 'Legendaarinen wappufiiliksen pikakohottaja, Minuuttikalja',
      price: '',
      location: 'Where: Smökki (Jämeräntaival 4, Espoo)',
      homepage: '',
      facebooklink: 'https://www.facebook.com/events/1715883881987829/',
    }).then(() => {
      debug('created event');
    });

    app.service('/api/events').create({
      title: 'Columbia Road -excu',
      date: '2017-1-11 17:00:00',
      description: 'Columbia Road toivottaa athenelaiset ja tikkiläiset ',
      price: '0',
      location: 'Eerikinkatu 5, Helsinki',
      homepage: 'http://crexcu2017.wordpress.com/',
      facebooklink: '',
    }).then(() => {
      debug('created event');
    });

    // mockup users
    app.service('/api/signups').create({
      name: 'Joel',
      quotaId: 1,
      email: 'ilmomasiina@gmail.com',
    });

    app.service('/api/signups').create({
      name: 'Pekka',
      quotaId: 1,
      email: 'pekka@ilmo.fi',
    });

    app.service('/api/signups').create({
      name: 'Alan',
      quotaId: 2,
      email: 'Alan@ilmo.fi',
    });

    app.service('/api/signups').create({
      name: 'Ville',
      quotaId: 2,
      email: 'ville@ilmo.fi',
    });
    debug('created 4 mockup users');

    // mockup questions
    app.service('/api/questions').create({
      id: 1,
      eventId: 1,
      type: 'checkbox',
      question: 'Name?',
      required: true,
      public: true,
      options: '',
    });

    app.service('/api/questions').create({
      id: 2,
      eventId: 1,
      type: 'text',
      question: 'Name?',
      required: true,
      public: true,
      options: '',
    });

    app.service('/api/questions').create({
      id: 3,
      eventId: 2,
      type: 'longtext',
      question: 'Name?',
      required: true,
      public: true,
      options: '',
    });

    app.service('/api/questions').create({
      id: 4,
      eventId: 2,
      type: 'select',
      question: 'Name?',
      required: true,
      public: true,
      options: '',
    });
    debug('created 4 mockup questions');

    // mockup users
    app.service('/api/answers').create({
      id: 1,
      signupId: 1,
      questionId: 1,
      answer: 'testi vastaus1',
    });

    app.service('/api/answers').create({
      id: 2,
      signupId: 2,
      questionId: 1,
      answer: 'testi vastaus2',
    });

    app.service('/api/answers').create({
      id: 3,
      signupId: 3,
      questionId: 2,
      answer: 'testi vastaus3',
    });

    app.service('/api/answers').create({
      id: 4,
      signupId: 4,
      questionId: 2,
      answer: 'testi vastaus4',
    });
    debug('created 4 mockup answers');
  });

  const populateEventsSchema = {
    include: [{
      service: '/api/quotas',
      nameAs: 'quotas',
      parentField: 'id',
      childField: 'eventId',
      asArray: true,
    }],
  };

  const populateSingleEvent = {
    include: [{
      service: '/api/quotas',
      nameAs: 'quotas',
      parentField: 'id',
      childField: 'eventId',
      include: [{
        service: '/api/signups',
        nameAs: 'signups',
        parentField: 'id',
        childField: 'quotaId',
        include: [{
          service: '/api/answers',
          nameAs: 'answers',
          parentField: 'id',
          childField: 'signupId',
        }],
      }],
    },
    {
      service: '/api/questions',
      nameAs: 'questions',
      parentField: 'id',
      childField: 'eventId',
    }],
  };

  // api/events hooks
  app.service('/api/events').after({
    // GET /api/events/<eventId>
    get: hooks.populate({ schema: populateSingleEvent }),
    // GET /api/events
    find: hooks.populate({ schema: populateEventsSchema }),
    create: (hook) => {
      // creates a new quota and attaches it to just created event
      app.service('/api/quotas').create({
        eventId: hook.result.id, // id of the just created event
        title: 'Kiintiö tapahtumalle ',
        size: 20,
        going: 10,
        signupOpens: '2017-1-1 23:59:59',
        signupCloses: '2017-1-1 23:59:59',
      });
    },
  });
};