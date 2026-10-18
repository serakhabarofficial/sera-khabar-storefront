import assert from "node:assert/strict";
import { test } from "node:test";
import { DISTRICTS, THANAS } from "./bd-locations-data.ts";
import { composeDeliveryAddress, deliveryWindow, searchDistricts, thanasOf } from "./bd-locations.ts";

const districtId = (english: string) => DISTRICTS.find((row) => row[2] === english)![0];

test("covers all 64 districts, and every thana belongs to one of them", () => {
  assert.equal(DISTRICTS.length, 64);
  const ids = new Set(DISTRICTS.map((row) => row[0]));
  assert.ok(THANAS.length > 590);
  assert.ok(THANAS.every((row) => ids.has(row[1])));
});

test("district search works in Bangla, English and old spellings, busy districts first", () => {
  assert.equal(searchDistricts("raj")[0][1], "রাজশাহী");
  assert.equal(searchDistricts("ঢাকা")[0][2], "Dhaka");
  assert.equal(searchDistricts("chittagong")[0][2], "Chattogram");
  assert.equal(searchDistricts("bogra")[0][2], "Bogura");
  assert.deepEqual(searchDistricts("zzz"), []);
  assert.equal(searchDistricts("").length, 64);
});

test("Dhaka lists its city thanas before its upazilas, and search narrows them", () => {
  const dhaka = thanasOf(districtId("Dhaka"));
  const firstUpazila = dhaka.findIndex((row) => row[4] === 0);
  assert.ok(firstUpazila > 0);
  assert.ok(dhaka.slice(firstUpazila).every((row) => row[4] === 0));
  assert.ok(dhaka.some((row) => row[2] === "সাভার"));
  assert.equal(thanasOf(districtId("Dhaka"), "mirpur")[0][3].toLowerCase().startsWith("mirpur"), true);
  assert.deepEqual(thanasOf(null), []);
});

test("delivery estimate follows the policy: Dhaka 1–2 days, elsewhere 2–3 days", () => {
  const today = new Date(2026, 9, 18);
  assert.equal(deliveryWindow(districtId("Dhaka"), today), "১৯–২০ অক্টোবর");
  assert.equal(deliveryWindow(districtId("Rajshahi"), today), "২০–২১ অক্টোবর");
  assert.equal(deliveryWindow(districtId("Rajshahi"), new Date(2026, 9, 29)), "৩১ অক্টোবর – ১ নভেম্বর");
  assert.equal(deliveryWindow(null, today), null);
});

test("the courier gets one line: street, থানা, জেলা", () => {
  const dhaka = districtId("Dhaka");
  const savar = thanasOf(dhaka).find((row) => row[2] === "সাভার")![0];
  assert.equal(composeDeliveryAddress("  বাড়ি ১২, রোড ৩ ", savar, dhaka), "বাড়ি ১২, রোড ৩, সাভার, ঢাকা");
});
