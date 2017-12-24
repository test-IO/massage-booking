class DateRange {
  constructor(startAt, endAt) {
    this.startAt = startAt;
    this.endAt = endAt;
  }
}

class Reservation {
  constructor(user, dateRange) {
    this.user = user;
    this.dateRange = dateRange;
  }
}

class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

module.exports = {
  DateRange,
  Reservation,
  User,
};
