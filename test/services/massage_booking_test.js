const assert = require('assert');
const Booking = require('../../models/booking');
const BookingRepository = require('../../services/booking_repository');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const MassageBooking = require('../../services/massage_booking');
const nock = require('nock');
const timekeeper = require('timekeeper');
const User = require('../../models/user');
const { WebClient } = require('@slack/client');

function nockFetchUser(userPayload) {
  return nock('https://slack.com:443', { encodedQueryParams: true })
    .post('/api/users.info', `user=${userPayload.id}&token=${process.env.SLACK_API_TOKEN}`)
    .reply(200, { ok: true, user: userPayload });
}

function nockSlackCall(path, payload) {
  return nock('https://hooks.slack.com:443', { encodedQueryParams: true }).post(path, payload).reply(200, 'ok');
}

describe('MassageBooking', () => {
  const redisOptions = { host: process.env.REDIS_HOST, prefix: 'test' };
  let bookingRepository;
  let massageBooking;
  let now;

  beforeEach((done) => {
    nock.disableNetConnect();
    nock.enableNetConnect(process.env.REDIS_HOST);

    const slackWebClient = new WebClient(process.env.SLACK_API_TOKEN);
    massageBooking = new MassageBooking(slackWebClient, redisOptions);

    now = new Date(2018, 0, 19, 9, 0, 0, 0);
    timekeeper.freeze(now);

    bookingRepository = new BookingRepository(redisOptions);
    bookingRepository.flush().then(done).catch(done);
  });

  afterEach(() => {
    timekeeper.reset();

    nock.enableNetConnect();
  });

  describe('#actionHandler()', () => {
    context('book-massage', () => {
      context('book', () => {
        it('clicked on book button and the time is available', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'book', type: 'button', value: '2018-01-19T17:33:00.000Z' }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
            attachments: [{ text: 'Thanks for your booking at 17:33 -> 17:53' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            bookingRepository.all().catch(done).then((bookings) => {
              assert.equal(bookings.length, 1);

              const booking = bookings[0];
              assert.equal(booking.user.id, 'U25PP0KEE');
              assert.equal(booking.user.name, 'simon');
              assert.equal(booking.user.realName, 'Simon Lacroix');

              const dateRange = new DateRange(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 33),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 53),
              );
              assert(booking.dateRange.isEqual(dateRange));

              done();
            });
          });
        });

        it('selected a time and the time is available', (done) => {
          const payload = {
            type: 'interactive_message',
            actions: [{ name: 'book', type: 'select', selected_options: [{ value: '2018-01-19T15:45:00.000Z' }] }],
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

          const slackCall = nockSlackCall('/actions/T25MRFT3M/290870923474/D5EQmPpOCph5nhjxCVUnXC6n', {
            attachments: [{ text: 'Thanks for your booking at 15:45 -> 16:05' }],
            replace_original: true,
          });

          nockFetchUser({
            id: 'U25PP0KEE',
            team_id: 'T25MRFT3M',
            name: 'simon',
            real_name: 'Simon Lacroix',
          });

          massageBooking.actionHandler(payload, () => {
            slackCall.done();

            bookingRepository.all().catch(done).then((bookings) => {
              assert.equal(bookings.length, 1);

              const booking = bookings[0];
              assert.equal(booking.user.id, 'U25PP0KEE');
              assert.equal(booking.user.name, 'simon');
              assert.equal(booking.user.realName, 'Simon Lacroix');

              const dateRange = new DateRange(
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 45),
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 5),
              );
              assert(booking.dateRange.isEqual(dateRange));

              done();
            });
          });
        });

        it('clicked on book button and the time is not available anymore', (done) => {
          const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );

          bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
            const payload = {
              type: 'interactive_message',
              actions: [{ name: 'book', type: 'button', value: '2018-01-19T14:00:00.000Z' }],
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

            const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Sorry but this time is not available anymore.' }],
              replace_original: true,
            });

            massageBooking.actionHandler(payload, () => {
              slackCall.done();

              bookingRepository.all().catch(done).then((bookings) => {
                assert.equal(bookings.length, 1);

                const booking = bookings[0];
                assert.equal(booking.user.id, user.id);
                assert.equal(booking.user.name, user.name);
                assert.equal(booking.user.realName, user.realName);

                assert(booking.dateRange.isEqual(dateRange));

                done();
              });
            });
          });
        });

        it('update the user booking', (done) => {
          const user = new User('U25PP0KEE');
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 35, 0, 0),
          );

          bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
            const payload = {
              type: 'interactive_message',
              actions: [{ name: 'book', type: 'button', value: '2018-01-19T14:00:00.000Z' }],
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

            const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Your booking as been successfully updated to 14:00 -> 14:20' }],
              replace_original: true,
            });

            nockFetchUser({
              id: 'U25PP0KEE',
              team_id: 'T25MRFT3M',
              name: 'simon',
              real_name: 'Simon Lacroix',
            });

            massageBooking.actionHandler(payload, () => {
              slackCall.done();

              bookingRepository.all().catch(done).then((bookings) => {
                assert.equal(bookings.length, 1);

                const booking = bookings[0];
                assert.equal(booking.user.id, 'U25PP0KEE');
                assert.equal(booking.user.name, 'simon');
                assert.equal(booking.user.realName, 'Simon Lacroix');

                const newDateRange = new DateRange(
                  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
                  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
                );
                assert(booking.dateRange.isEqual(newDateRange));

                done();
              });
            });
          });
        });

        it('ignore past bookings', (done) => {
          const user = new User('U25PP0KEE');
          const dateRange = new DateRange(
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0),
            new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20, 0, 0),
          );

          bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
            const payload = {
              type: 'interactive_message',
              actions: [{ name: 'book', type: 'button', value: '2018-01-19T14:00:00.000Z' }],
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

            const slackCall = nockSlackCall('/actions/T25MRFT3M/290209823664/Dtfv5c9DWE7nh0wqVOYB2n8t', {
              attachments: [{ text: 'Thanks for your booking at 14:00 -> 14:20' }],
              replace_original: true,
            });

            nockFetchUser({
              id: 'U25PP0KEE',
              team_id: 'T25MRFT3M',
              name: 'simon',
              real_name: 'Simon Lacroix',
            });

            massageBooking.actionHandler(payload, () => {
              slackCall.done();

              bookingRepository.all().catch(done).then((bookings) => {
                assert.equal(bookings.length, 1);

                const booking = bookings[0];
                assert.equal(booking.user.id, 'U25PP0KEE');
                assert.equal(booking.user.name, 'simon');
                assert.equal(booking.user.realName, 'Simon Lacroix');

                const newDateRange = new DateRange(
                  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0),
                  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 20, 0, 0),
                );
                assert(booking.dateRange.isEqual(newDateRange));

                done();
              });
            });
          });
        });
      });
    });
  });

  describe('#bookMassage()', () => {
    describe('no params', () => {
      it('return find the earliest available time', (done) => {
        const bookings = [];

        let user = new User(faker.random.uuid());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 20, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid());
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 35, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 55, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        Promise.all(bookings.map(booking => bookingRepository.add(booking))).catch(done).then(() => {
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
              text: 'There is one spot available at 11:40, do you want to book it?',
              color: '#36a64f',
              callback_id: 'book-massage',
              attachment_type: 'default',
              actions: [
                {
                  name: 'book',
                  text: 'Yes, book 11:40 -> 12:00',
                  type: 'button',
                  value: '2018-01-19T11:40:00.000Z',
                },
                {
                  name: 'book',
                  text: 'Pick another time...',
                  type: 'select',
                  options: [
                    { text: '11:40 -> 12:00', value: '2018-01-19T11:40:00.000Z' },
                    { text: '12:20 -> 12:40', value: '2018-01-19T12:20:00.000Z' },
                    { text: '12:25 -> 12:45', value: '2018-01-19T12:25:00.000Z' },
                    { text: '12:30 -> 12:50', value: '2018-01-19T12:30:00.000Z' },
                    { text: '12:35 -> 12:55', value: '2018-01-19T12:35:00.000Z' },
                    { text: '12:40 -> 13:00', value: '2018-01-19T12:40:00.000Z' },
                    { text: '12:45 -> 13:05', value: '2018-01-19T12:45:00.000Z' },
                    { text: '12:50 -> 13:10', value: '2018-01-19T12:50:00.000Z' },
                    { text: '12:55 -> 13:15', value: '2018-01-19T12:55:00.000Z' },
                    { text: '13:00 -> 13:20', value: '2018-01-19T13:00:00.000Z' },
                    { text: '13:05 -> 13:25', value: '2018-01-19T13:05:00.000Z' },
                    { text: '13:10 -> 13:30', value: '2018-01-19T13:10:00.000Z' },
                    { text: '13:15 -> 13:35', value: '2018-01-19T13:15:00.000Z' },
                    { text: '13:55 -> 14:15', value: '2018-01-19T13:55:00.000Z' },
                    { text: '14:00 -> 14:20', value: '2018-01-19T14:00:00.000Z' },
                    { text: '14:05 -> 14:25', value: '2018-01-19T14:05:00.000Z' },
                    { text: '14:10 -> 14:30', value: '2018-01-19T14:10:00.000Z' },
                    { text: '14:15 -> 14:35', value: '2018-01-19T14:15:00.000Z' },
                    { text: '14:20 -> 14:40', value: '2018-01-19T14:20:00.000Z' },
                    { text: '14:25 -> 14:45', value: '2018-01-19T14:25:00.000Z' },
                    { text: '14:30 -> 14:50', value: '2018-01-19T14:30:00.000Z' },
                    { text: '14:35 -> 14:55', value: '2018-01-19T14:35:00.000Z' },
                    { text: '14:40 -> 15:00', value: '2018-01-19T14:40:00.000Z' },
                    { text: '14:45 -> 15:05', value: '2018-01-19T14:45:00.000Z' },
                    { text: '14:50 -> 15:10', value: '2018-01-19T14:50:00.000Z' },
                  ],
                },
              ],
            },
          ];
          const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

          massageBooking.bookMassage(payload, () => {
            slackCall.done();

            done();
          });
        });
      });

      it('warn when there is already a booking', (done) => {
        const bookings = [];
        let user = new User(faker.random.uuid());
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User('U25PP0KEE');
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        Promise.all(bookings.map(booking => bookingRepository.add(booking))).catch(done).then(() => {
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
              text: 'There is one spot available at 10:50, do you want to book it?',
              color: '#36a64f',
              callback_id: 'book-massage',
              attachment_type: 'default',
              actions: [
                {
                  name: 'book',
                  text: 'Yes, book 10:50 -> 11:10',
                  type: 'button',
                  value: '2018-01-19T10:50:00.000Z',
                },
                {
                  name: 'book',
                  text: 'Pick another time...',
                  type: 'select',
                  options: [
                    { text: '10:50 -> 11:10', value: '2018-01-19T10:50:00.000Z' },
                    { text: '10:55 -> 11:15', value: '2018-01-19T10:55:00.000Z' },
                    { text: '11:00 -> 11:20', value: '2018-01-19T11:00:00.000Z' },
                    { text: '11:05 -> 11:25', value: '2018-01-19T11:05:00.000Z' },
                    { text: '11:10 -> 11:30', value: '2018-01-19T11:10:00.000Z' },
                    { text: '11:15 -> 11:35', value: '2018-01-19T11:15:00.000Z' },
                    { text: '11:20 -> 11:40', value: '2018-01-19T11:20:00.000Z' },
                    { text: '11:25 -> 11:45', value: '2018-01-19T11:25:00.000Z' },
                    { text: '11:30 -> 11:50', value: '2018-01-19T11:30:00.000Z' },
                    { text: '11:35 -> 11:55', value: '2018-01-19T11:35:00.000Z' },
                    { text: '11:40 -> 12:00', value: '2018-01-19T11:40:00.000Z' },
                    { text: '11:45 -> 12:05', value: '2018-01-19T11:45:00.000Z' },
                    { text: '11:50 -> 12:10', value: '2018-01-19T11:50:00.000Z' },
                    { text: '11:55 -> 12:15', value: '2018-01-19T11:55:00.000Z' },
                    { text: '12:00 -> 12:20', value: '2018-01-19T12:00:00.000Z' },
                    { text: '12:05 -> 12:25', value: '2018-01-19T12:05:00.000Z' },
                    { text: '12:10 -> 12:30', value: '2018-01-19T12:10:00.000Z' },
                    { text: '12:15 -> 12:35', value: '2018-01-19T12:15:00.000Z' },
                    { text: '12:20 -> 12:40', value: '2018-01-19T12:20:00.000Z' },
                    { text: '12:25 -> 12:45', value: '2018-01-19T12:25:00.000Z' },
                    { text: '12:30 -> 12:50', value: '2018-01-19T12:30:00.000Z' },
                    { text: '12:35 -> 12:55', value: '2018-01-19T12:35:00.000Z' },
                    { text: '12:40 -> 13:00', value: '2018-01-19T12:40:00.000Z' },
                    { text: '12:45 -> 13:05', value: '2018-01-19T12:45:00.000Z' },
                    { text: '12:50 -> 13:10', value: '2018-01-19T12:50:00.000Z' },
                  ],
                },
              ],
            },
            {
              text: 'Note: You already have a booking for 11:00 -> 11:20.\nMaking a new booking will cancel the previous ones.',
              color: '#ffcc00',
            },
          ];
          const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

          massageBooking.bookMassage(payload, () => {
            slackCall.done();

            done();
          });
        });
      });

      it('ignore past bookings', (done) => {
        const user = new User('U25PP0KEE');
        const dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 10, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0, 0),
        );

        bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
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
              text: 'There is one spot available at 10:25, do you want to book it?',
              color: '#36a64f',
              callback_id: 'book-massage',
              attachment_type: 'default',
              actions: [
                {
                  name: 'book',
                  text: 'Yes, book 10:25 -> 10:45',
                  type: 'button',
                  value: '2018-01-19T10:25:00.000Z',
                },
                {
                  name: 'book',
                  text: 'Pick another time...',
                  type: 'select',
                  options: [
                    { text: '10:25 -> 10:45', value: '2018-01-19T10:25:00.000Z' },
                    { text: '10:30 -> 10:50', value: '2018-01-19T10:30:00.000Z' },
                    { text: '10:35 -> 10:55', value: '2018-01-19T10:35:00.000Z' },
                    { text: '10:40 -> 11:00', value: '2018-01-19T10:40:00.000Z' },
                    { text: '10:45 -> 11:05', value: '2018-01-19T10:45:00.000Z' },
                    { text: '10:50 -> 11:10', value: '2018-01-19T10:50:00.000Z' },
                    { text: '10:55 -> 11:15', value: '2018-01-19T10:55:00.000Z' },
                    { text: '11:00 -> 11:20', value: '2018-01-19T11:00:00.000Z' },
                    { text: '11:05 -> 11:25', value: '2018-01-19T11:05:00.000Z' },
                    { text: '11:10 -> 11:30', value: '2018-01-19T11:10:00.000Z' },
                    { text: '11:15 -> 11:35', value: '2018-01-19T11:15:00.000Z' },
                    { text: '11:20 -> 11:40', value: '2018-01-19T11:20:00.000Z' },
                    { text: '11:25 -> 11:45', value: '2018-01-19T11:25:00.000Z' },
                    { text: '11:30 -> 11:50', value: '2018-01-19T11:30:00.000Z' },
                    { text: '11:35 -> 11:55', value: '2018-01-19T11:35:00.000Z' },
                    { text: '11:40 -> 12:00', value: '2018-01-19T11:40:00.000Z' },
                    { text: '11:45 -> 12:05', value: '2018-01-19T11:45:00.000Z' },
                    { text: '11:50 -> 12:10', value: '2018-01-19T11:50:00.000Z' },
                    { text: '11:55 -> 12:15', value: '2018-01-19T11:55:00.000Z' },
                    { text: '12:00 -> 12:20', value: '2018-01-19T12:00:00.000Z' },
                    { text: '12:05 -> 12:25', value: '2018-01-19T12:05:00.000Z' },
                    { text: '12:10 -> 12:30', value: '2018-01-19T12:10:00.000Z' },
                    { text: '12:15 -> 12:35', value: '2018-01-19T12:15:00.000Z' },
                    { text: '12:20 -> 12:40', value: '2018-01-19T12:20:00.000Z' },
                    { text: '12:25 -> 12:45', value: '2018-01-19T12:25:00.000Z' },
                  ],
                },
              ],
            },
          ];
          const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

          massageBooking.bookMassage(payload, () => {
            slackCall.done();

            done();
          });
        });
      });
    });

    describe('list', () => {
      it('return list of bookings', (done) => {
        const realNames = Array.from(Array(6), () => faker.name.findName());
        const bookings = [];

        let user = new User(faker.random.uuid(), faker.internet.userName(), realNames[0]);
        let dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[1]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 20, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User('U25PP0KEE', faker.internet.userName(), realNames[2]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[3]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[4]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 20, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        user = new User(faker.random.uuid(), faker.internet.userName(), realNames[5]);
        dateRange = new DateRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 40, 0, 0),
          new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
        );
        bookings.push(new Booking(user, dateRange));

        Promise.all(bookings.map(booking => bookingRepository.add(booking))).catch(done).then(() => {
          const payload = {
            token: '',
            team_id: 'T25MRFT3M',
            channel_id: 'C8HTS5MEC',
            user_id: 'U25PP0KEE',
            command: '/book-massage',
            text: 'list',
            response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
            trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
          };

          timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
          const attachments = [
            { text: `10:30 -> 10:50   ${realNames[0]}` },
            { text: `11:00 -> 11:20   ${realNames[2]}`, color: '#36a64f' },
            { text: `11:20 -> 11:40   ${realNames[4]}` },
            { text: `11:40 -> 12:00   ${realNames[5]}` },
            { text: `12:00 -> 12:20   ${realNames[1]}` },
          ];
          const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

          massageBooking.bookMassage(payload, () => {
            slackCall.done();

            done();
          });
        });
      });

      it('return a nice message if there is no bookings yet', (done) => {
        const payload = {
          token: '',
          team_id: 'T25MRFT3M',
          channel_id: 'C8HTS5MEC',
          user_id: 'U25PP0KEE',
          command: '/book-massage',
          text: 'list',
          response_url: 'https://hooks.slack.com/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb',
          trigger_id: '290064239264.73739537123.0cb6e21b315eff944b90b083405e102c',
        };

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 27));
        const attachments = [
          { text: 'There is no booking yet, book a massage!', color: '#36a64f' },
        ];
        const slackCall = nockSlackCall('/commands/T25MRFT3M/290865925813/ZJM12v4tsId9wbDyjDoYa5Hb', { attachments });

        massageBooking.bookMassage(payload, () => {
          slackCall.done();

          done();
        });
      });
    });
  });

  describe('#notifyUserOfBooking()', () => {
    it('send a private message to the user of the current booking', (done) => {
      const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const dateRange = new DateRange(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0),
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 20, 0, 0),
      );

      bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
        const slackCall = nock('https://slack.com:443', { encodedQueryParams: true })
          .post('/api/chat.postMessage', `channel=${user.id}&text=The%20chair%20is%20waiting%20for%20you%2C%20go%20get%20your%20massage%20%3Amassage%3A&token=${process.env.SLACK_API_TOKEN}`)
          .reply(200, { ok: true });

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 1));

        massageBooking.notifyUserOfBooking().catch(done).then(() => {
          slackCall.done();
          done();
        });
      });
    });

    it('doesnt do anything if there is no booking currently', (done) => {
      const bookings = [];

      let user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      let dateRange = new DateRange(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0),
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 20, 0, 0),
      );
      bookings.push(new Booking(user, dateRange));

      user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      dateRange = new DateRange(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0, 0),
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 50, 0, 0),
      );
      bookings.push(new Booking(user, dateRange));

      Promise.all(bookings.map(booking => bookingRepository.add(booking))).catch(done).then(() => {
        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 25));

        massageBooking.notifyUserOfBooking().catch(done).then(() => {
          done();
        });
      });
    });

    it('notify only once per booking', (done) => {
      const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const dateRange = new DateRange(
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0),
        new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 20, 0, 0),
      );

      bookingRepository.add(new Booking(user, dateRange)).catch(done).then(() => {
        const slackCall = nock('https://slack.com:443', { encodedQueryParams: true })
          .post('/api/chat.postMessage', `channel=${user.id}&text=The%20chair%20is%20waiting%20for%20you%2C%20go%20get%20your%20massage%20%3Amassage%3A&token=${process.env.SLACK_API_TOKEN}`)
          .reply(200, { ok: true });

        timekeeper.travel(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 1));

        massageBooking.notifyUserOfBooking().catch(done).then(() => {
          slackCall.done();

          massageBooking.notifyUserOfBooking().catch(done).then(() => {
            done();
          });
        });
      });
    });
  });
});
