(function(){
  const A = window.App;

  A.renderParametres = () => {
    A.ensureSettings();
    const s = A.state.settings;
    const esc = v => String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

    // Lignes de dépenses disponibles pour le mapping
    const depLines = A.state.lines.filter(l => l.type==='dépense' && l.actif);
    const groupes = s.groupesMobiles || [];

    // Toutes catégories mobiles dépenses
    const allMobileCats = (s.categories['dépense'] || []);
    // Catégories déjà assignées à un groupe
    const assignedCats = new Set(groupes.flatMap(g => g.cats || []));
    // Catégories orphelines
    const orphanCats = allMobileCats.filter(c => !assignedCats.has(c));

    document.getElementById('app').innerHTML = `
    <div class="tabs">
      <button class="${A.paramTab==='identite'?'active':''}" onclick="App.paramTab='identite';App.renderParametres()">Identité</button>
      <button class="${A.paramTab==='membres'?'active':''}" onclick="App.paramTab='membres';App.renderParametres()">Membres</button>
      <button class="${A.paramTab==='categories'?'active':''}" onclick="App.paramTab='categories';App.renderParametres()">Catégories</button>
      <button class="${A.paramTab==='groupes'?'active':''}" onclick="App.paramTab='groupes';App.renderParametres()">Groupes mobiles</button>
      <button class="${A.paramTab==='hypotheses'?'active':''}" onclick="App.paramTab='hypotheses';App.renderParametres()">Hypothèses</button>
      <button class="${A.paramTab==='guide'?'active':''}" onclick="App.paramTab='guide';App.renderParametres()" style="background:linear-gradient(135deg,#2457ff,#1a3fb5);color:#fff;border-color:#2457ff">📖 Guide</button>
    </div>

    ${(A.paramTab||'identite')==='identite' ? `
    <div class="card">
      <h3>Identité du foyer</h3><br>
      <div class="form-grid">
        <label>Nom du foyer<input id="pHouseName" value="${esc(s.householdName)}"></label>
        <label>Initiales<input id="pInitials" value="${esc(s.brandInitials)}" maxlength="3"></label>
        <label>Sous-titre<input id="pSubtitle" value="${esc(s.subtitle)}"></label>
        <label>Pays<input id="pCountry" value="${esc(s.country)}"></label>
        <label>Devise<select id="pCurrency">
          ${['EUR','USD','GBP','XOF','CAD'].map(c=>`<option ${s.currency===c?'selected':''}>${c}</option>`).join('')}
        </select></label>
        <label class="full">Objectif principal<textarea id="pGoal">${esc(s.mainGoal)}</textarea></label>
      </div>
      <button onclick="App.saveSettings()">Enregistrer</button>
    </div>` : ''}

    ${(A.paramTab||'identite')==='membres' ? `
    <div class="card">
      <h3>Membres du foyer</h3><br>
      <div class="table-wrap">
        <table><thead><tr><th>Nom</th><th>Rôle</th><th>Actif</th><th></th></tr></thead>
        <tbody>
          ${(s.members||[]).map((m,i)=>`<tr>
            <td>${m.nom}</td><td>${m.role}</td>
            <td>${m.actif?'✓':'—'}</td>
            <td><button class="ghost" onclick="App.editMember('${m.id}')">Éditer</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
      <br><button onclick="App.editMember()">+ Ajouter membre</button>
    </div>` : ''}

    ${(A.paramTab||'identite')==='categories' ? `
    <div class="card">
      <h3>Catégories</h3>
      <p class="muted" style="margin:8px 0 16px">Ces catégories sont synchronisées avec la PWA mobile.</p>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="filterOrphans" ${A.filterOrphanCats?'checked':''} onchange="App.filterOrphanCats=this.checked;App.renderParametres()" style="width:16px;height:16px">
          Afficher uniquement les catégories orphelines
        </label>
        ${A.filterOrphanCats ? `<span class="badge amber">Filtre actif</span>` : ''}
      </div>
      ${['dépense','revenu','épargne','crédit'].map(type=>{
        const groupes = s.groupesMobiles || [];
        const assignedCats = new Set(groupes.flatMap(g => g.cats||[]).map(c=>c.toLowerCase()));
        const cats = (s.categories[type]||[]);
        const filtered = A.filterOrphanCats && type==='dépense'
          ? cats.filter(c => !assignedCats.has(c.toLowerCase()))
          : cats;
        if (A.filterOrphanCats && type !== 'dépense') return '';
        return `<div style="margin-bottom:20px">
          <div class="sec-label">${type} ${A.filterOrphanCats && type==='dépense' ? `<span style="font-size:11px;color:var(--amber)">(${filtered.length} orpheline${filtered.length>1?'s':''})</span>` : ''}</div>
          <div class="chips-list" style="margin:8px 0">
            ${filtered.map((c)=>{
              const i = cats.indexOf(c);
              return `<span class="edit-chip ${A.filterOrphanCats?'amber':''}">${esc(c)}
                <button onclick="App.removeCategory('${type}',${i})">×</button>
              </span>`;
            }).join('') || '<p class="muted">Aucune catégorie orpheline.</p>'}
          </div>
          ${!A.filterOrphanCats ? `<button class="secondary" onclick="App.addCategory('${type}')">+ Ajouter</button>` : ''}
        </div>`;
      }).join('')}
      <button onclick="App.saveSettings()">Enregistrer et synchro</button>
    </div>` : ''}

    ${(A.paramTab||'identite')==='groupes' ? `
    <div class="grid two">
      <div class="card">
        <div class="section-title">
          <h3>Groupes mobiles → Suivi</h3>
          <button onclick="App.editGroupe()">+ Nouveau groupe</button>
        </div>
        <p class="muted" style="margin-bottom:14px;font-size:13px">
          Définissez comment les catégories de la PWA sont regroupées dans les lignes du suivi mensuel.
        </p>
        ${groupes.length ? groupes.map((g,i)=>`
          <div class="groupe-card">
            <div class="groupe-head">
              <div>
                <strong>${g.nom}</strong>
                <span class="muted" style="font-size:12px;margin-left:8px">→ ${g.ligneSuivi||'non mappé'}</span>
              </div>
              <div style="display:flex;gap:6px">
                <button class="ghost icon-btn" onclick="App.editGroupe(${i})">Éditer</button>
                <button class="danger icon-btn" onclick="App.deleteGroupe(${i})">×</button>
              </div>
            </div>
            <div class="chips-list" style="margin-top:8px">
              ${(g.cats||[]).map(c=>`<span class="edit-chip green">${c}</span>`).join('') || '<span class="muted">Aucune catégorie assignée</span>'}
            </div>
          </div>`).join('') : '<p class="muted">Aucun groupe défini.</p>'}
      </div>
      <div class="card">
        <h3>Catégories orphelines</h3>
        <p class="muted" style="margin:8px 0 14px;font-size:13px">
          Ces catégories mobiles ne sont assignées à aucun groupe — elles apparaîtront en attente dans le suivi en mode Réel.
        </p>
        ${orphanCats.length ? `
          <div class="chips-list">
            ${orphanCats.map(c=>`<span class="edit-chip amber">${c}
              <button onclick="App.assignOrphan('${c}')" title="Assigner à un groupe">+</button>
              <button onclick="App.deleteOrphanCat('${c}')" title="Supprimer" style="color:var(--red);margin-left:2px">×</button>
            </span>`).join('')}
          </div>` : '<p class="muted" style="color:var(--green)">✓ Toutes les catégories sont assignées.</p>'}
      </div>
    </div>` : ''}

    ${(A.paramTab||'identite')==='guide' ? `
    <div style="display:flex;flex-direction:column;gap:16px">

      <div class="card" style="border-left:4px solid #2457ff">
        <h3>Architecture du système</h3><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">💻</div>
            <strong style="font-size:13px;color:#1e40af">Cockpit</strong>
            <p style="font-size:11px;color:#64748b;margin-top:4px">GitHub Pages · laserreafricaine.github.io/foyer-diallo-cockpit-github</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">📱</div>
            <strong style="font-size:13px;color:#166534">PWA Mobile</strong>
            <p style="font-size:11px;color:#64748b;margin-top:4px">GitHub Pages · laserreafricaine.github.io/foyer-diallo-cockpit-github</p>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">⚙️</div>
            <strong style="font-size:13px;color:#9a3412">Apps Script</strong>
            <p style="font-size:11px;color:#64748b;margin-top:4px">Pont synchro dépenses mobiles</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">📊</div>
            <strong style="font-size:13px;color:#166534">Google Sheet</strong>
            <p style="font-size:11px;color:#64748b;margin-top:4px">Stockage dépenses mobiles</p>
          </div>
          <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:12px;padding:12px;text-align:center;grid-column:1/-1">
            <div style="font-size:24px;margin-bottom:6px">☁️</div>
            <strong style="font-size:13px;color:#1b5e20">Google Drive</strong>
            <p style="font-size:11px;color:#64748b;margin-top:4px">Sauvegarde automatique du cockpit · dossier "Foyer Diallo"</p>
          </div>
        </div>
        <div style="background:#f8fafc;border-radius:10px;padding:10px;font-size:12px;color:#475569;line-height:1.7">
          <strong>Flux dépenses :</strong> PWA mobile → Google Sheet (Apps Script) → Cockpit (clôture mensuelle)<br>
          <strong>Flux données :</strong> Cockpit → Google Drive (sauvegarde auto) ↔ tous les PC/navigateurs
        </div>
      </div>

      <div class="card" style="border-left:4px solid #138a5b">
        <h3>🔄 Flux mensuel</h3><br>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
          <div style="background:#f8fafc;border-radius:10px;padding:10px"><strong>1. Au quotidien 📱</strong><br><span style="color:#64748b">Ouvrir la PWA → montant → catégorie → Enregistrer. La dépense part dans le Sheet.</span></div>
          <div style="background:#f8fafc;border-radius:10px;padding:10px"><strong>2. Fin de mois — Synchroniser ↺</strong><br><span style="color:#64748b">Cliquer Synchroniser dans la sidebar pour vérifier les dépenses en attente.</span></div>
          <div style="background:#f8fafc;border-radius:10px;padding:10px"><strong>3. Fin de mois — Clôturer 🗓️</strong><br><span style="color:#64748b">Cliquer Clôturer le mois → récap Réel vs Planifié → cocher les lignes → Appliquer.</span></div>
          <div style="background:#f8fafc;border-radius:10px;padding:10px"><strong>4. Vérifier le suivi 👁️</strong><br><span style="color:#64748b">Suivi mensuel → mode Réel → voir les valeurs réelles avec sous-lignes détaillées.</span></div>
          <div style="background:#f8fafc;border-radius:10px;padding:10px"><strong>5. Sauvegarder 💾</strong><br><span style="color:#64748b">Cliquer Sauvegarder une version → JSON horodaté. À faire en fin de mois.</span></div>
        </div>
      </div>

      <div class="card" style="border-left:4px solid #c58a1e">
        <h3>🔄 Mettre à jour PWA ou Cockpit</h3><br>
        <div style="font-size:13px;color:#475569;line-height:1.9;margin-bottom:10px">
          <strong style="color:#0d47a1">PWA mobile (foyer-diallo-mobile) :</strong><br>
          <strong>1.</strong> Modifier index.html dans le dossier foyer-diallo-mobile<br>
          <strong>2.</strong> Copier aussi dans le repo Laserreafricaine.github.io<br>
          <strong>3.</strong> GitHub Desktop → Commit to main → Push origin sur les deux repos<br>
          <strong>4.</strong> GitHub Pages redéploie automatiquement en ~2 minutes
        </div>
        <div style="font-size:13px;color:#475569;line-height:1.9">
          <strong style="color:#1b5e20">Cockpit (foyer-diallo-cockpit) :</strong><br>
          <strong>1.</strong> Modifier les fichiers dans le dossier foyer-diallo-cockpit<br>
          <strong>2.</strong> GitHub Desktop → Commit to main → Push origin<br>
          <strong>3.</strong> GitHub Pages redéploie automatiquement en ~2 minutes
        </div>
        <div style="margin-top:10px;background:#fffbf0;border:1px solid #fde68a;border-radius:10px;padding:10px;font-size:11px;color:#92400e">
          ⚠️ Si GitHub Desktop dit "0 changed files" : vérifier que les fichiers sont dans le bon dossier du repo.
        </div>
      </div>

      <div class="card" style="border-left:4px solid #7555d9">
        <h3>⚙️ Apps Script</h3><br>
        <div style="font-size:13px;color:#475569;line-height:1.9">
          <strong>Secret :</strong> 0603<br>
          <strong>Sheet ID :</strong> 1vYu4Qg61QtLMwL47s5Np9QroD_dOLghyoEv4PJ2jBVA<br>
          <strong>Si le script ne répond plus :</strong> script.google.com → projet → Déployer → Gérer → crayon → Nouvelle version → Déployer
        </div>
      </div>

      <div class="card" style="border-left:4px solid #dc2626">
        <h3>❓ Problèmes fréquents</h3><br>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">Aucune dépense trouvée à la clôture</strong>
            <p style="color:#64748b;margin-top:4px">Vérifier que le statut dans le Sheet est "nouveau" et non "archivé". Vérifier que le mois correspond.</p>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">Catégories qui reviennent après suppression</strong>
            <p style="color:#64748b;margin-top:4px">Supprimer aussi la ligne dans l'onglet "catégories" du Sheet, puis supprimer dans les Paramètres.</p>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">La PWA ne se met pas à jour</strong>
            <p style="color:#64748b;margin-top:4px">Fermer complètement la PWA et rouvrir. Si besoin : désinstaller et réinstaller depuis le navigateur.</p>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">Prévu et Réel affichent la même chose</strong>
            <p style="color:#64748b;margin-top:4px">Normal avant la 1ère clôture du mois. Le Réel change uniquement après clôture de dépenses mobiles.</p>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">Le bouton Drive reste déconnecté</strong>
            <p style="color:#64748b;margin-top:4px">Ouvrir le cockpit depuis laserreafricaine.github.io/foyer-diallo-cockpit-github (pas en local). Cliquer "☁ Connecter Drive" → autoriser Google → le bouton passe en vert.</p>
          </div>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:10px">
            <strong style="color:#991b1b">Les données ne se chargent pas sur un nouveau PC</strong>
            <p style="color:#64748b;margin-top:4px">Ouvrir le cockpit sur Netlify → cliquer "☁ Connecter Drive" → les données se rechargent automatiquement depuis le dossier "Foyer Diallo" dans Drive.</p>
          </div>
        </div>
      </div>

      <div class="card" style="text-align:center;color:#94a3b8;font-size:12px">
        Cockpit Foyer Diallo · v21 · Mai 2026 · Drive ☁️
      </div>

    </div>` : ``}

    ${(A.paramTab||'identite')==='hypotheses' ? `
    <div class="card">
      <h3>Hypothèses financières</h3><br>
      <div class="form-grid">
        <label>Rendement épargne (%)<input type="number" id="pRend" step="0.1" value="${s.assumptions?.rendementEpargne||3}"></label>
        <label>Inflation (%)<input type="number" id="pInfl" step="0.1" value="${s.assumptions?.inflation||2}"></label>
        <label>Taux effort max (%)<input type="number" id="pEffort" value="${s.assumptions?.tauxEffortMax||33}"></label>
        <label>Mois épargne sécurité<input type="number" id="pSec" value="${s.assumptions?.moisSecurite||3}"></label>
      </div>
      <button onclick="App.saveSettings()">Enregistrer</button>
    </div>` : ''}`;
  };

  /* ─── GROUPES MOBILES CRUD ─── */
  A.editGroupe = (idx) => {
    A.ensureSettings();
    const s = A.state.settings;
    const g = idx !== undefined ? s.groupesMobiles[idx] : { nom:'', ligneSuivi:'', cats:[] };
    const depLines = A.state.lines.filter(l => l.type==='dépense' && l.actif);
    const allCats = s.categories['dépense'] || [];
    const isNew = idx === undefined;

    A.openModal(isNew ? 'Nouveau groupe' : 'Modifier le groupe', `
      <div class="form-grid">
        <label>Nom du groupe<input id="gNom" value="${g.nom}" placeholder="Ex: Alimentation"></label>
        <label>Ligne suivi associée
          <select id="gLigne">
            <option value="">— Non mappé —</option>
            ${depLines.map(l=>`<option ${g.ligneSuivi===l.nom?'selected':''}>${l.nom}</option>`).join('')}
          </select>
        </label>
      </div>
      <div style="margin:14px 0 8px" class="sec-label">Catégories mobiles incluses</div>
      <div class="chips-list" style="margin-bottom:10px">
        ${allCats.map(c=>`
          <label style="display:inline-flex;align-items:center;gap:6px;background:${(g.cats||[]).includes(c)?'#eff6ff':'#f8fafc'};border:1px solid ${(g.cats||[]).includes(c)?'#2457ff':'#e2e8f0'};border-radius:999px;padding:5px 12px;cursor:pointer;font-size:13px;margin:3px">
            <input type="checkbox" id="gcat_${c.replace(/\s/g,'_')}" ${(g.cats||[]).includes(c)?'checked':''} style="width:14px;height:14px">
            ${c}
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveGroupe(${isNew?'null':idx})">Enregistrer</button>
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
  };

  A.saveGroupe = (idx) => {
    A.ensureSettings();
    const s = A.state.settings;
    const nom = document.getElementById('gNom').value.trim();
    const ligneSuivi = document.getElementById('gLigne').value;
    const allCats = s.categories['dépense'] || [];
    const cats = allCats.filter(c => document.getElementById('gcat_'+c.replace(/\s/g,'_'))?.checked);
    if (!nom) return;
    const g = { nom, ligneSuivi, cats };
    if (idx === null) s.groupesMobiles.push(g);
    else s.groupesMobiles[idx] = g;
    A.save();
    A.closeModal();
    A.renderParametres();
  };

  A.deleteGroupe = (idx) => {
    A.ensureSettings();
    A.state.settings.groupesMobiles.splice(idx, 1);
    A.save();
    A.renderParametres();
  };

  A.deleteOrphanCat = (cat) => {
    if (!confirm(`Supprimer la catégorie "${cat}" ?`)) return;
    A.ensureSettings();
    ['dépense','revenu','épargne','crédit'].forEach(type => {
      const idx = (A.state.settings.categories[type]||[]).findIndex(c => c.toLowerCase()===cat.toLowerCase());
      if (idx >= 0) A.state.settings.categories[type].splice(idx, 1);
    });
    A.save();
    A.renderParametres();
    if (A.syncCategoriesToSheet) A.syncCategoriesToSheet();
  };

  A.assignOrphan = (cat) => {
    A.ensureSettings();
    const groupes = A.state.settings.groupesMobiles || [];
    const depLines = A.state.lines.filter(l => l.type==='dépense' && l.actif);
    A.openModal(`Assigner "${cat}"`, `
      <p class="muted" style="margin-bottom:14px">Choisissez un groupe existant ou créez-en un nouveau.</p>
      <div class="form-grid">
        <label>Groupe existant
          <select id="orphanGroupe">
            <option value="">— Nouveau groupe —</option>
            ${groupes.map((g,i)=>`<option value="${i}">${g.nom}</option>`).join('')}
          </select>
        </label>
        <label>Ou nom du nouveau groupe<input id="orphanNom" placeholder="Ex: Loisirs"></label>
        <label>Ligne suivi associée
          <select id="orphanLigne">
            <option value="">— Non mappé —</option>
            ${depLines.map(l=>`<option>${l.nom}</option>`).join('')}
          </select>
        </label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.confirmAssignOrphan('${cat}')">Assigner</button>
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
  };

  A.confirmAssignOrphan = (cat) => {
    A.ensureSettings();
    const s = A.state.settings;
    const groupeIdx = document.getElementById('orphanGroupe').value;
    if (groupeIdx !== '') {
      s.groupesMobiles[Number(groupeIdx)].cats.push(cat);
    } else {
      const nom = document.getElementById('orphanNom').value.trim() || cat;
      const ligneSuivi = document.getElementById('orphanLigne').value;
      s.groupesMobiles.push({ nom, ligneSuivi, cats: [cat] });
    }
    A.save();
    A.closeModal();
    A.renderParametres();
  };

  /* ─── SETTINGS CRUD ─── */
  A.saveSettings = () => {
    A.ensureSettings();
    const s = A.state.settings;
    if(document.getElementById('pHouseName')) s.householdName = pHouseName.value;
    if(document.getElementById('pInitials'))  s.brandInitials  = pInitials.value;
    if(document.getElementById('pSubtitle'))  s.subtitle       = pSubtitle.value;
    if(document.getElementById('pCountry'))   s.country        = pCountry.value;
    if(document.getElementById('pCurrency'))  s.currency       = pCurrency.value;
    if(document.getElementById('pGoal'))      s.mainGoal       = pGoal.value;
    if(document.getElementById('pRend'))      s.assumptions.rendementEpargne = Number(pRend.value);
    if(document.getElementById('pInfl'))      s.assumptions.inflation        = Number(pInfl.value);
    if(document.getElementById('pEffort'))    s.assumptions.tauxEffortMax    = Number(pEffort.value);
    if(document.getElementById('pSec'))       s.assumptions.moisSecurite     = Number(pSec.value);
    A.save();
    A.renderParametres();
    if (A.syncCategoriesToSheet) A.syncCategoriesToSheet();
  };

  A.editMember = id => {
    A.ensureSettings();
    const m = A.state.settings.members.find(x=>x.id===id)||{id:A.uid('mbr'),nom:'',role:'Adulte',actif:true};
    A.openModal('Membre',`
      <div class="form-grid">
        <label>Nom<input id="mnom" value="${m.nom}"></label>
        <label>Rôle<select id="mrole">${['Adulte','Enfant','Foyer','Autre'].map(r=>`<option ${m.role===r?'selected':''}>${r}</option>`)}</select></label>
        <label>Actif<select id="mact"><option value="true" ${m.actif?'selected':''}>Oui</option><option value="false" ${!m.actif?'selected':''}>Non</option></select></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveMember('${m.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteMember('${m.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveMember = id => {
    A.ensureSettings();
    const m = {id, nom:mnom.value, role:mrole.value, actif:mact.value==='true'};
    const i = A.state.settings.members.findIndex(x=>x.id===id);
    if(i>=0) A.state.settings.members[i]=m; else A.state.settings.members.push(m);
    A.save(); A.closeModal(); A.renderParametres();
  };
  A.deleteMember = id => {
    A.state.settings.members = A.state.settings.members.filter(x=>x.id!==id);
    A.save(); A.closeModal(); A.renderParametres();
  };

  A.addCategory = type => {
    A.openModal('Nouvelle catégorie',`
      <div class="form-grid">
        <label class="full">Nom<input id="newCatName" placeholder="Ex: Cadeaux, Animaux…"></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveNewCategory('${type}')">Ajouter</button>
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
    setTimeout(()=>{ const el=document.getElementById('newCatName'); if(el) el.focus(); }, 80);
  };
  A.saveNewCategory = type => {
    const v = document.getElementById('newCatName')?.value?.trim();
    if(!v) return;
    A.ensureSettings();
    A.state.settings.categories[type] = A.state.settings.categories[type] || [];
    if(!A.state.settings.categories[type].includes(v)) A.state.settings.categories[type].push(v);
    A.save(); A.closeModal(); A.renderParametres();
    if(A.syncCategoriesToSheet) A.syncCategoriesToSheet();
  };
  A.removeCategory = (type, i) => {
    A.ensureSettings();
    A.state.settings.categories[type].splice(i,1);
    A.save(); A.renderParametres();
  };
})();
