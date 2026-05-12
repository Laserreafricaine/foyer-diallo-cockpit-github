(function(){
  const A = window.App;
  const TYPE_COLOR = {immobilier:'#2457ff',terrain:'#138a5b',PEE:'#c58a1e',épargne:'#7555d9',entreprise:'#0e7490',autre:'#94a3b8'};

  A.renderPatrimoine = () => {
    const p = A.patrimoineNet();
    const allAssets = [...A.state.patrimoine];
    const totalBrut = p.brut, totalDettes = p.dettes, totalNet = p.net;
    const txEndet = totalBrut > 0 ? Math.round((totalDettes/totalBrut)*100) : 0;

    // Répartition géographique
    const france = allAssets.filter(x=>x.proprietaire!=='Sénégal').reduce((a,x)=>a+x.valeur,0) + p.liquid;
    const senegal = allAssets.filter(x=>x.proprietaire==='Sénégal').reduce((a,x)=>a+x.valeur,0);

    // LTV immo
    const immo = allAssets.filter(x=>x.type==='immobilier');
    const ltvGlobal = immo.length ? Math.round((immo.reduce((a,x)=>a+x.dette,0)/immo.reduce((a,x)=>a+x.valeur,1))*100) : 0;

    // By type pour chart
    const byType = {};
    allAssets.forEach(x=>{ byType[x.type]=(byType[x.type]||0)+x.valeur; });
    byType['Épargne liquide'] = p.liquid;
    const typeEntries = Object.entries(byType).sort((a,b)=>b[1]-a[1]);

    document.getElementById('app').innerHTML = `
    <div class="grid cards">
      <div class="card kpi kpi-blue">
        <small>Patrimoine brut</small><strong>${A.fmt(totalBrut)}</strong>
        <em>actifs valorisés</em>
      </div>
      <div class="card kpi kpi-red">
        <small>Dettes totales</small><strong>${A.fmt(totalDettes)}</strong>
        <em>taux d'endettement ${txEndet}%</em>
      </div>
      <div class="card kpi kpi-green">
        <small>Patrimoine net</small><strong>${A.fmt(totalNet)}</strong>
        <em>brut − dettes</em>
      </div>
      <div class="card kpi kpi-purple">
        <small>Épargne liquide</small><strong>${A.fmt(p.liquid)}</strong>
        <em>${Math.round((p.liquid/totalBrut)*100)}% du brut</em>
      </div>
      <div class="card kpi kpi-amber">
        <small>LTV immobilier</small><strong>${ltvGlobal}%</strong>
        <em>dette / valeur immo</em>
      </div>
      <div class="card kpi kpi-green2">
        <small>France / Sénégal</small>
        <strong>${Math.round((france/totalBrut)*100)}% / ${Math.round((senegal/totalBrut)*100)}%</strong>
        <em>répartition géographique</em>
      </div>
    </div>
    <br>

    <!-- Actifs avec jauge equity -->
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">
        <h3>Actifs — equity & endettement</h3>
        <button onclick="App.editAsset()">+ Ajouter actif</button>
      </div>
      <div class="pat-asset-grid">
        ${allAssets.map(x=>{
          const equity = x.valeur - x.dette;
          const ltv = x.valeur > 0 ? Math.round((x.dette/x.valeur)*100) : 0;
          const equityPct = x.valeur > 0 ? Math.round((equity/x.valeur)*100) : 100;
          const color = TYPE_COLOR[x.type]||'#94a3b8';
          return `<div class="pat-asset-card" style="border-top:3px solid ${color}">
            <div class="pat-asset-head">
              <div>
                <strong>${x.nom}</strong>
                <div class="pat-asset-meta"><span class="badge">${x.type}</span> <span class="badge">${x.proprietaire}</span></div>
              </div>
              <button class="ghost icon-btn" onclick="App.editAsset('${x.id}')">Éditer</button>
            </div>
            <div class="pat-asset-vals">
              <div class="pat-val-row"><span class="muted">Valeur</span><strong>${A.fmt(x.valeur)}</strong></div>
              ${x.dette>0?`<div class="pat-val-row"><span class="muted">Dette</span><strong class="negative">${A.fmt(x.dette)}</strong></div>`:''}
              <div class="pat-val-row"><span class="muted">Equity</span><strong class="positive">${A.fmt(equity)}</strong></div>
            </div>
            <div class="pat-equity-bar-label">
              <span>Equity ${equityPct}%</span>${x.dette>0?`<span>LTV ${ltv}%</span>`:''}
            </div>
            <div class="pat-equity-bar-wrap">
              <div class="pat-equity-fill" style="width:${equityPct}%;background:${color}"></div>
            </div>
            ${x.dateMaj?`<div class="pat-date-maj">Maj : ${x.dateMaj}${x.notes?` · ${x.notes}`:''}</div>`:''}
          </div>`;
        }).join('')}
        ${A.state.accounts.length?`
        <div class="pat-asset-card" style="border-top:3px solid #7555d9">
          <div class="pat-asset-head"><div><strong>Épargne liquide</strong><div class="pat-asset-meta"><span class="badge">comptes</span> <span class="badge">Foyer</span></div></div></div>
          <div class="pat-asset-vals">
            ${A.state.accounts.filter(c=>c.soldeReel>0).map(c=>`<div class="pat-val-row"><span class="muted">${c.nom}</span><strong>${A.fmt(c.soldeReel)}</strong></div>`).join('')}
          </div>
          <div class="pat-equity-bar-label"><span>Equity 100%</span></div>
          <div class="pat-equity-bar-wrap"><div class="pat-equity-fill" style="width:100%;background:#7555d9"></div></div>
        </div>`:``}
      </div>
    </div>

    <!-- Charts répartition -->
    <div class="grid two">
      <div class="card">
        <h3>Répartition par type d'actif</h3><br>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center">
          <div style="position:relative;height:200px;min-width:0">
            <canvas id="patDonut"></canvas>
          </div>
          <div class="pat-type-legend">
            ${typeEntries.map(([t,v])=>`
              <div class="pat-legend-row">
                <span class="pat-legend-dot" style="background:${TYPE_COLOR[t]||'#94a3b8'}"></span>
                <span class="pat-legend-name">${t}</span>
                <span class="pat-legend-amt">${A.fmt(v)}</span>
                <span class="pat-legend-pct muted">${Math.round((v/totalBrut)*100)}%</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Brut / Equity / Dettes par actif</h3><br>
        <div style="position:relative;height:220px;min-width:0">
          <canvas id="patStacked"></canvas>
        </div>
      </div>
    </div>
    <br>

    <!-- Alertes de mise à jour -->
    <div class="card">
      <h3>Alertes & recommandations</h3><br>
      <div class="alert-list">
        ${allAssets.filter(x=>{
          const daysOld=(new Date()-new Date(x.dateMaj))/(1000*60*60*24);
          return daysOld>90;
        }).map(x=>`<div class="alert amber"><strong>${x.nom}</strong> — valorisation à mettre à jour (dernière : ${x.dateMaj})</div>`).join('')}
        ${ltvGlobal>80?`<div class="alert red">LTV immobilier à ${ltvGlobal}% — au-dessus du seuil de 80%. Surveiller le ratio dette/valeur.</div>`:''}
        ${txEndet>40?`<div class="alert amber">Taux d'endettement global à ${txEndet}%. Objectif conseillé : sous 40%.</div>`:''}
        ${senegal>0?`<div class="alert green">Patrimoine Sénégal : ${A.fmt(senegal)} (${Math.round((senegal/totalBrut)*100)}% du brut). Bien diversifié géographiquement.</div>`:''}
        ${p.liquid<5000?`<div class="alert red">Épargne liquide faible (${A.fmt(p.liquid)}). Recommandation : 3 mois de charges minimum.</div>`:''}
      </div>
    </div>`;

    // Donut par type
    A.makeChart('patDonut','doughnut',{
      labels:typeEntries.map(([t])=>t),
      datasets:[{data:typeEntries.map(([,v])=>v),backgroundColor:typeEntries.map(([t])=>TYPE_COLOR[t]||'#94a3b8'),borderWidth:2,borderColor:'#fff'}]
    },{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${A.fmt(ctx.raw)}`}}},cutout:'55%'});

    // Stacked brut/equity/dette
    const assetLabels = allAssets.map(x=>x.nom.length>14?x.nom.slice(0,12)+'…':x.nom);
    A.makeChart('patStacked','bar',{
      labels:assetLabels,
      datasets:[
        {label:'Equity',data:allAssets.map(x=>x.valeur-x.dette),backgroundColor:'rgba(19,138,91,.78)',borderColor:'#138a5b',borderWidth:1,borderRadius:4,stack:'a'},
        {label:'Dette',data:allAssets.map(x=>x.dette),backgroundColor:'rgba(199,54,54,.62)',borderColor:'#c73636',borderWidth:1,borderRadius:4,stack:'a'}
      ]
    },{
      plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},
      scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}}}
    });
  };

  /* EDIT ASSET — inchangé */
  A.editAsset = id => {
    const x = A.state.patrimoine.find(a=>a.id===id)||{id:A.uid('asset'),nom:'',type:'immobilier',valeur:0,dette:0,proprietaire:'Foyer',dateMaj:new Date().toISOString().slice(0,10),notes:'',historique:[]};
    A.openModal('Actif patrimonial',`
      <div class="form-grid">
        <label>Nom<input id="anom" value="${x.nom}"></label>
        <label>Type<select id="atype">${['immobilier','épargne','PEE','terrain','entreprise','autre'].map(t=>`<option ${x.type===t?'selected':''}>${t}</option>`)}</select></label>
        <label>Propriétaire<select id="aprop">${App.ownerOptions(x.proprietaire)}</select></label>
        <label>Valeur<input type="number" id="aval" value="${x.valeur}"></label>
        <label>Dette liée<input type="number" id="adette" value="${x.dette}"></label>
        <label>Date maj<input type="date" id="amaj" value="${x.dateMaj}"></label>
        <label class="full">Notes<textarea id="anotes">${x.notes||''}</textarea></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveAsset('${x.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteAsset('${x.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveAsset = id => {
    const x = {id,nom:anom.value,type:atype.value,proprietaire:aprop.value,valeur:Number(aval.value),dette:Number(adette.value),dateMaj:amaj.value,notes:anotes.value,historique:[{date:amaj.value,valeur:Number(aval.value)}]};
    const i = A.state.patrimoine.findIndex(a=>a.id===id);
    if(i>=0){x.historique=[...(A.state.patrimoine[i].historique||[]),{date:amaj.value,valeur:x.valeur}];A.state.patrimoine[i]=x;}else A.state.patrimoine.push(x);
    A.save();A.closeModal();A.render();
  };
  A.deleteAsset = id => { A.state.patrimoine=A.state.patrimoine.filter(x=>x.id!==id);A.save();A.closeModal();A.render(); };
})();
