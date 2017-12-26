const assert = require('assert');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const MassageBooking = require('../../services/massage_booking');
const nock = require('nock');
const Reservation = require('../../models/reservation');
const timekeeper = require('timekeeper');
const User = require('../../models/user');
const { WebClient } = require('@slack/client');

nock.disableNetConnect();

// .filteringRequestBody((body) => {
//   jsonBody = JSON.parse(body);
//   delete jsonBody.attachments[0].text;
//   return jsonBody;
// })

describe('MassageBooking', () => {
  let massageBooking;
  let now;

  beforeEach(() => {
    const slackWebClient = new WebClient(process.env.SLACK_API_TOKEN);
    massageBooking = new MassageBooking(slackWebClient);

    now = new Date();
    now.setHours(9);
    now.setMinutes(0);
    timekeeper.freeze(now);
  });

  afterEach(() => {
    timekeeper.reset();
  });

  describe('#actionHandler', () => {
    context('book-massage', () => {
      context('reserve', () => {
        it('clicked on reserve button and the time is available', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '17:33' }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046806.960158',
            message_ts: '1514046805.000007',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t',
            trigger_id: '291932495047.73739537123.5a0db0f14d1768425d6c498ffe0eac72',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Thanks for your booking at 17:33' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 33),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 53),
            );
            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('selected a time and the time is available', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'select', selected_options: [{ value: '15:45' }] }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046813.882252',
            message_ts: '1514046811.000025',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n',
            trigger_id: '290793622739.73739537123.14c350eed428152158ecf12061041e20',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n', {
              attachments: [{ text: 'Thanks for your booking at 15:45' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');

            const dateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 5),
            );
            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('clicked on reserve button and the time is not available anymore', (done) => {
          const user = new User(faker.random.uuid(), faker.internet.userName());
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );

          massageBooking.reservations.push(new Reservation(user, dateRange));
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046806.960158',
            message_ts: '1514046805.000007',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t',
            trigger_id: '291932495047.73739537123.5a0db0f14d1768425d6c498ffe0eac72',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Sorry but this time is not available anymore' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, user.id);
            assert.equal(reservation.user.name, user.name);

            assert(reservation.dateRange.isEqual(dateRange));

            done();
          });
        });

        it('update the user reservation', (done) => {
          const user = new User('U25PP0KEE', faker.internet.userName());
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );

          massageBooking.reservations.push(new Reservation(user, dateRange));
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'reserve', type: 'button', value: '14:00' }],
            callback_id: 'book-massage',
            team: { id: 'T25MRFT3M' },
            channel: { id: 'C8HTS5MEC' },
            user: { id: 'U25PP0KEE', name: 'simon' },
            action_ts: '1514046806.960158',
            message_ts: '1514046805.000007',
            attachment_id: '1',
            is_app_unfurl: false,
            response_url: 'https://hooks.slack.com/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t',
            trigger_id: '291932495047.73739537123.5a0db0f14d1768425d6c498ffe0eac72',
          };

          const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
            .post('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Thanks for your booking at 14:00' }],
              replace_original: true,
            })
            .reply(200, 'ok');

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            assert.equal(massageBooking.reservations.length, 1);

            const reservation = massageBooking.reservations[0];
            assert.equal(reservation.user.id, 'U25PP0KEE');
            assert.equal(reservation.user.name, 'simon');

            const newDateRange = new DateRange(
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
              new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
            );
            assert(reservation.dateRange.isEqual(newDateRange));

            done();
          });
        });
      });
    });
  });

  describe('#bookMassage', () => {
    describe('without providing any parameters', () => {
      it('return find the earliest available time', (done) => {
        let user = new User(faker.random.uuid(), faker.internet.userName());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 20, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 35, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 55, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        const payload = {
          token: '',
          team_id: 'T25MRFT3M',
          channel_id: 'C8HTS5MEC',
          user_id: 'U25PP0KEE',
          command: '/book-massage',
          text: '',
          response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
          trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
        };

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          {
            text: 'There is one spot available at 11:40, do you want to reserve it?',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'reserve',
                text: 'Yes, reserve 11:40',
                type: 'button',
                value: '11:40',
              },
              {
                name: 'reserve',
                text: 'Pick a another time...',
                type: 'select',
                options: [
                  { test: '11:40', value: '11:40' },
                  { test: '12:20', value: '12:20' },
                  { test: '12:25', value: '12:25' },
                  { test: '12:30', value: '12:30' },
                  { test: '12:35', value: '12:35' },
                  { test: '12:40', value: '12:40' },
                  { test: '12:45', value: '12:45' },
                  { test: '12:50', value: '12:50' },
                  { test: '12:55', value: '12:55' },
                  { test: '13:00', value: '13:00' },
                  { test: '13:05', value: '13:05' },
                  { test: '13:10', value: '13:10' },
                  { test: '13:15', value: '13:15' },
                  { test: '13:55', value: '13:55' },
                  { test: '14:00', value: '14:00' },
                  { test: '14:05', value: '14:05' },
                  { test: '14:10', value: '14:10' },
                  { test: '14:15', value: '14:15' },
                  { test: '14:20', value: '14:20' },
                  { test: '14:25', value: '14:25' },
                  { test: '14:30', value: '14:30' },
                  { test: '14:35', value: '14:35' },
                  { test: '14:40', value: '14:40' },
                  { test: '14:45', value: '14:45' },
                  { test: '14:50', value: '14:50' },
                ],
              },
            ],
          },
        ];
        const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
          .post('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments })
          .reply(200, 'ok');

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });

      it('ignore user reservations', (done) => {
        let user = new User(faker.random.uuid(), faker.internet.userName());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));

        user = new User('U25PP0KEE', faker.internet.userName());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        massageBooking.reservations.push(new Reservation(user, dateRange));


        const payload = {
          token: '',
          team_id: 'T25MRFT3M',
          channel_id: 'C8HTS5MEC',
          user_id: 'U25PP0KEE',
          command: '/book-massage',
          text: '',
          response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
          trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
        };

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          {
            text: 'There is one spot available at 10:50, do you want to reserve it?',
            callback_id: 'book-massage',
            attachment_type: 'default',
            actions: [
              {
                name: 'reserve',
                text: 'Yes, reserve 10:50',
                type: 'button',
                value: '10:50',
              },
              {
                name: 'reserve',
                text: 'Pick a another time...',
                type: 'select',
                options: [
                  { test: '10:50', value: '10:50' },
                  { test: '10:55', value: '10:55' },
                  { test: '11:00', value: '11:00' },
                  { test: '11:05', value: '11:05' },
                  { test: '11:10', value: '11:10' },
                  { test: '11:15', value: '11:15' },
                  { test: '11:20', value: '11:20' },
                  { test: '11:25', value: '11:25' },
                  { test: '11:30', value: '11:30' },
                  { test: '11:35', value: '11:35' },
                  { test: '11:40', value: '11:40' },
                  { test: '11:45', value: '11:45' },
                  { test: '11:50', value: '11:50' },
                  { test: '11:55', value: '11:55' },
                  { test: '12:00', value: '12:00' },
                  { test: '12:05', value: '12:05' },
                  { test: '12:10', value: '12:10' },
                  { test: '12:15', value: '12:15' },
                  { test: '12:20', value: '12:20' },
                  { test: '12:25', value: '12:25' },
                  { test: '12:30', value: '12:30' },
                  { test: '12:35', value: '12:35' },
                  { test: '12:40', value: '12:40' },
                  { test: '12:45', value: '12:45' },
                  { test: '12:50', value: '12:50' },
                ],
              },
            ],
          },
        ];
        const slackCall = nock('https://hooks.slack.com:443', { encodedQueryParams: true })
          .post('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments })
          .reply(200, 'ok');

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });
    });
  });
});
