(function(){
  const A = window.App;

  /* ─── RENDER ANALYSE (Revenus / Dépenses) — identique à v20 ─── */
  const PALETTE=['#2457ff','#138a5b','#c58a1e','#7555d9','#0e7490','#b45309','#be185d','#0369a1'];
  const CATS_CONTRAINTES=['Charges','Immobilier','Mobilité','Santé','Auto','Travaux'];
  const PROP_COLORS={Mandiaye:'#2457ff',Julie:'#138a5b',Foyer:'#7555d9',Enfants:'#c58a1e',Sénégal:'#0e7490'};
  function variation(curr,prev){if(!prev)return null;return Math.round(((curr-prev)/prev)*100);}
  function variationBadge(pct,inverse=false){if(pct===null)return'<span class="badge">–</span>';const good=inverse?pct<=0:pct>=0;const sign=pct>=0?'+':'';return`<span class="badge ${good?'green':'red'}">${sign}${pct}%</span>`;}
  function sparkline(values){const max=Math.max(...values,1);const w=80,h=28;const pts=values.map((v,i)=>`${Math.round((i/(values.length-1))*w)},${Math.round(h-(v/max)*h)}`).join(' ');const color=values[values.length-1]>=values[0]?'#138a5b':'#c73636';return`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`;}

  A.renderAnalyse=type=>{
    const isRev=type==='revenu';const label=isRev?'Revenus':'Dépenses';
    const ms=A.months(A.currentMonth,12);const prevMonth=A.addMonths(A.currentMonth,-1);
    const lines=A.state.lines.filter(l=>l.type===type&&l.actif);
    const monthTotal=m=>A.monthRows(m).filter(r=>r.type===type).reduce((a,b)=>a+b.amount,0);
    const curr=monthTotal(A.currentMonth),prev=monthTotal(prevMonth),series=ms.map(monthTotal);
    const avg12=Math.round(series.reduce((a,b)=>a+b,0)/ms.length),min12=Math.min(...series),max12=Math.max(...series),varPct=variation(curr,prev);
    const byCat={};lines.forEach(l=>{const v=A.lineAmount(l,A.currentMonth);byCat[l.categorie]=(byCat[l.categorie]||0)+v;});
    const catEntries=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const byProp={};lines.forEach(l=>{const v=A.lineAmount(l,A.currentMonth);byProp[l.proprietaire]=(byProp[l.proprietaire]||0)+v;});
    const propEntries=Object.entries(byProp).sort((a,b)=>b[1]-a[1]);
    const allCats=[...new Set(lines.map(l=>l.categorie))];
    const stackedDatasets=allCats.map((cat,i)=>({label:cat,data:ms.map(m=>A.state.lines.filter(l=>l.type===type&&l.actif&&l.categorie===cat).reduce((a,l)=>a+A.lineAmount(l,m),0)),backgroundColor:PALETTE[i%PALETTE.length]+'cc',borderColor:PALETTE[i%PALETTE.length],borderWidth:1,borderRadius:4}));
    const summary=A.monthSummary(A.currentMonth);const charges=summary.depenses+summary.credits+summary.epargne;
    const coverageRatio=curr>0?Math.round((curr/charges)*100):0;
    const revTypes={Salaire:'actif',Variable:'actif',Allocation:'passif',Passif:'passif',Annexe:'actif'};
    const revActif=isRev?lines.filter(l=>revTypes[l.categorie]!=='passif').reduce((a,l)=>a+A.lineAmount(l,A.currentMonth),0):0;
    const revPassif=isRev?lines.filter(l=>revTypes[l.categorie]==='passif').reduce((a,l)=>a+A.lineAmount(l,A.currentMonth),0):0;
    const depContraintes=!isRev?lines.filter(l=>CATS_CONTRAINTES.some(c=>l.categorie.includes(c))).reduce((a,l)=>a+A.lineAmount(l,A.currentMonth),0):0;
    const depDisc=!isRev?curr-depContraintes:0;
    const ratioEffort=!isRev?(curr>0&&summary.revenus>0?Math.round((curr/summary.revenus)*100):0):0;
    const salPrincipal=A.lineAmount(A.state.lines.find(l=>l.id==='salaire-mandiaye')||{},A.currentMonth);
    const depSalaire=isRev?Math.round((salPrincipal/(curr||1))*100):0;
    document.getElementById('app').innerHTML=`<div class="grid cards analyse-kpis"><div class="card kpi ${isRev?'kpi-green':'kpi-red'}"><small>${label} ${A.monthLabel(A.currentMonth)}</small><strong>${A.fmt(curr)}</strong><em>vs mois préc. ${variationBadge(varPct,!isRev)}</em></div><div class="card kpi kpi-blue"><small>Moyenne 12 mois</small><strong>${A.fmt(avg12)}</strong><em>${curr>avg12?'▲ au-dessus':'▼ en-dessous'} de la moyenne</em></div><div class="card kpi kpi-green2"><small>Minimum 12 mois</small><strong>${A.fmt(min12)}</strong><em>${A.monthLabel(ms[series.indexOf(min12)])}</em></div><div class="card kpi kpi-amber"><small>Maximum 12 mois</small><strong>${A.fmt(max12)}</strong><em>${A.monthLabel(ms[series.indexOf(max12)])}</em></div>${isRev?`<div class="card kpi kpi-purple"><small>Taux de couverture</small><strong>${coverageRatio}%</strong><em>revenus / charges totales</em></div><div class="card kpi kpi-amber"><small>Dépendance salaire</small><strong>${depSalaire}%</strong><em>salaire Mandiaye / total</em></div>`:`<div class="card kpi kpi-purple"><small>Taux d'effort</small><strong>${ratioEffort}%</strong><em>dépenses / revenus</em></div><div class="card kpi kpi-amber"><small>Charges contraintes</small><strong>${A.fmt(depContraintes)}</strong><em>${Math.round((depContraintes/(curr||1))*100)}% du total</em></div>`}</div><br><div class="grid two"><div class="card"><div class="section-title"><h3>${label} par catégorie — 12 mois</h3><button class="secondary" onclick="App.goto('suivi')">Modifier →</button></div><canvas id="stackedChart" style="max-height:280px"></canvas></div><div class="card"><h3>Répartition ce mois</h3><br><div class="analyse-donut-wrap"><canvas id="donutChart" style="max-height:220px"></canvas></div><div class="analyse-cat-list">${catEntries.map(([cat,v],i)=>`<div class="analyse-cat-row"><span class="analyse-cat-dot" style="background:${PALETTE[i%PALETTE.length]}"></span><span class="analyse-cat-name">${cat}</span><span class="analyse-cat-bar-wrap"><span class="analyse-cat-bar" style="width:${Math.round((v/(curr||1))*100)}%;background:${PALETTE[i%PALETTE.length]}20;border-color:${PALETTE[i%PALETTE.length]}"></span></span><span class="analyse-cat-pct">${Math.round((v/(curr||1))*100)}%</span><span class="analyse-cat-amt">${A.fmt(v)}</span></div>`).join('')}</div></div></div><br><div class="grid two"><div class="card"><h3>Par propriétaire</h3><br><canvas id="propChart" style="max-height:200px"></canvas><div class="analyse-prop-grid">${propEntries.map(([prop,v])=>`<div class="analyse-prop-card" style="border-left:3px solid ${PROP_COLORS[prop]||'#94a3b8'}"><span class="analyse-prop-name">${prop}</span><strong>${A.fmt(v)}</strong><span class="muted">${Math.round((v/(curr||1))*100)}%</span></div>`).join('')}</div></div>${isRev?`<div class="card"><h3>Revenus actifs vs passifs</h3><br><div class="analyse-actif-grid"><div class="analyse-actif-card green"><div class="lab">Revenus actifs<span class="help">Salaires, variables, annexes</span></div><strong>${A.fmt(revActif)}</strong><div class="bar-full"><div class="bar-fill green" style="width:${Math.round((revActif/(curr||1))*100)}%"></div></div><span class="muted">${Math.round((revActif/(curr||1))*100)}% du total</span></div><div class="analyse-actif-card purple"><div class="lab">Revenus passifs<span class="help">Loyers, allocations</span></div><strong>${A.fmt(revPassif)}</strong><div class="bar-full"><div class="bar-fill purple" style="width:${Math.round((revPassif/(curr||1))*100)}%"></div></div><span class="muted">${Math.round((revPassif/(curr||1))*100)}% du total</span></div></div><div class="analyse-events"><div class="analyse-events-title">Changements à venir</div>${A.state.lines.filter(l=>l.type==='revenu'&&l.schedules&&l.schedules.length>1).map(l=>{const next=l.schedules.filter(s=>s.from>A.currentMonth).sort((a,b)=>a.from.localeCompare(b.from))[0];if(!next)return'';const curr_v=A.lineAmount(l,A.currentMonth);const diff=next.amount-curr_v;return`<div class="analyse-event ${diff>=0?'green':'red'}"><span>${A.monthLabel(next.from)}</span><strong>${l.nom}</strong><span>${diff>=0?'+':''}${A.fmt(diff)}/mois</span></div>`;}).filter(Boolean).join('')||'<p class="muted" style="font-size:13px">Aucun changement planifié.</p>'}</div></div>`:`<div class="card"><h3>Charges contraintes vs discrétionnaires</h3><br><div class="analyse-actif-grid"><div class="analyse-actif-card red"><div class="lab">Charges contraintes<span class="help">Énergie, assurances, transport…</span></div><strong>${A.fmt(depContraintes)}</strong><div class="bar-full"><div class="bar-fill red" style="width:${Math.round((depContraintes/(curr||1))*100)}%"></div></div><span class="muted">${Math.round((depContraintes/(curr||1))*100)}% du total</span></div><div class="analyse-actif-card amber"><div class="lab">Dépenses discrétionnaires<span class="help">Alimentation, enfants, santé…</span></div><strong>${A.fmt(depDisc)}</strong><div class="bar-full"><div class="bar-fill amber" style="width:${Math.round((depDisc/(curr||1))*100)}%"></div></div><span class="muted">${Math.round((depDisc/(curr||1))*100)}% du total</span></div></div><div class="analyse-events"><div class="analyse-events-title">Top postes ce mois</div>${[...lines].sort((a,b)=>A.lineAmount(b,A.currentMonth)-A.lineAmount(a,A.currentMonth)).slice(0,5).map((l,i)=>{const v=A.lineAmount(l,A.currentMonth);return`<div class="analyse-top-row"><span class="analyse-top-rank">${i+1}</span><span class="analyse-top-name">${l.nom}</span><div class="analyse-top-bar-wrap"><div class="analyse-top-bar" style="width:${Math.round((v/(max12||1))*100)}%"></div></div><span class="analyse-top-amt">${A.fmt(v)}</span></div>`;}).join('')}</div></div>`}</div><br><div class="card"><div class="section-title"><h3>Détail ligne par ligne</h3><button class="secondary" onclick="App.goto('suivi')">Modifier dans le suivi →</button></div><div class="table-wrap"><table><thead><tr><th>Ligne</th><th>Catégorie</th><th>Propriétaire</th><th class="num">Mois courant</th><th class="num">Mois préc.</th><th class="num">Variation</th><th class="num">% du total</th><th class="num">Moyenne 12m</th><th>Tendance 12m</th></tr></thead><tbody>${[...lines].sort((a,b)=>A.lineAmount(b,A.currentMonth)-A.lineAmount(a,A.currentMonth)).map(l=>{const v=A.lineAmount(l,A.currentMonth);const vp=A.lineAmount(l,prevMonth);const vari=variation(v,vp);const seriesL=ms.map(m=>A.lineAmount(l,m));const avgL=Math.round(seriesL.reduce((a,b)=>a+b,0)/ms.length);const pct=Math.round((v/(curr||1))*100);return`<tr><td><strong>${l.nom}</strong></td><td><span class="badge">${l.categorie}</span></td><td>${l.proprietaire}</td><td class="num"><strong>${A.fmt(v)}</strong></td><td class="num">${A.fmt(vp)}</td><td class="num">${variationBadge(vari,!isRev)}</td><td class="num">${pct}%</td><td class="num">${A.fmt(avgL)}</td><td>${sparkline(seriesL)}</td></tr>`;}).join('')}</tbody></table></div></div>`;
    A.makeChart('stackedChart','bar',{labels:ms.map(m=>A.monthLabel(m).slice(0,3)+' '+m.slice(0,4)),datasets:stackedDatasets},{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}}}});
    A.makeChart('donutChart','doughnut',{labels:catEntries.map(([k])=>k),datasets:[{data:catEntries.map(([,v])=>v),backgroundColor:PALETTE.slice(0,catEntries.length),borderWidth:2,borderColor:'#fff'}]},{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${A.fmt(ctx.raw)}`}}},cutout:'60%'});
    A.makeChart('propChart','bar',{labels:propEntries.map(([k])=>k),datasets:[{label,data:propEntries.map(([,v])=>v),backgroundColor:propEntries.map(([k])=>(PROP_COLORS[k]||'#94a3b8')+'cc'),borderColor:propEntries.map(([k])=>PROP_COLORS[k]||'#94a3b8'),borderWidth:1.5,borderRadius:8}]},{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>A.fmt(ctx.raw)}}},scales:{x:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}},y:{grid:{display:false}}}});
  };

  /* ─── SIMULATEURS ─── */
  A.renderSimulateurs = () => {
    const s = A.monthSummary(A.currentMonth);
    document.getElementById('app').innerHTML = `
    <div class="sim-tabs">
      <button class="sim-tab active" onclick="App.showSimTab('cashflow',this)">💰 Cashflow libre</button>
      <button class="sim-tab" onclick="App.showSimTab('credit',this)">🏦 Simulateur crédit</button>
      <button class="sim-tab" onclick="App.showSimTab('invest',this)">📈 Investissement</button>
      <button class="sim-tab" onclick="App.showSimTab('scenarios',this)">🔮 Scénarios</button>
    </div>

    <!-- CASHFLOW -->
    <div id="sim-cashflow" class="sim-panel">
      <div class="grid two">
        <div class="card">
          <h3>Simulateur cashflow</h3><br>
          <div class="form-grid">
            <label>Revenus<input type="number" id="simRev" value="${s.revenus}" oninput="App.calcSim()"></label>
            <label>Dépenses<input type="number" id="simDep" value="${s.depenses}" oninput="App.calcSim()"></label>
            <label>Crédits<input type="number" id="simCred" value="${s.credits}" oninput="App.calcSim()"></label>
            <label>Épargne<input type="number" id="simEpa" value="${s.epargne}" oninput="App.calcSim()"></label>
          </div>
          <div id="simResult" class="audit-box" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h3>Projection patrimoine 5 ans</h3><br>
          <canvas id="simChart"></canvas>
        </div>
      </div>
    </div>

    <!-- CRÉDIT -->
    <div id="sim-credit" class="sim-panel hidden">
      <div class="grid two">
        <div class="card">
          <h3>Simulateur de prêt</h3><br>
          <div class="form-grid">
            <label>Montant emprunté (€)<input type="number" id="cMontant" value="200000" oninput="App.calcCredit()"></label>
            <label>Durée (mois)<input type="number" id="cDuree" value="240" oninput="App.calcCredit()"></label>
            <label>Taux annuel (%)<input type="number" id="cTaux" step="0.01" value="3.5" oninput="App.calcCredit()"></label>
            <label>Assurance (%/an)<input type="number" id="cAssur" step="0.01" value="0.3" oninput="App.calcCredit()"></label>
          </div>
          <div id="creditResult" class="audit-box" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h3>Amortissement capital / intérêts</h3><br>
          <canvas id="creditSimChart"></canvas>
        </div>
      </div>
    </div>

    <!-- INVESTISSEMENT -->
    <div id="sim-invest" class="sim-panel hidden">
      <div class="grid two">
        <div class="card">
          <h3>Simulateur investissement</h3><br>
          <div class="form-grid">
            <label>Capital initial (€)<input type="number" id="iCapital" value="10000" oninput="App.calcInvest()"></label>
            <label>Versement mensuel (€)<input type="number" id="iVers" value="500" oninput="App.calcInvest()"></label>
            <label>Rendement annuel (%)<input type="number" id="iTaux" step="0.1" value="7" oninput="App.calcInvest()"></label>
            <label>Durée (ans)<input type="number" id="iDuree" value="20" oninput="App.calcInvest()"></label>
          </div>
          <div id="investResult" class="audit-box" style="margin-top:14px"></div>
        </div>
        <div class="card">
          <h3>Projection capital — avec vs sans intérêts</h3><br>
          <canvas id="investChart"></canvas>
        </div>
      </div>
    </div>

    <!-- SCÉNARIOS -->
    <div id="sim-scenarios" class="sim-panel hidden">
      <div class="grid three">
        ${[
          ['Pessimiste',  'kpi-red',    {rev:-0.10, dep:+0.15, credits:0, epa:-0.50}],
          ['Base',        'kpi-blue',   {rev:0,     dep:0,     credits:0, epa:0}],
          ['Optimiste',   'kpi-green',  {rev:+0.15, dep:-0.05, credits:0, epa:+0.30}]
        ].map(([label,cls,adj])=>{
          const rev  = Math.round(s.revenus * (1+adj.rev));
          const dep  = Math.round(s.depenses * (1+adj.dep));
          const cred = s.credits;
          const epa  = Math.round(s.epargne * (1+adj.epa));
          const cf   = rev - dep - cred - epa;
          return `<div class="card">
            <div class="card kpi ${cls}" style="margin:-18px -18px 14px;border-radius:18px 18px 0 0">
              <small>Scénario</small><strong style="font-size:20px">${label}</strong>
            </div>
            <div class="sim-scenario-rows">
              <div class="sim-sc-row"><span class="muted">Revenus</span><strong class="positive">${A.fmt(rev)}</strong></div>
              <div class="sim-sc-row"><span class="muted">Dépenses</span><strong class="negative">${A.fmt(dep)}</strong></div>
              <div class="sim-sc-row"><span class="muted">Crédits</span><strong>${A.fmt(cred)}</strong></div>
              <div class="sim-sc-row"><span class="muted">Épargne</span><strong>${A.fmt(epa)}</strong></div>
              <div class="sim-sc-row sim-sc-total"><span>Cashflow</span><strong class="${cf>=0?'positive':'negative'}">${A.fmt(cf)}</strong></div>
              <div class="sim-sc-row"><span class="muted">Épargne / an</span><span>${A.fmt(epa*12)}</span></div>
              <div class="sim-sc-row"><span class="muted">Patrimoine +5 ans</span><span>${A.fmt(A.patrimoineNet().net+cf*60)}</span></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <br>
      <div class="card">
        <h3>Comparatif cashflow annualisé</h3><br>
        <canvas id="scenarioChart" style="max-height:220px"></canvas>
      </div>
    </div>`;

    A.calcSim();
    A.calcCredit();
    A.calcInvest();
    A.renderScenarioChart();
  };

  A.showSimTab = (id, btn) => {
    document.querySelectorAll('.sim-panel').forEach(p=>p.classList.add('hidden'));
    document.querySelectorAll('.sim-tab').forEach(b=>b.classList.remove('active'));
    document.getElementById('sim-'+id).classList.remove('hidden');
    btn.classList.add('active');
  };

  A.calcSim = () => {
    const r=Number(document.getElementById('simRev')?.value||0);
    const d=Number(document.getElementById('simDep')?.value||0);
    const c=Number(document.getElementById('simCred')?.value||0);
    const e=Number(document.getElementById('simEpa')?.value||0);
    const cf=r-d-c-e;
    const el=document.getElementById('simResult');
    if(!el)return;
    el.innerHTML=`<strong class="${cf>=0?'positive':'negative'}">Cashflow : ${A.fmt(cf)}/mois</strong><br>
      <small>Épargne annualisée : ${A.fmt(e*12)} · Charges totales : ${A.fmt((d+c+e)*12)}/an · Taux d'effort : ${r>0?Math.round(((d+c)/r)*100):0}%</small>`;
    A.destroyChart('simChart');
    const ms=A.months(A.currentMonth,60);
    const p=A.patrimoineNet();
    A.makeChart('simChart','line',{labels:ms.filter((_,i)=>i%3===0).map(m=>m.slice(0,7)),datasets:[{label:'Patrimoine net projeté',data:ms.filter((_,i)=>i%3===0).map((_,i)=>p.net+i*3*cf),fill:true,backgroundColor:'rgba(36,87,255,.07)',borderColor:'#2457ff',tension:0.3,pointRadius:0}]},{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>A.fmt(ctx.raw)}}},scales:{y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}},x:{grid:{display:false}}}});
  };

  A.calcCredit = () => {
    const montant=Number(document.getElementById('cMontant')?.value||0);
    const duree=Number(document.getElementById('cDuree')?.value||1);
    const taux=Number(document.getElementById('cTaux')?.value||0)/100/12;
    const assur=Number(document.getElementById('cAssur')?.value||0)/100/12;
    let mens=0,totalInterets=0,totalAssur=0;
    if(taux>0){mens=montant*(taux*(1+taux)**duree)/((1+taux)**duree-1);}else{mens=montant/duree;}
    totalInterets=Math.round(mens*duree-montant);
    totalAssur=Math.round(montant*assur*duree);
    const mensAvecAssur=Math.round(mens+montant*assur);
    const coutTotal=Math.round(mens*duree)+totalAssur;
    const el=document.getElementById('creditResult');
    if(!el)return;
    el.innerHTML=`<strong>Mensualité : ${A.fmt(Math.round(mens))} + ${A.fmt(Math.round(montant*assur))} assurance = ${A.fmt(mensAvecAssur)}</strong><br>
      <small>Intérêts totaux : ${A.fmt(totalInterets)} · Assurance totale : ${A.fmt(totalAssur)} · Coût total du crédit : ${A.fmt(coutTotal)}</small>`;
    // Chart amortissement
    A.destroyChart('creditSimChart');
    const step=Math.max(1,Math.round(duree/24));
    const labels=[],capData=[],intData=[];
    let cap=montant;
    for(let i=0;i<duree;i+=step){
      const interets=taux>0?cap*taux:0;
      const principal=Math.min(mens-interets,cap);
      cap=Math.max(0,cap-principal);
      labels.push('M'+(i+1));
      capData.push(Math.round(cap));
      intData.push(Math.round(interets*step));
    }
    A.makeChart('creditSimChart','bar',{labels,datasets:[
      {label:'Capital restant',data:capData,backgroundColor:'rgba(36,87,255,.62)',borderColor:'#2457ff',borderWidth:1,stack:'a',borderRadius:2},
      {label:'Intérêts période',data:intData,backgroundColor:'rgba(199,54,54,.55)',borderColor:'#c73636',borderWidth:1,stack:'b',borderRadius:2}
    ]},{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}}}});
  };

  A.calcInvest = () => {
    const capital=Number(document.getElementById('iCapital')?.value||0);
    const vers=Number(document.getElementById('iVers')?.value||0);
    const taux=Number(document.getElementById('iTaux')?.value||0)/100/12;
    const dureeAns=Number(document.getElementById('iDuree')?.value||1);
    const n=dureeAns*12;
    let valComp=capital;
    const compData=[capital];
    const linaData=[capital];
    const labels=[`Départ`];
    for(let i=1;i<=n;i++){
      valComp=valComp*(1+taux)+vers;
      if(i%12===0){compData.push(Math.round(valComp));linaData.push(Math.round(capital+vers*i));labels.push(`An ${i/12}`);}
    }
    const totalVerse=capital+vers*n;
    const interetsGeneres=Math.round(valComp-totalVerse);
    const el=document.getElementById('investResult');
    if(!el)return;
    el.innerHTML=`<strong class="positive">Capital final avec intérêts : ${A.fmt(Math.round(valComp))}</strong><br>
      <small>Total versé : ${A.fmt(Math.round(totalVerse))} · Intérêts générés : <strong class="positive">${A.fmt(interetsGeneres)}</strong> (×${(valComp/totalVerse).toFixed(2)})</small>`;
    A.destroyChart('investChart');
    A.makeChart('investChart','line',{labels,datasets:[
      {label:'Avec intérêts composés',data:compData,borderColor:'#138a5b',backgroundColor:'rgba(19,138,91,.1)',fill:true,tension:0.3,pointRadius:0},
      {label:'Sans intérêts (linéaire)',data:linaData,borderColor:'#94a3b8',borderDash:[5,5],fill:false,tension:0,pointRadius:0}
    ]},{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},scales:{y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}},x:{grid:{display:false}}}});
  };

  A.renderScenarioChart = () => {
    const s=A.monthSummary(A.currentMonth);
    const scenarios=[
      {label:'Pessimiste',rev:s.revenus*0.9,dep:s.depenses*1.15,cred:s.credits,epa:s.epargne*0.5,color:'#c73636'},
      {label:'Base',      rev:s.revenus,    dep:s.depenses,     cred:s.credits,epa:s.epargne,    color:'#2457ff'},
      {label:'Optimiste', rev:s.revenus*1.15,dep:s.depenses*0.95,cred:s.credits,epa:s.epargne*1.3,color:'#138a5b'}
    ];
    const ms=A.months(A.currentMonth,60).filter((_,i)=>i%6===0);
    A.makeChart('scenarioChart','line',{
      labels:ms.map(m=>m.slice(0,7)),
      datasets:scenarios.map(sc=>{
        const cf=sc.rev-sc.dep-sc.cred-sc.epa;
        const p=A.patrimoineNet();
        return{label:sc.label,data:ms.map((_,i)=>p.net+i*6*cf),borderColor:sc.color,backgroundColor:sc.color+'18',fill:false,tension:0.3,pointRadius:0};
      })
    },{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${A.fmt(ctx.raw)}`}}},scales:{y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}},x:{grid:{display:false}}}});
  };
})();
