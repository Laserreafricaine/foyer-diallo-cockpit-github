(function(){
  const A = window.App;
  A.suiviMode = 'prevu';

  const sectionMeta = {
    'revenu':  { label:'Revenus',                   icon:'↗', cls:'sec-revenus',  add:'Ajouter un revenu' },
    'dépense': { label:'Dépenses',                  icon:'↘', cls:'sec-depenses', add:'Ajouter une dépense' },
    'crédit':  { label:'Crédits',                   icon:'▣', cls:'sec-credits',  add:'Ajouter un crédit' },
    'épargne': { label:'Épargne / investissements', icon:'◆', cls:'sec-epargne',  add:'Ajouter une ligne épargne' }
  };

  A.renderSuivi = () => {
    if (A.syncEpargneAccountsToLines) A.syncEpargneAccountsToLines(false);
    const months = A.months(A.currentMonth, 12);
    const types = [
      ['revenu','Revenus'],['dépense','Dépenses'],['crédit','Crédits'],['épargne','Épargne / investissements']
    ];
    const modeBtn = (m, label) =>
      `<button class="${A.suiviMode===m?'active':''}" onclick="App.suiviMode='${m}';App.renderSuivi()">${label}</button>`;

    let html = `
    <div class="suivi-head">
      <div>
        <h1>Suivi mensuel</h1>
        <p class="muted">Source de vérité du foyer · 12 mois glissants · Double-clic pour corriger une cellule</p>
      </div>
      <div class="suivi-mode">
        ${modeBtn('prevu','Prévu')}${modeBtn('reel','Réel')}${modeBtn('ecart','Écart')}
      </div>
    </div>
    <div class="toolbar suivi-toolbar">
      <button class="month-btn" onclick="App.shiftMonth(-1)">‹</button>
      <button class="month-btn" onclick="App.shiftMonth(1)">›</button>
      <span class="month-pill">${A.monthLabel(A.currentMonth)}</span>
      <span class="spacer"></span>
      <button class="suivi-action dark" onclick="App.addLine()">+ Ligne</button>
      <button class="suivi-action light" onclick="App.duplicatePrevMonth()">Dupliquer mois préc.</button>
      <button class="suivi-action light" onclick="App.applyFollowingModal()">Appliquer mois suivants</button>
      <button class="suivi-action light" onclick="App.exportSuiviCSV()">Export CSV</button>
    </div>
    <div class="suivi-cashflow-strip">
      ${months.map(m => {
        const s = A.monthSummary(m);
        const isPos = s.cashflow >= 0;
        const isCur = m === A.currentMonth;
        return `<div class="cf-chip ${isPos?'pos':'neg'} ${isCur?'cur':''}"><span class="cf-month">${A.monthLabel(m).slice(0,3)}</span><span class="cf-val">${A.fmt(s.cashflow)}</span></div>`;
      }).join('')}
    </div>
    <div class="table-wrap suivi-scroll"><table class="suivi-table"><thead><tr>
      <th class="line-col">Ligne financière</th>
      <th>Statut</th>
      ${months.map(m => `<th class="num month-col${m===A.currentMonth?' is-cur-month':''}">${A.monthLabel(m)}</th>`).join('')}
      <th class="num total-col">Total 12 m</th>
      <th class="num avg-col">Moy./mois</th>
      <th>Actions</th>
    </tr></thead><tbody>`;

    types.forEach(([t, label]) => {
      const meta = sectionMeta[t];
      const rows = A.state.lines.filter(l => l.type === t);
      const activeCount = rows.filter(l=>l.actif).length;
      html += `<tr class="section-row ${meta.cls}"><td colspan="${months.length+5}"><span class="section-icon">${meta.icon}</span>${label}<span class="section-count">${activeCount} ligne${activeCount>1?'s':''} active${activeCount>1?'s':''}</span></td></tr>`;

      rows.forEach(l => {
        const rowValues = months.map(m => {
          const planned = A.lineAmountPlanned(l, m);
          const real    = A.lineAmountReal(l, m);
          return A.suiviMode === 'ecart' ? real - planned : A.suiviMode === 'reel' ? real : planned;
        });
        const sum = rowValues.reduce((a,b) => a+b, 0);
        const avg = sum / months.length;
        const hasOverrides = months.some(m => (l.overrides && l.overrides[m] != null) || (l.overridesReel && l.overridesReel[m] != null));
        html += `<tr class="suivi-data-row ${meta.cls} ${!l.actif?'is-inactive':''}">
          <td class="line-name" onclick="App.editLine('${l.id}')"><strong>${l.nom}</strong>${hasOverrides?'<span class="override-dot" title="Corrections manuelles">●</span>':''}
          <br><small>${l.categorie} · ${l.proprietaire}</small></td>
          <td><button class="mini-toggle ${l.actif?'on':'off'}" onclick="App.toggleLine('${l.id}')">${l.actif?'Actif':'Inactif'}</button></td>
          ${months.map((m,i) => {
            const isOverridden = (A.suiviMode==='reel' && l.overridesReel && l.overridesReel[m]!=null) || (A.suiviMode!=='reel' && l.overrides && l.overrides[m]!=null);
            const isCur = m === A.currentMonth;
            let cls = `num editable${isCur?' is-cur-month':''}${isOverridden?' is-overridden':''}`;
            if (A.suiviMode==='ecart') cls += rowValues[i]>=0?' positive':' negative';
            return `<td class="${cls}" ondblclick="App.editCell('${l.id}','${m}')">${A.fmt(rowValues[i])}</td>`;
          }).join('')}
          <td class="num summary-cell">${A.fmt(sum)}</td>
          <td class="num summary-cell">${A.fmt(avg)}</td>
          <td class="row-actions"><button class="ghost icon-btn" onclick="App.editLine('${l.id}')">Modifier</button></td>
        </tr>`;
        // Sous-lignes mobiles en mode Réel
        if (A.suiviMode === 'reel') {
          const groupes = A.state.settings.groupesMobiles || [];
          const groupe = groupes.find(g => g.ligneSuivi?.toLowerCase() === l.nom?.toLowerCase());
          if (groupe && groupe.cats && groupe.cats.length) {
            groupe.cats.forEach(cat => {
              const subVals = months.map(m => {
                const movs = A.state.mouvements.filter(mv => mv.mois===m && mv.categorie?.toLowerCase()===cat?.toLowerCase() && mv.compte==='Mobile');
                return movs.reduce((a,mv)=>a+Number(mv.montant),0);
              });
              const subSum = subVals.reduce((a,b)=>a+b,0);
              if (subSum === 0) return;
              html += `<tr class="suivi-subrow ${meta.cls}">
                <td class="line-name" style="padding-left:28px">
                  <span style="color:var(--muted);margin-right:6px">↳</span>${cat}
                  <br><small style="color:var(--muted)">mobile</small>
                </td>
                <td></td>
                ${months.map((m,i) => `<td class="num${m===A.currentMonth?' is-cur-month':''}" style="font-style:italic;color:var(--muted)">${subVals[i]>0?A.fmt(subVals[i]):'—'}</td>`).join('')}
                <td class="num summary-cell" style="color:var(--muted)">${A.fmt(subSum)}</td>
                <td class="num summary-cell" style="color:var(--muted)">${A.fmt(subSum/months.length)}</td>
                <td></td>
              </tr>`;
            });
          }
        }
      });

      const totals = months.map(m => A.monthRows(m, A.suiviMode==='reel'?'reel':undefined).filter(r => r.type===t).reduce((a,b) => a+b.amount, 0));
      const totalSum = totals.reduce((a,b) => a+b, 0);
      html += `<tr class="total-row ${meta.cls}">
        <td>Total ${label}</td><td></td>
        ${totals.map((v,i) => `<td class="num${months[i]===A.currentMonth?' is-cur-month':''}">${A.fmt(v)}</td>`).join('')}
        <td class="num">${A.fmt(totalSum)}</td><td class="num">${A.fmt(totalSum/months.length)}</td><td></td>
      </tr>`;
    });

    const cash = months.map(m => A.monthSummary(m, A.suiviMode==='reel'?'reel':undefined).cashflow);
    const cashSum = cash.reduce((a,b) => a+b, 0);
    html += `<tr class="cashflow-row">
      <td><strong>Cashflow final</strong></td><td></td>
      ${cash.map((c,i) => `<td class="num${months[i]===A.currentMonth?' is-cur-month':''} ${c>=0?'positive':'negative'}">${A.fmt(c)}</td>`).join('')}
      <td class="num ${cashSum>=0?'positive':'negative'}">${A.fmt(cashSum)}</td>
      <td class="num ${cashSum>=0?'positive':'negative'}">${A.fmt(cashSum/months.length)}</td>
      <td></td>
    </tr></tbody></table></div>
    <div class="suivi-legend">
      <span><b class="dot revenus"></b>Revenus</span>
      <span><b class="dot depenses"></b>Dépenses</span>
      <span><b class="dot credits"></b>Crédits</span>
      <span><b class="dot epargne"></b>Épargne</span>
      <span class="spacer"></span>
      <span class="legend-tip">● = valeur corrigée · double-clic pour modifier une cellule</span>
    </div>`;

    // Section orphelines en mode Réel
    if (A.suiviMode === 'reel') {
      const groupes = A.state.settings.groupesMobiles || [];
      const assignedCats = new Set(groupes.flatMap(g => g.cats||[]));
      const allMobileCats = A.state.settings.categories?.['dépense'] || [];
      const orphans = allMobileCats.filter(c => !assignedCats.has(c));
      const orphanMovs = A.state.mouvements.filter(mv => mv.compte==='Mobile' && mv.mois===A.currentMonth && orphans.some(o => o.toLowerCase()===mv.categorie?.toLowerCase()));
      if (orphanMovs.length) {
        html += `<tr class="section-row" style="background:linear-gradient(90deg,#78350f,#b45309)!important">
          <td colspan="${months.length+5}">
            <span class="section-icon">⚠</span>Catégories orphelines — à assigner dans les Paramètres
            <button onclick="App.goto('parametres');App.paramTab='groupes'" style="margin-left:12px;font-size:11px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.2);border:none;color:#fff;cursor:pointer">Configurer →</button>
          </td>
        </tr>`;
        const orphanByCat = {};
        orphanMovs.forEach(mv => { orphanByCat[mv.categorie]=(orphanByCat[mv.categorie]||0)+Number(mv.montant); });
        Object.entries(orphanByCat).forEach(([cat, total]) => {
          html += `<tr class="suivi-data-row" style="opacity:.8">
            <td class="line-name"><strong>${cat}</strong><br><small style="color:var(--amber)">⚠ Non assignée</small></td>
            <td></td>
            ${months.map(m => {
              const v = A.state.mouvements.filter(mv=>mv.mois===m&&mv.categorie===cat&&mv.compte==='Mobile').reduce((a,mv)=>a+Number(mv.montant),0);
              return `<td class="num${m===A.currentMonth?' is-cur-month':''}">${v>0?A.fmt(v):'—'}</td>`;
            }).join('')}
            <td class="num summary-cell">${A.fmt(total)}</td>
            <td class="num summary-cell">${A.fmt(total/months.length)}</td>
            <td><button class="ghost icon-btn" onclick="App.assignOrphan('${cat}')">Assigner</button></td>
          </tr>`;
        });
      }
    }
    html += `</tbody></table></div>`;
    html += `<div class="suivi-legend">
      <span><b class="dot revenus"></b>Revenus</span>
      <span><b class="dot depenses"></b>Dépenses</span>
      <span><b class="dot credits"></b>Crédits</span>
      <span><b class="dot epargne"></b>Épargne</span>
      <span class="spacer"></span>
      <span class="legend-tip">● = valeur corrigée · double-clic pour modifier une cellule</span>
    </div>`;
    document.getElementById('app').innerHTML = html;
  };

  /* CELL EDIT — modal propre, fin du prompt() */
  A.editCell = (id, m) => {
    const l = A.state.lines.find(x => x.id === id);
    const planned = A.lineAmount(l, m);
    const hasOverride = l.overrides && l.overrides[m] != null;
    const realVal = hasOverride ? l.overrides[m] : planned;
    A.openModal(`Corriger — ${l.nom}`, `
      <div class="cell-edit-info">
        <div class="cell-edit-meta"><span>${A.monthLabel(m)}</span><span class="muted">${l.type} · ${l.categorie} · ${l.proprietaire}</span></div>
        <div class="cell-edit-planned">Valeur planifiée : <strong>${A.fmt(planned)}</strong>${hasOverride?` · Correction actuelle : <strong>${A.fmt(realVal)}</strong>`:''}</div>
      </div>
      <div class="form-grid">
        <label class="full">Montant réel / correction
          <input type="number" id="cellVal" value="${realVal}" min="0" step="1">
          <span class="help">Entrez le montant réel constaté ce mois-ci.</span>
        </label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button onclick="App.saveCellEdit('${id}','${m}')">Enregistrer</button>
        ${hasOverride?`<button class="secondary" onclick="App.clearCellOverride('${id}','${m}')">Réinitialiser au planifié</button>`:''}
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
    setTimeout(() => { const el = document.getElementById('cellVal'); if(el){el.focus();el.select();} }, 80);
  };

  A.saveCellEdit = (id, m) => {
    const l = A.state.lines.find(x => x.id === id);
    const v = Number(document.getElementById('cellVal').value);
    if (!isNaN(v)) {
      if (A.suiviMode === 'reel') { l.overridesReel = l.overridesReel || {}; l.overridesReel[m] = v; }
      else { l.overrides = l.overrides || {}; l.overrides[m] = v; }
      A.save(); A.closeModal(); A.renderSuivi();
    }
  };

  A.clearCellOverride = (id, m) => {
    const l = A.state.lines.find(x => x.id === id);
    if (A.suiviMode === 'reel') { if (l.overridesReel) delete l.overridesReel[m]; }
    else { if (l.overrides) delete l.overrides[m]; }
    A.save(); A.closeModal(); A.renderSuivi();
  };

  /* APPLY TO FOLLOWING MONTHS — fonctionnel */
  A.applyFollowingModal = () => {
    A.openModal('Appliquer aux mois suivants', `
      <div class="alert" style="margin-bottom:14px">
        Propage les montants d'un mois donné comme nouvelles valeurs planifiées pour tous les mois suivants. Les corrections manuelles ultérieures seront effacées.
      </div>
      <div class="form-grid">
        <label>À partir de<input type="month" id="applyFrom" value="${A.currentMonth}"></label>
        <label>Lignes concernées<select id="applyScope">
          <option value="all">Toutes les lignes actives</option>
          <option value="modified">Uniquement celles avec corrections</option>
        </select></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.confirmApplyFollowing()">Confirmer</button>
        <button class="secondary" onclick="App.closeModal()">Annuler</button>
      </div>`
    );
  };

  A.confirmApplyFollowing = () => {
    const fromMonth = document.getElementById('applyFrom').value;
    const scope = document.getElementById('applyScope').value;
    let lines = A.state.lines.filter(l => l.actif);
    if (scope === 'modified') lines = lines.filter(l => l.overrides && Object.keys(l.overrides).length > 0);
    lines.forEach(l => {
      const amount = A.lineAmount(l, fromMonth);
      if (!l.schedules) l.schedules = [];
      const idx = l.schedules.findIndex(s => s.from === fromMonth);
      if (idx >= 0) l.schedules[idx].amount = amount;
      else l.schedules.push({ from: fromMonth, amount });
      l.defaultAmount = amount;
      if (l.overrides) Object.keys(l.overrides).filter(m => m >= fromMonth).forEach(m => delete l.overrides[m]);
    });
    A.save(); A.closeModal(); A.renderSuivi();
  };

  /* CSV EXPORT */
  A.exportSuiviCSV = () => {
    const months = A.months(A.currentMonth, 12);
    const header = ['Ligne','Type','Catégorie','Propriétaire',...months.map(A.monthLabel),'Total 12 mois','Moy./mois'];
    const dataRows = A.state.lines.map(l => {
      const vals = months.map(m => A.lineAmount(l, m));
      const sum = vals.reduce((a,b) => a+b, 0);
      return [l.nom, l.type, l.categorie, l.proprietaire, ...vals, sum, Math.round(sum/months.length)];
    });
    const cashVals = months.map(m => A.monthSummary(m, A.suiviMode==='reel'?'reel':undefined).cashflow);
    const cashSum = cashVals.reduce((a,b) => a+b, 0);
    dataRows.push(['Cashflow','','','', ...cashVals, cashSum, Math.round(cashSum/months.length)]);
    A.csv([header, ...dataRows], `suivi-foyer-diallo-${A.currentMonth}.csv`);
  };

  /* LINE CRUD */
  A.toggleLine = id => { const l = A.state.lines.find(x => x.id===id); l.actif=!l.actif; A.save(); A.renderSuivi(); };
  A.addLine = () => {
    const id = A.uid('line');
    A.state.lines.push({id,type:'dépense',nom:'Nouvelle ligne',categorie:'À classer',proprietaire:'Foyer',defaultAmount:0,schedules:[{from:A.currentMonth,amount:0}],overrides:{},actif:true,dateDebut:A.currentMonth,dateFin:'',notes:''});
    A.save(); A.editLine(id);
  };
  A.editLine = id => {
    const l = A.state.lines.find(x => x.id===id);
    A.openModal('Modifier la ligne', `
      <div class="form-grid">
        <label>Nom<input id="lnom" value="${l.nom}"></label>
        <label>Type<select id="ltype" onchange="App.refreshLineCategoryOptions()">${['revenu','dépense','crédit','épargne'].map(t=>`<option value="${t}" ${l.type===t?'selected':''}>${t}</option>`).join('')}</select></label>
        <label>Catégorie<select id="lcat">${App.categoryOptions(l.type,l.categorie)}</select></label>
        <label>Propriétaire<select id="lprop">${App.ownerOptions(l.proprietaire)}</select></label>
        <label>Montant par défaut<input type="number" id="ldef" value="${l.defaultAmount}"></label>
        <label>Date début<input type="month" id="ldeb" value="${l.dateDebut||A.currentMonth}"></label>
        <label>Date fin<input type="month" id="lfin" value="${l.dateFin||''}"></label>
        <label>Actif<select id="lact"><option value="true" ${l.actif?'selected':''}>Actif</option><option value="false" ${!l.actif?'selected':''}>Inactif</option></select></label>
        <label class="full">Notes<textarea id="lnotes">${l.notes||''}</textarea></label>
      </div>
      <h3 style="margin:14px 0 8px">Périodes planifiées</h3>
      <div id="periods">${(l.schedules||[]).map((p,i)=>`<div class="inline-form"><label>À partir de<input type="month" id="pf${i}" value="${p.from}"></label><label>Montant<input type="number" id="pa${i}" value="${p.amount}"></label></div>`).join('')}</div>
      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
        <button onclick="App.saveLine('${id}')">Enregistrer</button>
        <button class="secondary" onclick="App.addPeriod('${id}')">+ Période</button>
        <button class="danger" onclick="App.deleteLine('${id}')">Supprimer</button>
      </div>`
    );
  };

  A.refreshLineCategoryOptions = () => {
    const typeEl = document.getElementById('ltype');
    const catEl = document.getElementById('lcat');
    if (!typeEl || !catEl) return;
    const previous = catEl.value;
    catEl.innerHTML = A.categoryOptions(typeEl.value, previous);
    if (!catEl.value && catEl.options.length) catEl.selectedIndex = 0;
  };

  A.saveLine = id => {
    const l = A.state.lines.find(x => x.id===id);
    Object.assign(l,{nom:lnom.value,type:ltype.value,categorie:lcat.value,proprietaire:lprop.value,defaultAmount:Number(ldef.value),dateDebut:ldeb.value,dateFin:lfin.value,actif:lact.value==='true',notes:lnotes.value});
    l.schedules = (l.schedules||[]).map((p,i) => ({from:document.getElementById('pf'+i).value,amount:Number(document.getElementById('pa'+i).value)}));
    A.save(); A.closeModal(); A.render();
  };
  A.addPeriod = id => { const l = A.state.lines.find(x => x.id===id); l.schedules.push({from:A.currentMonth,amount:l.defaultAmount}); A.save(); A.editLine(id); };
  A.deleteLine = id => { if(confirm('Supprimer définitivement cette ligne ?')){A.state.lines=A.state.lines.filter(x=>x.id!==id);A.save();A.closeModal();A.render();} };
  A.duplicatePrevMonth = () => {
    const prev = A.addMonths(A.currentMonth, -1);
    if (!confirm(`Copier les valeurs de ${A.monthLabel(prev)} vers ${A.monthLabel(A.currentMonth)} ?`)) return;
    A.state.lines.forEach(l => { if(!l.actif)return; l.overrides=l.overrides||{}; l.overrides[A.currentMonth]=A.lineAmount(l,prev); });
    A.save(); A.renderSuivi();
  };
})();


/* Export budget prévu mobile - PWA mobile */
(function(){
  const A = window.App;

  A.exportBudgetMobile = function(){
    try{
      A.ensureSettings && A.ensureSettings();
      if(!A.state || !Array.isArray(A.state.lines)){
        alert('Données cockpit indisponibles. Rechargez le cockpit puis réessayez.');
        return;
      }

      const month = A.currentMonth || (A.state.settings && A.state.settings.startMonth) || new Date().toISOString().slice(0,7);
      const wantedOrder = ['Vie courante','Charges','Mobilité','Santé','Enfants','Variable'];
      const budgetsMap = new Map(wantedOrder.map(name => [name, 0]));
      const norm = v => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const canonical = name => wantedOrder.find(w => norm(w) === norm(name)) || String(name || '').trim();
      const add = (name, amount) => {
        const key = canonical(name || 'Variable');
        if(!budgetsMap.has(key)) budgetsMap.set(key, 0);
        budgetsMap.set(key, Number(budgetsMap.get(key) || 0) + Number(amount || 0));
      };
      const amountFor = line => Number(A.lineAmountPlanned ? A.lineAmountPlanned(line, month) : A.lineAmount(line, month) || 0);

      const lines = A.state.lines.filter(line => {
        const type = norm(line.type);
        return line.actif !== false && (type === 'depense' || type === 'dépense');
      });

      const groupes = ((A.state.settings || {}).groupesMobiles || []).filter(g => g && g.nom);
      if(groupes.length){
        groupes.forEach(groupe => {
          let total = 0;
          if(groupe.ligneSuivi){
            const linked = lines.find(line => norm(line.nom) === norm(groupe.ligneSuivi));
            if(linked) total += amountFor(linked);
          }
          if(!total && Array.isArray(groupe.cats) && groupe.cats.length){
            const cats = new Set(groupe.cats.map(norm));
            lines.forEach(line => {
              if(cats.has(norm(line.categorie)) || cats.has(norm(line.nom))) total += amountFor(line);
            });
          }
          add(groupe.nom, total);
        });
      }else{
        lines.forEach(line => add(line.categorie || line.nom, amountFor(line)));
      }

      const budgets = wantedOrder.map(categorie => ({
        categorie,
        prevu: Math.round(Number(budgetsMap.get(categorie) || 0) * 100) / 100
      })).filter(row => row.prevu > 0);

      if(!budgets.length){
        alert('Aucun budget prévu à exporter pour ' + month + '. Vérifiez les lignes de dépenses actives du suivi mensuel.');
        return;
      }

      const payload = {
        mois: month,
        source: 'cockpit',
        version: 1,
        exportedAt: new Date().toISOString(),
        budgets
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'budget-mobile.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      alert('budget-mobile.json exporté : ' + budgets.length + ' catégorie(s).');
    }catch(err){
      console.error('Export budget mobile impossible', err);
      alert('Erreur export budget mobile : ' + (err && err.message ? err.message : err));
    }
  };
})();
