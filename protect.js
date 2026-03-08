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
<script>
// Protection anti-copie
(function(){
  // Bloquer clic droit
  document.addEventListener('contextmenu',function(e){e.preventDefault();return false;});
  // Bloquer raccourcis clavier
  document.addEventListener('keydown',function(e){
    // F12
    if(e.key==='F12'){e.preventDefault();return false;}
    // Ctrl+U (source)
    if(e.ctrlKey&&e.key==='u'){e.preventDefault();return false;}
    // Ctrl+S (sauvegarder)
    if(e.ctrlKey&&e.key==='s'){e.preventDefault();return false;}
    // Ctrl+Shift+I (devtools)
    if(e.ctrlKey&&e.shiftKey&&e.key==='I'){e.preventDefault();return false;}
    // Ctrl+Shift+J (console)
    if(e.ctrlKey&&e.shiftKey&&e.key==='J'){e.preventDefault();return false;}
    // Ctrl+Shift+C (inspect)
    if(e.ctrlKey&&e.shiftKey&&e.key==='C'){e.preventDefault();return false;}
  });
  // Bloquer drag
  document.addEventListener('dragstart',function(e){e.preventDefault();});
  // Bloquer sélection (optionnel, on laisse la sélection de texte pour l'UX)
  // Anti devtools : détecter ouverture
  var dT=new Image();Object.defineProperty(dT,'id',{get:function(){document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;font-size:1.5rem;color:#e74c3c;text-align:center;padding:20px">⛔ Inspection non autorisée.<br>Veuillez fermer les outils développeur.</div>';}});
  setInterval(function(){console.log(dT);},2000);
})();
</script>`;

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) { console.log('SKIP:', file); continue; }
  
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Vérifier si déjà protégé
  if (html.includes('Protection anti-copie')) {
    console.log('DÉJÀ PROTÉGÉ:', file);
    continue;
  }

  // Encoder le contenu du body en base64
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) { console.log('PAS DE BODY:', file); continue; }
  
  const bodyContent = bodyMatch[1];
  const encodedBody = Buffer.from(bodyContent, 'utf8').toString('base64');
  
  // Extraire les attributs du body
  const bodyTagMatch = html.match(/<body([^>]*)>/i);
  const bodyAttrs = bodyTagMatch ? bodyTagMatch[1] : '';
  
  // Remplacer le body par un loader + décodage
  const newBody = `<body${bodyAttrs}>
<div id="_ldr" style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">Chargement...</div>
${protectionScript}
<script>
(function(){
  var _d=atob("${encodedBody.replace(/"/g, '\\"')}");
  document.getElementById('_ldr').outerHTML=_d;
  // Ré-exécuter les scripts
  var scripts=document.body.querySelectorAll('script:not([data-prot])');
  scripts.forEach(function(s){
    if(s.textContent.indexOf('Protection anti-copie')>-1)return;
    if(s.textContent.indexOf('atob')>-1)return;
    var ns=document.createElement('script');
    if(s.src){ns.src=s.src;}
    if(s.type){ns.type=s.type;}
    ns.textContent=s.textContent;
    ns.setAttribute('data-prot','1');
    s.parentNode.replaceChild(ns,s);
  });
})();
</script>
</body>`;
  
  html = html.replace(/<body[\s\S]*<\/body>/i, newBody);
  
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('PROTÉGÉ:', file, '- taille:', (html.length/1024).toFixed(1), 'KB');
}

console.log('\nTerminé !');
