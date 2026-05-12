(function(){
  const A = window.App;

  // Calcul amortissement approximatif (mensualité connue)
  function amortSchedule(capital, mensualite, tauxAnnuel, dateDebut, dateFin) {
    const tauxMens = tauxAnnuel / 100 / 12;
    let cap = capital;
    const rows = [];
    let date = dateDebut;
    while(date <= dateFin && cap > 0 && rows.length < 360) {
      const interets = tauxMens > 0 ? cap * tauxMens : 0;
      const principal = Math.min(mensualite - interets, cap);
      cap = Math.max(0, cap - principal);
      rows.push({date, interets: Math.round(interets), principal: Math.round(principal), reste: Math.round(cap)});
      date = A.addMonths(date, 1);
    }
    return rows;
  }

  function moisRestants(dateFin) {
    const fin = new Date(dateFin+'-01');
    const now = new Date(A.currentMonth+'-01');
    return Math.max(0, (fin.getFullYear()-now.getFullYear())*12+(fin.getMonth()-now.getMonth()));
  }

  A.renderCredits = () => {
    const credits = A.state.credits;
    const totalMens   = credits.reduce((a,c)=>a+Number(c.mensualite),0);
    const totalCap    = credits.reduce((a,c)=>a+Number(c.capital),0);
    const revenusMois = A.monthSummary(A.currentMonth).revenus;
    const txCharge    = revenusMois>0 ? Math.round((totalMens/revenusMois)*100) : 0;

    // Intérêts restants estimés (somme des mensualités restantes - capital restant)
    const totalInterets = credits.reduce((a,c)=>{
      const m = moisRestants(c.dateFin);
      return a + Math.max(0, c.mensualite*m - Number(c.capital));
    },0);

    // Prochain crédit à terminer
    const sorted = [...credits].filter(c=>c.dateFin>=A.currentMonth).sort((a,b)=>a.dateFin.localeCompare(b.dateFin));
    const next = sorted[0];

    // Trésorerie libérée par échéance (12 prochains mois + futurs)
    const liberations = credits.filter(c=>c.dateFin>=A.currentMonth).map(c=>({
      ...c,
      moisRestants: moisRestants(c.dateFin),
      interetsRestants: Math.max(0, c.mensualite*moisRestants(c.dateFin) - c.capital)
    })).sort((a,b)=>a.dateFin.localeCompare(b.dateFin));

    // Projection capital restant sur 60 mois
    const ms60 = A.months(A.currentMonth, 60);

    document.getElementById('app').innerHTML = `
    <div class="grid cards">
      <div class="card kpi kpi-amber">
        <small>Mensualités totales</small><strong>${A.fmt(totalMens)}</strong>
        <em>${txCharge}% des revenus</em>
      </div>
      <div class="card kpi kpi-red">
        <small>Capital restant total</small><strong>${A.fmt(totalCap)}</strong>
        <em>${credits.length} crédits</em>
      </div>
      <div class="card kpi kpi-purple">
        <small>Intérêts restants estimés</small><strong>${A.fmt(Math.round(totalInterets))}</strong>
        <em>coût résiduel du crédit</em>
      </div>
      <div class="card kpi kpi-green">
        <small>Trésorerie libérée totale</small><strong>${A.fmt(totalMens)}</strong>
        <em>à terme (toutes échéances)</em>
      </div>
      <div class="card kpi kpi-blue">
        <small>Prochain terme</small>
        <strong>${next ? A.monthLabel(next.dateFin) : '—'}</strong>
        <em>${next ? `${next.nom} (+${A.fmt(next.mensualite)}/mois)` : 'aucun'}</em>
      </div>
      <div class="card kpi kpi-green2">
        <small>Taux d'effort crédits</small><strong>${txCharge}%</strong>
        <em>mensualités / revenus</em>
      </div>
    </div>
    <br>

    <!-- Tableau enrichi -->
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">
        <h3>Tableau des crédits</h3>
        <button onclick="App.editCredit()">+ Ajouter crédit</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Crédit</th><th>Type</th>
            <th class="num">Mensualité</th><th class="num">Capital restant</th>
            <th>Taux</th><th class="num">Mois restants</th>
            <th class="num">Intérêts restants</th><th>Fin</th>
            <th>Libération</th><th></th>
          </tr></thead>
          <tbody>
            ${credits.map(c=>{
              const m = moisRestants(c.dateFin);
              const interets = Math.max(0, c.mensualite*m - c.capital);
              const isUrgent = c.dateFin <= A.addMonths(A.currentMonth, 3);
              return `<tr ${isUrgent?'class="row-urgent"':''}>
                <td><strong>${c.nom}</strong><br><small>${c.actifLie||''} ${c.notes||''}</small></td>
                <td><span class="badge">${c.type}</span></td>
                <td class="num"><strong>${A.fmt(c.mensualite)}</strong></td>
                <td class="num">${A.fmt(c.capital)}</td>
                <td>${c.taux}%</td>
                <td class="num">${m} mois</td>
                <td class="num">${A.fmt(Math.round(interets))}</td>
                <td>${c.dateFin}</td>
                <td class="positive">+${A.fmt(c.mensualite)}/mois</td>
                <td><button class="ghost icon-btn" onclick="App.editCredit('${c.id}')">Éditer</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Timeline libérations + projection -->
    <div class="grid two">
      <div class="card">
        <h3>Timeline de désengagement</h3><br>
        <div class="credit-timeline">
          ${liberations.map((c,i)=>{
            const urgency = c.moisRestants <= 3 ? 'red' : c.moisRestants <= 12 ? 'amber' : 'green';
            return `<div class="credit-tl-item ${urgency}">
              <div class="credit-tl-dot"></div>
              <div class="credit-tl-content">
                <div class="credit-tl-date">${A.monthLabel(c.dateFin)}</div>
                <strong>${c.nom}</strong>
                <div class="credit-tl-detail">
                  <span>+${A.fmt(c.mensualite)}/mois libérés</span>
                  <span>${c.moisRestants} mois restants</span>
                </div>
                ${i<liberations.length-1?`<div class="credit-tl-cumul muted">Trésorerie cumulée libérée : ${A.fmt(liberations.slice(0,i+1).reduce((a,x)=>a+x.mensualite,0))}/mois</div>`:''}
              </div>
            </div>`;
          }).join('')}
          <div class="credit-tl-item green">
            <div class="credit-tl-dot"></div>
            <div class="credit-tl-content">
              <div class="credit-tl-date">À terme</div>
              <strong>Toutes échéances terminées</strong>
              <div class="credit-tl-detail"><span class="positive">+${A.fmt(totalMens)}/mois libérés au total</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Projection capital restant — 60 mois</h3><br>
        <div style="position:relative;height:260px;min-width:0"><canvas id="creditProjection"></canvas></div>
      </div>
    </div>
    <br>

    <!-- Alertes -->
    <div class="card">
      <h3>Alertes</h3><br>
      <div class="alert-list">
        ${credits.filter(c=>c.dateFin<=A.addMonths(A.currentMonth,3)&&c.dateFin>=A.currentMonth).map(c=>`
          <div class="alert red"><strong>${c.nom}</strong> se termine en ${A.monthLabel(c.dateFin)} — préparer la réallocation de ${A.fmt(c.mensualite)}/mois.</div>
        `).join('')}
        ${txCharge>35?`<div class="alert red">Taux d'effort crédits à ${txCharge}% — au-dessus du seuil bancaire recommandé (33%).</div>`:''}
        ${txCharge<=33?`<div class="alert green">Taux d'effort crédits sain à ${txCharge}% (sous les 33% conseillés).</div>`:''}
        ${totalInterets>5000?`<div class="alert amber">Intérêts restants estimés : ${A.fmt(Math.round(totalInterets))}. Évaluer la possibilité de remboursement anticipé.</div>`:''}
      </div>
    </div>`;

    // Projection capital par crédit
    const COLORS = ['#2457ff','#c73636','#c58a1e','#7555d9'];
    const datasets = credits.map((c,i)=>{
      const schedule = amortSchedule(c.capital, c.mensualite, c.taux, A.currentMonth, c.dateFin);
      const data = ms60.map(m=>{
        const row = schedule.find(r=>r.date===m);
        if(m > c.dateFin) return 0;
        if(row) return row.reste;
        return c.capital;
      });
      return {label:c.nom,data,borderColor:COLORS[i%COLORS.length],backgroundColor:COLORS[i%COLORS.length]+'18',fill:true,tension:0.3,pointRadius:0};
    });
    A.makeChart('creditProjection','line',{
      labels:ms60.map(m=>m.slice(0,7)).filter((_,i)=>i%3===0),
      datasets:datasets.map(d=>({...d,data:d.data.filter((_,i)=>i%3===0)}))
    },{
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},
      scales:{y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'},min:0},x:{grid:{display:false}}}
    });
  };

  /* CREDIT CRUD */
  A.editCredit = id => {
    const c = A.state.credits.find(x=>x.id===id)||{id:A.uid('cred'),nom:'',mensualite:0,capital:0,taux:0,dateDebut:A.currentMonth,dateFin:A.currentMonth,type:'Immobilier',actifLie:'',notes:''};
    A.openModal('Crédit',`
      <div class="form-grid">
        <label>Nom<input id="crnom" value="${c.nom}"></label>
        <label>Type<select id="crtype">${['Immobilier','Consommation','Auto','Travaux','Autre'].map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`)}</select></label>
        <label>Mensualité<input type="number" id="crmen" value="${c.mensualite}"></label>
        <label>Capital restant<input type="number" id="crcap" value="${c.capital}"></label>
        <label>Taux annuel (%)<input type="number" step="0.01" id="crtaux" value="${c.taux}"></label>
        <label>Date début<input type="month" id="crdeb" value="${c.dateDebut}"></label>
        <label>Date fin<input type="month" id="crfin" value="${c.dateFin}"></label>
        <label>Actif lié<input id="cract" value="${c.actifLie||''}"></label>
        <label class="full">Notes<textarea id="crnotes">${c.notes||''}</textarea></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveCredit('${c.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteCredit('${c.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveCredit = id => {
    const c={id,nom:crnom.value,type:crtype.value,mensualite:Number(crmen.value),capital:Number(crcap.value),taux:Number(crtaux.value),dateDebut:crdeb.value,dateFin:crfin.value,actifLie:cract.value,notes:crnotes.value};
    const i=A.state.credits.findIndex(x=>x.id===id);
    if(i>=0)A.state.credits[i]=c;else A.state.credits.push(c);
    A.save();A.closeModal();A.render();
  };
  A.deleteCredit = id => { A.state.credits=A.state.credits.filter(x=>x.id!==id);A.save();A.closeModal();A.render(); };
})();
