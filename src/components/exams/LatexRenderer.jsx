import { useEffect, useRef } from "react";

export default function LatexRenderer({ content, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!content || !containerRef.current) return;

    // Simple LaTeX-like rendering for common math expressions
    const renderMath = (text) => {
      // Replace common patterns
      let rendered = text
        .replace(/\^(\d+)/g, '<sup>$1</sup>')
        .replace(/_(\d+)/g, '<sub>$1</sub>')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center text-center"><span class="border-b border-slate-900 px-1">$1</span><span class="px-1">$2</span></span>')
        .replace(/\\sqrt\{([^}]+)\}/g, '<span class="inline-flex items-center">√<span class="border-t border-slate-900">$1</span></span>')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\neq/g, '≠')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\pi/g, 'π')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\theta/g, 'θ')
        .replace(/\\infty/g, '∞')
        .replace(/\\sum/g, '∑')
        .replace(/\\int/g, '∫');

      return rendered;
    };

    containerRef.current.innerHTML = renderMath(content);
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={`latex-content ${className}`}
      style={{ display: 'inline' }}
    />
  );
}