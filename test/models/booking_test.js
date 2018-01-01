const assert = require('assert');
const Booking = require('../../models/booking');
const DateRange = require('../../models/date_range');
const faker = require('faker');
const User = require('../../models/user');

describe('Booking', () => {
  describe('::parseJson()', () => {
    it('create a booking object from a json string', (done) => {
      const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const dateRange = new DateRange(new Date(2018, 0, 1, 18), new Date(2018, 0, 1, 19));
      const booking = new Booking(user, dateRange);

      const newBooking = Booking.parseJson(booking.toJson());

      assert(newBooking.isEqual(booking));
      assert.equal(newBooking.user.name, user.name);
      assert.equal(newBooking.user.realName, user.realName);
      done();
    });
  });

  describe('#isEqual()', () => {
    it('return true if the users and date ranges are the same', (done) => {
      const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const dateRange = new DateRange(new Date(2018, 0, 1, 18), new Date(2018, 0, 1, 19));
      const firstBooking = new Booking(user, dateRange);
      const secondBooking = new Booking(user, dateRange);

      assert(firstBooking.isEqual(secondBooking));
      done();
    });

    it('return false if the users are the same but date ranges are different', (done) => {
      const user = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const firstDateRange = new DateRange(new Date(2018, 0, 1, 18), new Date(2018, 0, 1, 19));
      const firstBooking = new Booking(user, firstDateRange);

      const secondDateRange = new DateRange(new Date(2018, 0, 1, 19), new Date(2018, 0, 1, 20));
      const secondBooking = new Booking(user, secondDateRange);

      assert(!firstBooking.isEqual(secondBooking));
      done();
    });

    it('return false if the date ranges are the same but the users are different', (done) => {
      const firstUser = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const dateRange = new DateRange(new Date(2018, 0, 1, 18), new Date(2018, 0, 1, 19));
      const firstBooking = new Booking(firstUser, dateRange);

      const secondUser = new User(faker.random.uuid(), faker.internet.userName(), faker.name.findName());
      const secondBooking = new Booking(secondUser, dateRange);

      assert(!firstBooking.isEqual(secondBooking));
      done();
    });
  });

  describe('#toJson()', () => {
    it('serialize the booking into a json string', (done) => {
      const user = new User('ABC', 'simon', 'Simon Miaou');
      const dateRange = new DateRange(
        new Date(2018, 0, 1, 18, 0),
        new Date(2018, 0, 1, 18, 20),
      );
      const booking = new Booking(user, dateRange);

      assert.equal(booking.toJson(), '{"user":{"id":"ABC","name":"simon","realName":"Simon Miaou"},"dateRange":{"start":"2018-01-01T18:00:00.000Z","end":"2018-01-01T18:20:00.000Z"}}');
      done();
    });
  });
});
