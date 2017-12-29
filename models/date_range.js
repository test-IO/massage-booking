module.exports = class DateRange {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  isEqual(dateRange) {
    return this.start.getTime() === dateRange.start.getTime() &&
           this.end.getTime() === dateRange.end.getTime();
  }

  isIntersecting(dateRange) {
    return this.start < dateRange.end && this.end > dateRange.start;
  }
};
