
/**
 * 🔢 LaTeX Renderer - עיבוד נוסחאות מתמטיות
 * 
 * גרסה פשוטה ויעילה ללא ספריות חיצוניות
 * מציגה LaTeX בצורה ברורה וקריאה
 */

export default function LatexRenderer({ content }) {
  const renderLatex = (text) => {
    let processed = text;

    // Block math: $$...$$
    processed = processed.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
      return `<div class="math-block my-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
        <div class="text-center text-lg font-mono text-blue-900 select-all">
          ${escapeHtml(formula.trim())}
        </div>
      </div>`;
    });

    // Inline math: $...$
    processed = processed.replace(/\$([^$]+)\$/g, (match, formula) => {
      return `<span class="math-inline inline-block px-2 py-1 mx-1 bg-blue-50 text-blue-900 rounded font-mono text-sm border border-blue-200 select-all">
        ${escapeHtml(formula.trim())}
      </span>`;
    });

    return processed;
  };

  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  return (
    <div 
      className="latex-content"
      dangerouslySetInnerHTML={{ __html: renderLatex(content) }}
    />
  );
}