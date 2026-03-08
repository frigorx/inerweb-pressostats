const fs = require('fs');
const path = require('path');

const files = [
  'kp1-pressostat-bp.html',
  'kp5-pressostat-hp.html',
  'echangeurs.html',
  'lecon-scroll.html',
  'frigolo-mollier.html',
  'td-triphase-couplage.html'
];

const protectionScript = `
<script data-prot="1">
(function(){
  document.addEventListener('contextmenu',function(e){e.preventDefault();return false;});
  document.addEventListener('keydown',function(e){
    if(e.key==='F12'){e.preventDefault();return false;}
    if(e.ctrlKey&&(e.key==='u'||e.key==='s')){e.preventDefault();return false;}
    if(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C')){e.preventDefault();return false;}
  });
  document.addEventListener('dragstart',function(e){e.preventDefault();});
  var dT=new Image();Object.defineProperty(dT,'id',{get:function(){document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;font-size:1.5rem;color:#e74c3c;text-align:center;padding:20px">Inspection non autorisée.<br>Veuillez fermer les outils développeur.</div>';}});
  setInterval(function(){console.log(dT);},2000);
})();
</script>`;

// Restaurer d'abord les originaux depuis git
const { execSync } = require('child_process');

for (const file of files) {
  // Restaurer l'original
  try {
    execSync(`git checkout HEAD~1 -- ${file}`, { cwd: __dirname });
  } catch(e) {
    // Fichier ajouté avant le dernier commit
    try {
      execSync(`git checkout HEAD~2 -- ${file}`, { cwd: __dirname });
    } catch(e2) {
      try { execSync(`git checkout HEAD~3 -- ${file}`, { cwd: __dirname }); } catch(e3) {}
    }
  }
}

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) { console.log('SKIP:', file); continue; }
  
  let html = fs.readFileSync(filePath, 'utf8');
  const hasBabel = html.includes('babel');
  
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
  if (!bodyMatch) { console.log('PAS DE BODY:', file); continue; }
  
  const bodyAttrs = bodyMatch[1];
  const bodyContent = bodyMatch[2];
  const encodedBody = Buffer.from(bodyContent, 'utf8').toString('base64');
  
  // Chunk le base64 pour éviter les problèmes de taille de string
  const chunks = encodedBody.match(/.{1,32000}/g) || [encodedBody];
  const chunksJs = chunks.map((c,i) => `var _c${i}="${c}";`).join('\n');
  const concatJs = chunks.map((_,i) => `_c${i}`).join('+');
  
  let reExecScript;
  if (hasBabel) {
    // Pour les fichiers Babel/React : utiliser Babel.transformScriptTags() après injection
    reExecScript = `
<script data-prot="1">
(function(){
  ${chunksJs}
  var _d=atob(${concatJs});
  document.getElementById('_ldr').outerHTML=_d;
  // Ré-exécuter les scripts classiques
  var scripts=document.body.querySelectorAll('script:not([data-prot])');
  var toReplace=[];
  scripts.forEach(function(s){toReplace.push(s);});
  toReplace.forEach(function(s){
    var ns=document.createElement('script');
    if(s.src)ns.src=s.src;
    if(s.type)ns.type=s.type;
    ns.textContent=s.textContent;
    ns.setAttribute('data-prot','1');
    s.parentNode.replaceChild(ns,s);
  });
  // Déclencher Babel sur les nouveaux scripts text/babel
  if(typeof Babel!=='undefined'&&Babel.transformScriptTags){
    setTimeout(function(){Babel.transformScriptTags();},100);
  }
})();
</script>`;
  } else {
    reExecScript = `
<script data-prot="1">
(function(){
  ${chunksJs}
  var _d=atob(${concatJs});
  document.getElementById('_ldr').outerHTML=_d;
  var scripts=document.body.querySelectorAll('script:not([data-prot])');
  var toReplace=[];
  scripts.forEach(function(s){toReplace.push(s);});
  toReplace.forEach(function(s){
    var ns=document.createElement('script');
    if(s.src)ns.src=s.src;
    if(s.type)ns.type=s.type;
    ns.textContent=s.textContent;
    ns.setAttribute('data-prot','1');
    s.parentNode.replaceChild(ns,s);
  });
})();
</script>`;
  }
  
  const newBody = `<body${bodyAttrs}>
<div id="_ldr" style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">Chargement...</div>
${protectionScript}
${reExecScript}
</body>`;
  
  html = html.replace(/<body[\s\S]*<\/body>/i, newBody);
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('PROTÉGÉ:', file, hasBabel ? '(+Babel)' : '', '- taille:', (html.length/1024).toFixed(1), 'KB');
}

console.log('\nTerminé !');
