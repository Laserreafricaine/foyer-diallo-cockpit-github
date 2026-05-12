(function(){
  const A=window.App, KEY='foyerDialloFinanceV1';

  A.ensureSettings=()=>{
    A.state=A.state||A.clone(A.defaults);
    A.state.settings=Object.assign(A.clone(A.baseSettings||{}), A.state.settings||{});
    if(!Array.isArray(A.state.settings.members)||!A.state.settings.members.length){
      A.state.settings.members=A.clone(A.baseSettings.members);
    }
    if(!A.state.settings.categories) A.state.settings.categories=A.clone(A.baseSettings.categories);
    if(!A.state.settings.assumptions) A.state.settings.assumptions=A.clone(A.baseSettings.assumptions);
    if(!A.state.settings.groupesMobiles) A.state.settings.groupesMobiles=[];
  };

  A.ownerNames=()=>{
    A.ensureSettings();
    const names=(A.state.settings.members||[]).filter(m=>m.actif!==false).map(m=>m.nom).filter(Boolean);
    return [...new Set(['Foyer',...names])];
  };

  A.ownerOptions=(selected='')=>A.ownerNames().map(p=>`<option ${p===selected?'selected':''}>${p}</option>`).join('');
  A.categoryOptions=(type,selected='')=>{
    A.ensureSettings();
    const list=((A.state.settings.categories||{})[type]||[]);
    const values=[...new Set([...list, selected].filter(Boolean))];
    return values.map(c=>`<option ${c===selected?'selected':''}>${c}</option>`).join('');
  };

  A.applyBrand=()=>{
    A.ensureSettings();
    const s=A.state.settings;
    document.title=`${s.householdName||'Mon foyer'} — Cockpit financier`;
    const brand=document.querySelector('.brand');
    if(brand){
      const mark=brand.querySelector('.brand-mark');
      const title=brand.querySelector('strong');
      const sub=brand.querySelector('small');
      if(mark) mark.textContent=s.brandInitials||'MF';
      if(title) title.textContent=s.householdName||'Mon foyer';
      if(sub) sub.textContent=s.subtitle||'Pilotage financier';
    }
  };

  A.load=()=>{
    try{A.state=JSON.parse(localStorage.getItem(KEY))||A.clone(A.defaults)}catch(e){A.state=A.clone(A.defaults)}
    A.ensureSettings();
    if(A.syncEpargneAccountsToLines){A.syncEpargneAccountsToLines(false);A.save&&A.save();}
    A.applyBrand();
  };
  A.save=()=>{A.ensureSettings();localStorage.setItem(KEY,JSON.stringify(A.state));A.applyBrand();};

  A.replaceState=(next)=>{
    A.state=A.clone(next);
    A.ensureSettings();
    A.currentMonth=A.state.settings.startMonth||A.currentMonth||'2026-05';
    A.save();
    A.render();
  };

  A.resetData=()=>A.openResetModal?A.openResetModal():A.replaceState(A.templateDefaults);
  A.resetToTemplate=()=>{if(confirm('Créer une application vierge pour un nouveau client ? Les données actuelles seront remplacées.')) A.replaceState(A.templateDefaults);};
  A.loadDemo=()=>{if(confirm('Charger les données de démonstration ? Les données actuelles seront remplacées.')) A.replaceState(A.demoDefaults);};
  A.resetPersonal=()=>{if(confirm('Revenir aux données personnelles de départ ? Les données actuelles seront remplacées.')) A.replaceState(A.defaults);};

  A.exportJSON=()=>{const blob=new Blob([JSON.stringify(A.state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cockpit-financier-donnees.json';a.click();};
  A.importJSON=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{A.state=JSON.parse(r.result);A.ensureSettings();A.save();A.render();}catch(err){alert('JSON invalide')}};r.readAsText(f);e.target.value='';};

  A.viderCache = () => {
    if(confirm('Vider le cache et recharger ? Vos données localStorage sont conservées.')) {
      window.location.reload(true);
    }
  };

  A.saveWithFeedback = () => {
    A.save();
    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = '✓ Enregistré';
    btn.style.background = 'linear-gradient(135deg,#138a5b,#0f6b46)';
    setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 1800);
  };

  A.exportVersionned = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
    const name=(A.state.settings.householdName||'cockpit-financier').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const blob = new Blob([JSON.stringify(A.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}-${stamp}.json`;
    a.click();
  };
})();

(function(){
  const A = window.App;

  // ─── CONFIG SCRIPT URL ─────────────────────────────────────────────────────
  // Coller ici l'URL de déploiement du Apps Script après publication
  A.SCRIPT_URL = localStorage.getItem('fd_script_url') || '';
  A.SCRIPT_SECRET = localStorage.getItem('fd_script_secret') || 'foyer-diallo-2026';

  async function apiGet(params) {
    const url = A.SCRIPT_URL + '?' + new URLSearchParams({ ...params, secret: A.SCRIPT_SECRET });
    const r = await fetch(url, { redirect: 'follow' });
    const text = await r.text();
    try { return JSON.parse(text); } catch(e) {
      // Google redirige vers googleusercontent, on suit manuellement
      const match = text.match(/href="([^"]+)"/);
      if (match) { const r2 = await fetch(match[1]); return r2.json(); }
      throw new Error('Réponse invalide: ' + text.slice(0, 100));
    }
  }
  async function apiPost(body) {
    const r = await fetch(A.SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ ...body, secret: A.SCRIPT_SECRET })
    });
    const text = await r.text();
    try { return JSON.parse(text); } catch(e) {
      const match = text.match(/href="([^"]+)"/);
      if (match) { const r2 = await fetch(match[1]); return r2.json(); }
      throw new Error('Réponse invalide: ' + text.slice(0, 100));
    }
  }

  // ─── SYNC CATÉGORIES → SHEET (appelé depuis saveSettings) ─────────────────
  A.syncCategoriesToSheet = async () => {
    if (!A.SCRIPT_URL) return;
    try {
      const cats = A.state.settings.categories;
      // Transformer en {type: [{nom, icone}]}
      const payload = {};
      Object.entries(cats).forEach(([type, list]) => {
        payload[type] = list.map(c => ({ nom: c, icone: 'ti-tag' }));
      });
      await apiPost({ action: 'sync_categories', categories: payload });
    } catch(e) { console.warn('Sync catégories échouée', e); }
  };

  // ─── SYNCHRONISER LES DÉPENSES DU MOIS ───────────────────────────────────
  A.syncDepenses = async () => {
    if (!A.SCRIPT_URL) {
      A.openModal('Configuration requise', `
        <p>Pour utiliser la synchronisation, renseignez l'URL de votre Apps Script :</p>
        <div class="form-grid" style="margin-top:12px">
          <label class="full">URL du script
            <input id="scriptUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${A.SCRIPT_URL}">
          </label>
          <label class="full">Mot de passe secret
            <input id="scriptSecret" value="${A.SCRIPT_SECRET}">
          </label>
        </div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button onclick="App.saveScriptConfig()">Enregistrer</button>
          <button class="secondary" onclick="App.closeModal()">Annuler</button>
        </div>`
      );
      return;
    }
    try {
      const data = await apiGet({ action: 'get_depenses', mois: A.currentMonth });
      if (!data.ok) { alert('Erreur sync : ' + data.error); return; }
      // Aussi récupérer les nouvelles catégories du mobile
      const cats = await apiGet({ action: 'get_categories' });
      if (cats.ok && cats.categories) {
        Object.entries(cats.categories).forEach(([type, list]) => {
          const existing = A.state.settings.categories[type] || [];
          list.forEach(c => {
            const nom = c.nom || c;
            if (!existing.includes(nom)) existing.push(nom);
          });
          A.state.settings.categories[type] = existing;
        });
        A.save();
        if(A.route==='parametres')A.renderParametres();
      }
      return data.depenses || [];
    } catch(e) {
      alert('Connexion impossible. Vérifiez votre URL Apps Script.');
      return [];
    }
  };

  A.saveScriptConfig = () => {
    A.SCRIPT_URL    = document.getElementById('scriptUrl').value.trim();
    A.SCRIPT_SECRET = document.getElementById('scriptSecret').value.trim();
    localStorage.setItem('fd_script_url', A.SCRIPT_URL);
    localStorage.setItem('fd_script_secret', A.SCRIPT_SECRET);
    A.closeModal();
    A.syncDepenses().then(deps => deps && deps.length && A.showCloturModal(deps));
  };

  // ─── CLÔTURE DE MOIS ──────────────────────────────────────────────────────
  A.cloturerMois = async () => {
    const depenses = await A.syncDepenses();
    if (!depenses || !depenses.length) {
      alert(`Aucune dépense mobile trouvée pour ${A.monthLabel(A.currentMonth)}.`); return;
    }
    A.showCloturModal(depenses);
  };

  A.showCloturModal = (depenses) => {
    // Grouper par catégorie mobile
    const bycat = {};
    depenses.forEach(d => { bycat[d.categorie] = (bycat[d.categorie] || 0) + d.montant; });

    // Utiliser les groupes mobiles pour mapper vers les lignes du suivi
    const groupes = A.state.settings.groupesMobiles || [];
    const assignedCats = new Set(groupes.flatMap(g => g.cats||[]));

    // Construire les rows groupés
    const rowsMap = {};
    Object.entries(bycat).forEach(([cat, total]) => {
      const groupe = groupes.find(g => (g.cats||[]).some(c => c.toLowerCase() === cat.toLowerCase()));
      if (groupe && groupe.ligneSuivi) {
        // Catégorie mappée → regrouper par ligne suivi
        const key = groupe.ligneSuivi.toLowerCase();
        if (!rowsMap[key]) rowsMap[key] = { cats:[], total:0, ligneSuivi:groupe.ligneSuivi };
        rowsMap[key].cats.push({ cat, total });
        rowsMap[key].total += total;
      } else {
        // Orpheline → ligne propre sans mapping
        rowsMap['__orphan__'+cat] = { cats:[{cat,total}], total, ligneSuivi:null };
      }
    });

    const rows = Object.entries(rowsMap).map(([key, g]) => {
      const line = A.state.lines.find(l => l.type==='dépense' && l.actif && l.nom===g.ligneSuivi);
      const planifie = line ? A.lineAmountPlanned(line, A.currentMonth) : null;
      const diff = planifie !== null ? g.total - planifie : null;
      return { cat: g.ligneSuivi || g.cats.map(c=>c.cat).join(', '), total: g.total, planifie, diff, lineId: line?.id||null, cats: g.cats, isOrphan: !g.ligneSuivi };
    });

    A.openModal(`Clôture — ${A.monthLabel(A.currentMonth)}`, `
      <p class="muted" style="margin-bottom:14px">${depenses.length} dépense(s) mobile importée(s). Vérifiez et validez les corrections à appliquer dans le suivi.</p>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Catégorie</th>
            <th class="num">Réel mobile</th>
            <th class="num">Planifié</th>
            <th class="num">Écart</th>
            <th>Appliquer</th>
          </tr></thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td><strong>${r.cat}</strong>${!r.lineId ? ' <span class="badge amber">non mappée</span>' : ''}</td>
              <td class="num"><strong>${A.fmt(r.total)}</strong></td>
              <td class="num">${r.planifie !== null ? A.fmt(r.planifie) : '<span class="muted">—</span>'}</td>
              <td class="num ${r.diff !== null ? (r.diff > 0 ? 'negative' : 'positive') : ''}">
                ${r.diff !== null ? (r.diff > 0 ? '+' : '') + A.fmt(r.diff) : '—'}
              </td>
              <td>
                ${r.lineId
                  ? `<input type="checkbox" id="apply_${i}" ${r.diff !== 0 ? 'checked' : ''} style="width:18px;height:18px">`
                  : '<span class="muted">—</span>'
                }
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button onclick="App.confirmCloture(${JSON.stringify(rows).replace(/"/g,'&quot;')},${JSON.stringify(depenses.map(d=>d.id)).replace(/"/g,'&quot;')})">
          Appliquer et archiver
        </button>
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
  };

  A.confirmCloture = async (rows, ids) => {
    rows.forEach((r, i) => {
      const cb = document.getElementById('apply_' + i);
      if (!cb || !cb.checked || !r.lineId) return;
      const line = A.state.lines.find(l => l.id === r.lineId);
      if (!line) return;
      line.overridesReel = line.overridesReel || {};
      line.overridesReel[A.currentMonth] = r.total;
      // Un mouvement par sous-catégorie pour affichage dans le suivi
      const subCats = r.cats && r.cats.length ? r.cats : [{cat: r.cat, total: r.total}];
      subCats.forEach(sub => {
        A.state.mouvements.push({
          id: A.uid('mov'),
          date: A.currentMonth+'-01',
          type: 'dépense',
          categorie: sub.cat,
          libelle: 'Clôture mobile — '+sub.cat,
          montant: sub.total,
          compte: 'Mobile',
          mois: A.currentMonth,
          note: 'Importé PWA · groupe '+r.cat+' · planifié '+A.fmt(r.planifie||0),
          impact: 'aucun'
        });
      });
    });
    A.save();
    // Archiver dans le Sheet
    if (A.SCRIPT_URL) {
      try { await apiPost({ action: 'archiver_depenses', ids }); } catch(e) {}
    }
    A.closeModal();
    A.render();
    setTimeout(() => alert(`✓ Clôture ${A.monthLabel(A.currentMonth)} appliquée dans le suivi mensuel.`), 200);
  };

  // Patch saveSettings pour aussi synchro les catégories
  const _orig = A.saveSettings;
  if (_orig) {
    A.saveSettings = function() {
      _orig.call(this);
      A.syncCategoriesToSheet();
    };
  }

})();

(function(){
  const A = window.App;

  A.syncPreview = async () => {
    const btn = document.querySelector('[onclick="App.syncPreview()"]');
    if (btn) { btn.textContent = '↻ Synchronisation…'; btn.disabled = true; }
    const depenses = await A.syncDepenses();
    if (btn) { btn.textContent = '↻ Synchroniser'; btn.disabled = false; }
    if (!depenses || !depenses.length) {
      alert(`Aucune dépense mobile en attente pour ${A.monthLabel(A.currentMonth)}.`);
      return;
    }
    alert(`${depenses.length} dépense(s) trouvée(s) pour ${A.monthLabel(A.currentMonth)}. Cliquez sur "Clôturer le mois" pour les appliquer.`);
  };
})();
