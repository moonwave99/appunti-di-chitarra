import path from "node:path";
import { load, render } from "@moonwave99/goffre";
import markedFootnote from "marked-footnote";
import { getRenderer } from "./renderer.js";
import { getHelpers } from "./helpers.js";
import pkg from "./package.json" with { type: "json" };

const { json, pages } = await load();

const url =
  process.env.NODE_ENV === "dev"
    ? `http://localhost:${process.env.PORT || 1234}`
    : process.env.URL || pkg.homepage;

const lessons = pages
  .filter((x) => x.slug.startsWith("lezioni/"))
  .toSorted((a, b) => (a.index > b.index ? 1 : -1));

await render({
  buildPath: path.join(process.cwd(), "output"),
  domain: url,
  pages: [
    ...pages.map((page) => ({
      sitemap: {
        changefreq: "monthly",
        priority: 0.8,
      },
      url,
      id: page.slug,
      language: "en",
      version: process.env.VERSION,
      lessons,
      ...json,
      ...page,
    })),
  ],
  sitemap: {
    generate: true,
  },
  handlebars: {
    helpers: getHelpers(json),
  },
  markdown: {
    renderer: getRenderer(),
    middleware: [markedFootnote],
  },
});
