import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCatalogs, messagesOf, readCatalogs } from "./build.mjs";

const en = { "@@locale": "en", hello: "Hi {name}", "@hello": { placeholders: { name: {} } }, bye: "Bye" };

test("consistent catalogs pass", () => {
  assert.deepEqual(checkCatalogs({ en, es: { "@@locale": "es", hello: "Hola {name}", bye: "Adiós" } }), []);
});

test("reports missing, orphaned, placeholder and ICU problems", () => {
  const errors = checkCatalogs({
    en,
    fr: { "@@locale": "fr", hello: "Salut {nom}", extra: "x" },
    ca: { "@@locale": "es", hello: "Hola {name", bye: "Adéu" },
  });
  assert.deepEqual(
    new Set(errors),
    new Set([
      'ca: "@@locale" must be "ca"',
      "ca.hello: invalid ICU message (EXPECT_ARGUMENT_CLOSING_BRACE)",
      'fr: missing key "bye"',
      'fr: orphaned key "extra" (not in en)',
      "fr.hello: placeholders {nom} differ from en {name}",
    ])
  );
});

test("plural arguments count as placeholders", () => {
  const plural = { "@@locale": "en", left: "{count, plural, one {# left} other {# left}}" };
  const bad = { "@@locale": "es", left: "{n, plural, one {# queda} other {# quedan}}" };
  assert.equal(checkCatalogs({ en: plural, es: bad }).length, 1);
});

test("messagesOf drops metadata", () => {
  assert.deepEqual(messagesOf(en), { hello: "Hi {name}", bye: "Bye" });
});

test("the shipped catalogs are consistent", () => {
  assert.deepEqual(checkCatalogs(readCatalogs()), []);
});
