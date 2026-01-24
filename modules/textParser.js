// export function formatBotMessage(rawText) {
//   // Step 1: Convert markdown code blocks to <pre><code>
//   rawText = rawText.replace(
//     /`{1,3}markdown<br>([\s\S]*?)<br>`{1,3}/g,
//     (match, code) => {
//       return `<pre><code>${code}</code></pre>`;
//     }
//   );

//   // Step 2: Convert triple backtick blocks (non-markdown)
//   rawText = rawText.replace(
//     /```(?:\w+)?<br>([\s\S]*?)<br>```/g,
//     "<pre><code>$1</code></pre>"
//   );

//   // Step 3: Apply formatting outside code blocks
//   return (
//     rawText
//       // Headings
//       .replace(/(?:<br>)?###### (.*?)(?=<br>|$)/g, "<h6>$1</h6>")
//       .replace(/(?:<br>)?##### (.*?)(?=<br>|$)/g, "<h5>$1</h5>")
//       .replace(/(?:<br>)?#### (.*?)(?=<br>|$)/g, "<h4>$1</h4>")
//       .replace(/(?:<br>)?### (.*?)(?=<br>|$)/g, "<h3>$1</h3>")
//       .replace(/(?:<br>)?## (.*?)(?=<br>|$)/g, "<h2>$1</h2>")
//       .replace(/(?:<br>)?# (.*?)(?=<br>|$)/g, "<h1>$1</h1>")

//       // Bold, Italic, Strikethrough
//       .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
//       .replace(/___(.*?)___/g, "<strong><em>$1</em></strong>")
//       .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
//       .replace(/__(.*?)__/g, "<strong>$1</strong>")
//       .replace(/\*(.*?)\*/g, "<em>$1</em>")
//       .replace(/_(.*?)_/g, "<em>$1</em>")
//       .replace(/~~(.*?)~~/g, "<del>$1</del>")

//       // Inline code
//       .replace(/`([^`]+)`/g, "<code>$1</code>")

//       // Links
//       .replace(
//         /\[([^\]]+)\]\(([^)]+)\)/g,
//         '<a href="$2" target="_blank">$1</a>'
//       )
//       // Task lists: - [ ] or - [x] → <input type="checkbox">
//       .replace(
//         /-\[ \](.*?)(?=<br>|$)/g,
//         '<li><input type="checkbox" disabled> $1</li>'
//       )
//       .replace(
//         /-\[x\](.*?)(?=<br>|$)/gi,
//         '<li><input type="checkbox" checked disabled> $1</li>'
//       )
//       .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")

//       // Images: ![alt](url) → <img alt="alt" src="url">
//       .replace(
//         /!\[([^\]]*)\]\(([^)]+)\)/g,
//         '<img src="$2" alt="$1" style="max-width:100%; border-radius:6px;">'
//       )

//       // Blockquotes
//       .replace(/(?:<br>)?> (.*?)(?=<br>|$)/g, "<blockquote>$1</blockquote>")

//       // Horizontal rules
//       .replace(/(?:<br>)?(?:---|\*\*\*|___)(?:<br>)?/g, "<hr>")

//       // Lists
//       .replace(/(?:<br>)?[-*+] (.*?)(?=<br>|$)/g, "<li>$1</li>")
//       .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
//       .replace(/(?:<br>)?\d+\.\s+(.*?)(?=<br>|$)/g, "<li>$1</li>")
//       .replace(/(<li>.*<\/li>)/gs, "<ol>$1</ol>")

//       // Tables
//       .replace(
//         /\|(.+?)\|<br>\|[-| ]+\|<br>([\s\S]*?)<br>/g,
//         (match, headers, rows) => {
//           const headerCells = headers
//             .split("|")
//             .map((h) => `<th>${h.trim()}</th>`)
//             .join("");
//           const rowLines = rows.trim().split("<br>");
//           const rowCells = rowLines
//             .map(
//               (line) =>
//                 "<tr>" +
//                 line
//                   .split("|")
//                   .map((cell) => `<td>${cell.trim()}</td>`)
//                   .join("") +
//                 "</tr>"
//             )
//             .join("");
//           return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rowCells}</tbody></table>`;
//         }
//       )

//       // Line breaks
//       .replace(/\n/g, "<br>")
//   );
// }

