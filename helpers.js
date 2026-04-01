import { helpers } from "@moonwave99/goffre";

function formatDate({ hash }) {
  const { date, format } = hash;
  if (format == "timestamp") {
    return new Date(date).toISOString().split("T").at(0);
  }
  return new Date(date).toLocaleDateString("en-EN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getUrl(slug, context) {
  return helpers.getLink({ slug }, context);
}

function getNavClass(slug, context) {
  return context.data.root.slug.startsWith(slug) ? "active" : "";
}

function isHomepage(context) {
  if (context.data.root.slug !== "index") {
    return;
  }
  return context.fn(this);
}

function isCourse(context) {
  if (!context.data.root.slug.startsWith("course")) {
    return;
  }
  return context.fn(this);
}

export function getHelpers() {
  return {
    formatDate,
    getUrl,
    getNavClass,
    isHomepage,
    isCourse,
  };
}
