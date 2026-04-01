function image({ text, href }) {
  return `<figure>
      <img loading="lazy" src="${href}" alt="${text}"/>
      <figcaption>${text}</figcaption>
    </figure>`;
}

function code({ lang, text }) {
  const tokens = lang.split(" ");
  if (tokens.includes("abc") || tokens.includes("piano")) {
    return `<div ${tokens.map((x) => `data-${x}`).join(" ")}>
      <code>
${text}
      </code>
    </div>`;
  }
  return `<pre><code>${content}</code></pre>`;
}

export function getRenderer() {
  return {
    image,
    code,
  };
}
