// Mochi-chan, the mascot of the original Nihongo app (hand-drawn SVG, uses theme colours).
export function mascot(expr, size){
  expr=expr||"happy"; size=size||120;
  const a="var(--accent)", ink="var(--ink)", bg2="var(--bg2)", soft="var(--soft)";
  // eyes & mouth per expression
  let eyes, mouth, cheeks="";
  if(expr==="happy"){
    eyes=`<path d="M38 52 q5 -6 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M72 52 q5 -6 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    mouth=`<path d="M52 64 q8 8 16 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    cheeks=`<ellipse cx="36" cy="60" rx="6" ry="4" fill="${a}" opacity=".3"/><ellipse cx="84" cy="60" rx="6" ry="4" fill="${a}" opacity=".3"/>`;
  }else if(expr==="proud"){
    eyes=`<path d="M38 50 q5 -7 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M72 50 q5 -7 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    mouth=`<path d="M50 62 q10 10 20 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    cheeks=`<ellipse cx="36" cy="58" rx="7" ry="5" fill="${a}" opacity=".35"/><ellipse cx="84" cy="58" rx="7" ry="5" fill="${a}" opacity=".35"/>`;
  }else if(expr==="sleepy"){
    eyes=`<line x1="38" y1="54" x2="48" y2="54" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
          <line x1="72" y1="54" x2="82" y2="54" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    mouth=`<circle cx="60" cy="64" r="3" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
  }else if(expr==="thinking"){
    eyes=`<circle cx="43" cy="53" r="3" fill="${ink}"/><circle cx="77" cy="53" r="3" fill="${ink}"/>`;
    mouth=`<path d="M54 65 q6 -3 12 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }else{ // cheer
    eyes=`<path d="M38 54 q5 -8 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M72 54 q5 -8 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    mouth=`<path d="M50 60 q10 14 20 0" stroke="${ink}" stroke-width="3" fill="${a}" fill-opacity=".25" stroke-linecap="round"/>`;
    cheeks=`<ellipse cx="35" cy="60" rx="7" ry="5" fill="${a}" opacity=".35"/><ellipse cx="85" cy="60" rx="7" ry="5" fill="${a}" opacity=".35"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" style="display:block">
    <!-- body: soft mochi -->
    <ellipse cx="60" cy="68" rx="42" ry="40" fill="${bg2}" stroke="${a}" stroke-width="2.5"/>
    <!-- little ears -->
    <path d="M30 38 q-4 -16 12 -14 q-2 10 -2 16 z" fill="${bg2}" stroke="${a}" stroke-width="2.5"/>
    <path d="M90 38 q4 -16 -12 -14 q2 10 2 16 z" fill="${bg2}" stroke="${a}" stroke-width="2.5"/>
    <!-- inner ear -->
    <path d="M34 30 q2 -6 7 -5" stroke="${a}" stroke-width="2" fill="none"/>
    <path d="M86 30 q-2 -6 -7 -5" stroke="${a}" stroke-width="2" fill="none"/>
    ${cheeks}
    ${eyes}
    ${mouth}
    <!-- forehead mark: a tiny 心 (heart/mind) dot for character -->
    <text x="60" y="40" text-anchor="middle" font-size="13" fill="${a}" opacity=".75" font-family="serif">ñ</text>
  </svg>`;
}
