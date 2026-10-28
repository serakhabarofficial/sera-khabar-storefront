import assert from "node:assert/strict";
import test from "node:test";
import { banglaDate, banglaDateParts } from "./bangla-date";

// Dhaka noon, so the instant is unambiguous whatever the machine's timezone.
const dhaka = (iso: string) => new Date(`${iso}T12:00:00+06:00`);

test("starts the year on ১ বৈশাখ (14 April)", () => {
  assert.equal(banglaDate(dhaka("2026-04-14")), "১ বৈশাখ ১৪৩৩");
  assert.equal(banglaDate(dhaka("2027-04-13")), "৩০ চৈত্র ১৪৩৩");
});

test("matches Bangladesh's fixed national days", () => {
  assert.equal(banglaDate(dhaka("2026-12-16")), "১ পৌষ ১৪৩৩");
  assert.equal(banglaDate(dhaka("2027-02-21")), "৮ ফাল্গুন ১৪৩৩");
  assert.equal(banglaDate(dhaka("2027-03-26")), "১২ চৈত্র ১৪৩৩");
  assert.equal(banglaDate(dhaka("2026-10-28")), "১২ কার্তিক ১৪৩৩");
});

test("gives ফাল্গুন 30 days in a Gregorian leap year", () => {
  assert.equal(banglaDate(dhaka("2027-03-14")), "২৯ ফাল্গুন ১৪৩৩");
  assert.equal(banglaDate(dhaka("2027-03-15")), "১ চৈত্র ১৪৩৩");
  assert.equal(banglaDate(dhaka("2028-03-14")), "৩০ ফাল্গুন ১৪৩৪");
  assert.equal(banglaDate(dhaka("2028-03-15")), "১ চৈত্র ১৪৩৪");
});

test("rolls over at midnight in Dhaka, not in the visitor's timezone", () => {
  assert.equal(banglaDate(new Date("2026-04-13T18:30:00Z")), "১ বৈশাখ ১৪৩৩"); // 00:30 on 14 April in Dhaka
  assert.equal(banglaDate(new Date("2026-04-13T17:30:00Z")), "৩০ চৈত্র ১৪৩২"); // 23:30 on 13 April in Dhaka
});

test("splits the date for the calendar page", () => {
  assert.deepEqual(banglaDateParts(dhaka("2026-10-28")), { day: "১২", month: "কার্তিক", year: "১৪৩৩" });
});
