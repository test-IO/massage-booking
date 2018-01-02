const DateRange = require('./date_range');
const User = require('./user');

module.exports = class Booking {
  static parseJson(jsonString) {
    const json = JSON.parse(jsonString);

    const user = new User(json.user.id, json.user.name, json.user.realName);
    const dateRange = new DateRange(new Date(json.dateRange.start), new Date(json.dateRange.end));

    return new Booking(user, dateRange);
  }

  constructor(user, dateRange) {
    this.user = user;
    this.dateRange = dateRange;
  }

  isEqual(booking) {
    return this.user.id === booking.user.id && this.dateRange.isEqual(booking.dateRange);
  }

  toJson() {
    return JSON.stringify(this);
  }
};
