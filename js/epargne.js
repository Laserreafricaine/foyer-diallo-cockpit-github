(function(){
  const A = window.App;
  const TYPE_COLOR = {'Livret A':'#138a5b','PEL':'#2457ff','PEA':'#7555d9','PEE':'#c58a1e','Enfant':'#0e7490','autre':'#94a3b8'};

  A.renderEpargne = () => {
    const accounts = A.state.accounts;
    const totalReel = accounts.reduce((a,c)=>a+Number(c.soldeReel||0),0);
    const totalVers = accounts.reduce((a,c)=>a+Number(c.versementAuto||0),0);
    const totalObj  = accounts.reduce((a,c)=>a+Number(c.objectif||0),0);
    const txObjectif = totalObj > 0 ? Math.round((totalReel/totalObj)*100) : null;

    // Projection schedule-aware 24 mois
    const ms24 = A.months(A.currentMonth, 24);

    // Par type
    const byType = {};
    accounts.forEach(c=>{ const t=c.typeCompte||'autre'; byType[t]=(byType[t]||0)+Number(c.soldeReel||0); });
    const typeEntries = Object.entries(byType).sort((a,b)=>b[1]-a[1]);

    // Changements planifiés (depuis les schedules de lignes épargne)
    const epLines = A.state.lines.filter(l=>l.type==='épargne'&&l.actif);
    const futureChanges = [];
    epLines.forEach(l=>{
      (l.schedules||[]).filter(s=>s.from>A.currentMonth).sort((a,b)=>a.from.localeCompare(b.from)).forEach(s=>{
        const prev = A.lineAmount(l, A.addMonths(s.from,-1));
        const diff = s.amount - prev;
        if(Math.abs(diff)>0) futureChanges.push({mois:s.from,nom:l.nom,montant:s.amount,diff});
      });
    });
    futureChanges.sort((a,b)=>a.mois.localeCompare(b.mois));

    document.getElementById('app').innerHTML = `
    <div class="grid cards">
      <div class="card kpi kpi-green">
        <small>Total épargne réelle</small><strong>${A.fmt(totalReel)}</strong>
        <em>${accounts.length} comptes</em>
      </div>
      <div class="card kpi kpi-blue">
        <small>Versements mensuels</small><strong>${A.fmt(totalVers)}</strong>
        <em>automatisés</em>
      </div>
      ${txObjectif!==null?`
      <div class="card kpi kpi-amber">
        <small>Objectif global</small><strong>${A.fmt(totalObj)}</strong>
        <em>atteint à ${txObjectif}%</em>
      </div>`:``}
      <div class="card kpi kpi-purple">
        <small>Projection à 24 mois</small>
        <strong>${A.fmt(totalReel + totalVers*24)}</strong>
        <em>versements seuls (hors intérêts)</em>
      </div>
    </div>
    <br>

    <!-- Comptes avec jauges objectif -->
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">
        <h3>Comptes épargne</h3>
        <button onclick="App.editAccount()">+ Ajouter compte</button>
      </div>
      <div class="epa-account-grid">
        ${accounts.map(c=>{
          const solde = Number(c.soldeReel||0);
          const obj   = Number(c.objectif||0);
          const pct   = obj>0 ? Math.min(100,Math.round((solde/obj)*100)) : null;
          const vers  = Number(c.versementAuto||0);
          const color = TYPE_COLOR[c.typeCompte]||'#94a3b8';
          const moisObj = (obj>0&&vers>0) ? Math.ceil((obj-solde)/vers) : null;
          return `<div class="epa-card" style="border-top:3px solid ${color}">
            <div class="epa-card-head">
              <div>
                <strong>${c.nom}</strong>
                <div class="epa-card-meta"><span class="badge">${c.typeCompte}</span> <span class="badge">${c.proprietaire}</span></div>
              </div>
              <button class="ghost icon-btn" onclick="App.editAccount('${c.id}')">Éditer</button>
            </div>
            <div class="epa-solde">${A.fmt(solde)}</div>
            ${vers>0?`<div class="epa-vers">+${A.fmt(vers)}/mois</div>`:''}
            ${pct!==null?`
              <div class="epa-obj-label">
                <span>Objectif ${A.fmt(obj)}</span>
                <span>${pct}%${moisObj?` · encore ${moisObj} mois`:''}</span>
              </div>
              <div class="epa-obj-bar"><div class="epa-obj-fill" style="width:${pct}%;background:${color}"></div></div>
            `:`<div class="epa-no-obj muted">Pas d'objectif défini</div>`}
            ${c.notes?`<div class="epa-notes muted">${c.notes}</div>`:''}
            <div class="epa-maj muted">Maj : ${c.dateMaj}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Projection + répartition -->
    <div class="grid two">
      <div class="card">
        <div class="section-title">
          <h3>Projection 24 mois par compte</h3>
          <span class="muted" style="font-size:12px">linéaire (hors intérêts)</span>
        </div>
        <canvas id="epargneChart" style="max-height:280px;display:block;width:100%"></canvas>
      </div>
      <div class="card">
        <h3>Répartition par type de compte</h3><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center">
          <div style="position:relative;height:200px;min-width:0">
            <canvas id="epaDonut"></canvas>
          </div>
          <div>
            ${typeEntries.map(([t,v])=>`
              <div class="pat-legend-row">
                <span class="pat-legend-dot" style="background:${TYPE_COLOR[t]||'#94a3b8'}"></span>
                <span class="pat-legend-name">${t}</span>
                <span class="pat-legend-amt">${A.fmt(v)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <br>

    <!-- Changements planifiés -->
    ${futureChanges.length?`
    <div class="card">
      <h3>Changements planifiés</h3><br>
      <div class="alert-list">
        ${futureChanges.map(fc=>`
          <div class="alert ${fc.diff>0?'green':'amber'}">
            <strong>${A.monthLabel(fc.mois)}</strong> — ${fc.nom} :
            nouveau versement ${A.fmt(fc.montant)}/mois
            <span class="${fc.diff>=0?'positive':'negative'}"> (${fc.diff>=0?'+':''}${A.fmt(fc.diff)}/mois)</span>
          </div>`).join('')}
      </div>
    </div>`:''}`;

    // Projection chart
    const COLORS = ['#2457ff','#138a5b','#c58a1e','#7555d9','#0e7490','#be185d','#0369a1','#b45309'];
    A.makeChart('epargneChart','line',{
      labels: ms24.map(m=>A.monthLabel(m).slice(0,3)+' '+m.slice(2,4)),
      datasets: accounts.filter(c=>Number(c.versementAuto||0)>0||Number(c.soldeReel||0)>0).map((c,i)=>({
        label: c.nom,
        data: ms24.map((_,idx)=>Number(c.soldeReel||0)+idx*Number(c.versementAuto||0)),
        borderColor: COLORS[i%COLORS.length],
        backgroundColor: COLORS[i%COLORS.length]+'18',
        fill: false,
        tension: 0.3,
        pointRadius: 0
      }))
    },{
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},
      scales:{y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}},x:{grid:{display:false}}}
    });

    A.makeChart('epaDonut','doughnut',{
      labels:typeEntries.map(([t])=>t),
      datasets:[{data:typeEntries.map(([,v])=>v),backgroundColor:typeEntries.map(([t])=>TYPE_COLOR[t]||'#94a3b8'),borderWidth:2,borderColor:'#fff'}]
    },{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${A.fmt(ctx.raw)}`}}},cutout:'55%'});
  };

  /* ACCOUNT CRUD */
  A.editAccount = id => {
    const c = A.state.accounts.find(x=>x.id===id)||{id:A.uid('acc'),nom:'',proprietaire:'Foyer',typeCompte:'Livret A',soldeDepart:0,versementAuto:0,soldeReel:0,dateMaj:new Date().toISOString().slice(0,10),objectif:0,notes:'',historique:[]};
    A.openModal('Compte épargne',`
      <div class="form-grid">
        <label>Nom<input id="cnom" value="${c.nom}"></label>
        <label>Propriétaire<select id="cprop">${App.ownerOptions(c.proprietaire)}</select></label>
        <label>Type<select id="ctype">${['Livret A','PEL','PEA','PEE','Enfant','autre'].map(t=>`<option ${c.typeCompte===t?'selected':''}>${t}</option>`)}</select></label>
        <label>Solde réel constaté<input type="number" id="creel" value="${c.soldeReel}"></label>
        <label>Versement mensuel<input type="number" id="cvers" value="${c.versementAuto}"></label>
        <label>Objectif<input type="number" id="cobj" value="${c.objectif||0}"></label>
        <label>Date maj<input type="date" id="cmaj" value="${c.dateMaj}"></label>
        <label class="full">Notes<textarea id="cnotes">${c.notes||''}</textarea></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveAccount('${c.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteAccount('${c.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveAccount = id => {
    const c={id,nom:cnom.value,proprietaire:cprop.value,typeCompte:ctype.value,soldeDepart:Number(creel.value),versementAuto:Number(cvers.value),soldeReel:Number(creel.value),dateMaj:cmaj.value,objectif:Number(cobj.value),notes:cnotes.value,historique:[{date:cmaj.value,valeur:Number(creel.value)}]};
    const i=A.state.accounts.findIndex(x=>x.id===id);
    if(i>=0){c.historique=[...(A.state.accounts[i].historique||[]),{date:cmaj.value,valeur:c.soldeReel}];A.state.accounts[i]=c;}else A.state.accounts.push(c);
    if(A.upsertEpargneLineFromAccount)A.upsertEpargneLineFromAccount(c,true);
    A.save();A.closeModal();A.render();
  };
  A.deleteAccount = id => {
    A.state.accounts=A.state.accounts.filter(x=>x.id!==id);
    A.state.lines=A.state.lines.filter(l=>l.accountId!==id&&l.id!==('epa-'+id));
    A.save();A.closeModal();A.render();
  };
})();