// -----------
export function formatBotMessage(text) {
  let html = text;

  // ========== CODE ==========
  // 1. Extract code blocks first
  const codeBlocks = [];
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    codeBlocks.push({ lang: lang || "text", code });
    return `@@CODEBLOCK_${codeBlocks.length - 1}@@`;
  });

  // 2. Extract inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodes.push(code);
    return `§§INLINECODE_${inlineCodes.length - 1}§§`;
  });

  // Escape HTML
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // ========== HEADINGS ==========
  html = html.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
  html = html.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
  html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // ========== BOLD + ITALIC ==========
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, "<b><i>$1</i></b>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<b>$1</b>");
  html = html.replace(/\*(.*?)\*/gim, "<i>$1</i>");
  html = html.replace(/_(.*?)_/gim, "<i>$1</i>");

  // ========== CHECKLISTS ==========
  html = html.replace(/^- \[x\] (.*)$/gim, '<li class="checked">✅ $1</li>');
  html = html.replace(/^- \[ \] (.*)$/gim, '<li class="unchecked">⬜ $1</li>');

  // ---------- UNORDERED LISTS ----------
  html = html.replace(/^\s*[-*+] (.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

  // ---------- NUMBERED LISTS ----------
  html = html.replace(/^\s*\d+\. (.*)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gims, "<ol>$1</ol>");

  // ========== BLOCKQUOTES ==========
  html = html.replace(/^> (.*$)/gim, `<blockquote>$1</blockquote>`);

  // Inline math \( ... \)
  html = html.replace(/\\\((.*?)\\\)/gs, (match, expr) => {
    return `<span class="math-inline">${convertSimpleMath(expr.trim())}</span>`;
  });

  // Block math \[ ... \]

  html = html.replace(/\\\[(.*?)\\\]/gs, (match, expr) => {
    return `<div class="math-block">${convertSimpleMath(expr.trim())}</div>`;
  });

  // Block math $$...$$
  html = html.replace(/\$\$(.*?)\$\$/gs, (match, expr) => {
    return `<div class="math-block">${convertSimpleMath(expr.trim())}</div>`;
  });

  // Inline math $...$
  html = html.replace(/\$(.*?)\$/g, (match, expr) => {
    return `<span class="math-inline">${convertSimpleMath(expr.trim())}</span>`;
  });

  function convertSimpleMath(expr) {
    return (
      expr

        // Superscript with braces: x^{2n+1}
        .replace(/([A-Za-z0-9])\^\{([^}]+)\}/g, "$1<sup>$2</sup>")

        // Subscript with braces: x_{i+1}
        .replace(/([A-Za-z0-9])_\{([^}]+)\}/g, "$1<sub>$2</sub>")

        // Simple superscript: x^2
        .replace(/([A-Za-z0-9])\^([A-Za-z0-9]+)/g, "$1<sup>$2</sup>")

        // Simple subscript: x_2
        .replace(/([A-Za-z0-9])_([A-Za-z0-9]+)/g, "$1<sub>$2</sub>")

        // Fractions: \frac{a}{b}
        .replace(
          /\\frac\{([^}]+)\}\{([^}]+)\}/g,
          "<span class='frac'><span>$1</span><span>$2</span></span>"
        )

        // Square roots: \sqrt{x}
        .replace(/\\sqrt\{([^}]+)\}/g, "√($1)")

        // Greek letters
        .replace(/\\alpha/g, "α")
        .replace(/\\beta/g, "β")
        .replace(/\\gamma/g, "γ")
        .replace(/\\pi/g, "π")

        // Math operators
        .replace(/\\times/g, "×")
        .replace(/\\cdot/g, "·")
        .replace(/\\div/g, "÷")
        .replace(/\\pm/g, "±")
        .replace(/\\mp/g, "∓")
        .replace(/\\leq?/g, "≤")
        .replace(/\\geq?/g, "≥")
        .replace(/\\neq/g, "≠")
        .replace(/\\approx/g, "≈")
        .replace(/\\infty/g, "∞")
        .replace(/\\to/g, "→")
        .replace(/\\Rightarrow/g, "⇒")

        // Remove \left and \right (LLMs love adding these)
        .replace(/\\left/g, "")
        .replace(/\\right/g, "")
    );
  }

  // ========== TABLES ==========
  if (/\|(.+)\|/g.test(html)) {
    html = html.replace(
      /^\|(.+)\|\s*\n\|([-\s|:]+)\|\s*\n((\|.*\|\s*\n)+)/gims,
      (match, header, dividers, body) => {
        const headers = header
          .split("|")
          .map((h) => `<th>${h.trim()}</th>`)
          .join("");
        const rows = body
          .trim()
          .split("\n")
          .map(
            (row) =>
              "<tr>" +
              row
                .split("|")
                .map((cell) => `<td>${cell.trim()}</td>`)
                .join("") +
              "</tr>"
          )
          .join("");

        return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
      }
    );
  }

  // ========== HORIZONTAL RULE ==========
  html = html.replace(/^---$/gim, "<hr>");

  // ========== LINE BREAKS ==========
  html = html.replace(/\n{2,}/gim, "<br><br>");

  // ========== LINKS ==========
  html = html.replace(
    /\[(.*?)\]\((.*?)\)/gim,
    `<a href="$2" target="_blank">$1</a>`
  );

  // YouTube Links → Embed
  html = html.replace(
    /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu.be\/)([\w-]+))/g,
    `<div class="video-wrapper">
        <iframe src="https://www.youtube.com/embed/$2" frameborder="0" allowfullscreen></iframe>
     </div>`
  );

  // ========== IMAGES ==========
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, `<img src="$2" alt="$1" />`);

  // ========== CODE ==========
  // 3. Restore code blocks with header + copy button
  html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (match, index) => {
    const { lang, code } = codeBlocks[index];
    const cleanCode = code.trim();

    return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">${lang}</span>
        <button class="code-copy-btn">
          <img src="../icons/copy.png" alt="Copy" />
        </button>
      </div>
      <pre><code>${cleanCode
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</code></pre>
    </div>
  `;
  });

  // 4. Restore inline code
  html = html.replace(/§§INLINECODE_(\d+)§§/g, (match, index) => {
    const code = inlineCodes[index];
    return `<code>${code}</code>`;
  });

  return html.trim();
}
