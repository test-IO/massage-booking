module.exports = class Booking {
  static parseJson(json) {
    JSON.parse(json);

    return new Booking();
  }

  constructor(user, dateRange) {
    this.user = user;
    this.dateRange = dateRange;
  }

  isEqual(booking) {
    return true;
  }

  toJson() {
    return JSON.stringify(this);
  }
};
