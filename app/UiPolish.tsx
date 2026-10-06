"use client";

import { useEffect } from "react";

const REPLACEMENTS: Array<[string, string]> = [
  ["â‚¹", "₹"],
  ["â€¦", "…"],
  ["â†’", "→"],
  ["â†—", "↗"],
  ["â†", "←"],
  ["â€¹", "‹"],
  ["â€º", "›"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€�", "”"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["âœ“", "✓"],
  ["âœ¨", "✨"],
  ["â˜", "☁"],
  ["â–¶", "▶"],
  ["â—Ž", "◎"],
  ["â—Œ", "◌"],
  ["Ã—", "×"],
  ["Â·", "·"],
  ["Â ", " "],
  ["PRODUCT INTELLIGENCE V2", "PRODUCT INTELLIGENCE"],
  ["CREATIVE DIRECTOR V2", "CREATIVE DIRECTOR"],
  ["AI MERCHANDISER V2", "AI MERCHANDISER"],
  ["Open deeper reasoning", "Live reasoning & actions"],
];

function repair(value: string) {
  let next = value;
  for (const [bad, good] of REPLACEMENTS) next = next.split(bad).join(good);
  return next;
}

function polishElement(element: Element) {
  if (element instanceof HTMLDetailsElement && element.classList.contains("depthDetails")) {
    element.open = true;
  }

  for (const attr of ["placeholder", "title", "aria-label"]) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    const fixed = repair(value);
    if (fixed !== value) element.setAttribute(attr, fixed);
  }

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent || "";
      const fixed = repair(value);
      if (fixed !== value) node.textContent = fixed;
    } else if (node instanceof Element) {
      polishElement(node);
    }
  }
}

export default function UiPolish() {
  useEffect(() => {
    polishElement(document.body);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const node = mutation.target;
          const value = node.textContent || "";
          const fixed = repair(value);
          if (fixed !== value) node.textContent = fixed;
          continue;
        }

        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const value = node.textContent || "";
            const fixed = repair(value);
            if (fixed !== value) node.textContent = fixed;
          } else if (node instanceof Element) {
            polishElement(node);
          }
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return <style>{`
    #product-graph,
    #media-doctor,
    #creative-lab {
      display: flex;
      flex-direction: column;
    }

    #product-graph > .intelHead { order: 0; }
    #product-graph > .graphFlow { order: 1; }
    #product-graph > .graphProofStrip { order: 2; }
    #product-graph > .depthDetails { order: 3; }
    #product-graph > .reconstructionReceipt { order: 4; }

    #media-doctor > .intelHead,
    #creative-lab > .intelHead { order: 0; }

    #media-doctor > .depthDetails,
    #creative-lab > .depthDetails { order: 1; }

    #media-doctor > :not(.intelHead):not(.depthDetails),
    #creative-lab > :not(.intelHead):not(.depthDetails) { order: 2; }
  `}</style>;
}
