// Checks the ARB catalogs and emits one metadata-free JSON file per locale for apps/web.
// apps/mobile reads arb/ directly through flutter gen-l10n (see apps/mobile/l10n.yaml).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "@formatjs/icu-messageformat-parser";

const SOURCE_LOCALE = "en";

/** Message entries only: drops `@@locale` and every `@key` metadata entry. */
export function messagesOf(arb) {
  return Object.fromEntries(Object.entries(arb).filter(([key]) => !key.startsWith("@")));
}

function argumentNames(elements, names = new Set()) {
  for (const el of elements) {
    if (typeof el.value === "string" && el.type !== 0 /* literal */) names.add(el.value);
    for (const option of Object.values(el.options ?? {})) argumentNames(option.value, names);
    if (el.children) argumentNames(el.children, names);
  }
  return names;
}

/** Returns a list of human-readable problems; empty means the catalogs are consistent. */
export function checkCatalogs(catalogs) {
  const errors = [];
  const source = messagesOf(catalogs[SOURCE_LOCALE] ?? {});
  const parsed = {};

  for (const [locale, arb] of Object.entries(catalogs)) {
    if (arb["@@locale"] !== locale) errors.push(`${locale}: "@@locale" must be "${locale}"`);
    const messages = messagesOf(arb);
    parsed[locale] = {};
    for (const [key, message] of Object.entries(messages)) {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(key))
        errors.push(`${locale}.${key}: key must be camelCase (a Dart identifier)`);
      try {
        parsed[locale][key] = argumentNames(parse(message));
      } catch (error) {
        errors.push(`${locale}.${key}: invalid ICU message (${error.message})`);
      }
    }
    if (locale === SOURCE_LOCALE) continue;
    for (const key of Object.keys(source)) {
      if (!(key in messages)) errors.push(`${locale}: missing key "${key}"`);
    }
    for (const key of Object.keys(messages)) {
      if (!(key in source)) errors.push(`${locale}: orphaned key "${key}" (not in ${SOURCE_LOCALE})`);
    }
  }

  for (const [locale, keys] of Object.entries(parsed)) {
    if (locale === SOURCE_LOCALE) continue;
    for (const [key, names] of Object.entries(keys)) {
      const expected = parsed[SOURCE_LOCALE]?.[key];
      if (!expected) continue;
      const same = names.size === expected.size && [...names].every((name) => expected.has(name));
      if (!same) {
        errors.push(
          `${locale}.${key}: placeholders {${[...names]}} differ from ${SOURCE_LOCALE} {${[...expected]}}`
        );
      }
    }
  }
  return errors;
}

const root = fileURLToPath(new URL("..", import.meta.url));

export function readCatalogs() {
  return Object.fromEntries(
    readdirSync(`${root}/arb`)
      .filter((file) => file.endsWith(".arb"))
      .map((file) => [file.slice(0, -4), JSON.parse(readFileSync(`${root}/arb/${file}`, "utf8"))])
  );
}

function main() {
  const catalogs = readCatalogs();
  const errors = checkCatalogs(catalogs);
  if (errors.length > 0) {
    console.error(`i18n: ${errors.length} catalog problem(s):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }

  mkdirSync(`${root}/dist`, { recursive: true });
  for (const [locale, arb] of Object.entries(catalogs)) {
    writeFileSync(`${root}/dist/${locale}.json`, `${JSON.stringify(messagesOf(arb), null, 2)}\n`);
  }
  console.log(`i18n: built ${Object.keys(catalogs).join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
