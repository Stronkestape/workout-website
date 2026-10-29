import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  validateUsername,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
} from "../src/utils/validators.js";

test("isValidEmail - accepts valid standard and plus-tagged emails, including whitespace trimming", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("coach.anna+hiit@gym.studio.hu"), true);
  assert.equal(isValidEmail("  trimmed@example.com  "), true);
});

test("isValidEmail - rejects malformed emails and non-string inputs safely", () => {
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("   "), false);
  assert.equal(isValidEmail("plainaddress"), false);
  assert.equal(isValidEmail("@missing-local.com"), false);
  assert.equal(isValidEmail("user@missing-tld"), false);
  assert.equal(isValidEmail("user name@example.com"), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(12345), false);
});

test("validateUsername - normalizes to lowercase, trims, and enforces 3-100 char length and allowed character set", () => {
  // Valid and normalized
  const valid = validateUsername("  Coach_John.99  ");
  assert.equal(valid.isValid, true);
  assert.equal(valid.cleanUsername, "coach_john.99");

  // Exact boundaries (3 and 100 chars)
  assert.equal(validateUsername("abc").isValid, true);
  assert.equal(validateUsername("a".repeat(100)).isValid, true);

  // Out-of-bounds (< 3 or > 100 chars)
  const tooShort = validateUsername("ab");
  assert.equal(tooShort.isValid, false);
  assert.equal(tooShort.error, "Username must be at least 3 characters");

  const tooLong = validateUsername("a".repeat(101));
  assert.equal(tooLong.isValid, false);
  assert.equal(tooLong.error, "Username must be at most 100 characters");

  // Disallowed characters (SQL injection / XSS / special chars)
  assert.equal(validateUsername("admin'--").isValid, false);
  assert.equal(validateUsername("<script>alert(1)</script>").isValid, false);
  assert.equal(validateUsername("user@domain").isValid, false);

  // Empty or non-string inputs
  assert.equal(validateUsername("").isValid, false);
  assert.equal(validateUsername("   ").isValid, false);
  assert.equal(validateUsername(null).isValid, false);
  assert.equal(validateUsername(undefined).isValid, false);
});

test("validatePassword & validatePasswordMatch - enforce minimum 6 character boundary and exact confirmation match", () => {
  assert.equal(validatePassword("12345").isValid, false);
  assert.equal(validatePassword("123456").isValid, true);
  assert.equal(validatePassword("strongP@ssw0rd!").isValid, true);
  assert.equal(validatePassword("").isValid, false);
  assert.equal(validatePassword(null).isValid, false);
  assert.equal(validatePassword(123456).isValid, false);

  assert.equal(validatePasswordMatch("secret123", "secret123").isValid, true);
  const mismatch = validatePasswordMatch("secret123", "secret456");
  assert.equal(mismatch.isValid, false);
  assert.equal(mismatch.error, "Passwords do not match");
});

test("validateFullName - allows optional empty name and rejects > 100 character names", () => {
  assert.equal(validateFullName("").isValid, true);
  assert.equal(validateFullName("   ").isValid, true);
  assert.equal(validateFullName(null).isValid, true);
  assert.equal(validateFullName("Kovács János").isValid, true);
  assert.equal(validateFullName("A".repeat(100)).isValid, true);

  const tooLong = validateFullName("A".repeat(101));
  assert.equal(tooLong.isValid, false);
  assert.equal(tooLong.error, "Full name is too long");
});
