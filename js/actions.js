(function(){
  const A = window.App;

  /* ─── ACTIONS PRIORITAIRES ─── */
  A.renderActions = () => {
    const open = A.state.actions.filter(a=>!a.archive);
    const byStatus = {
      'haute':    open.filter(a=>a.priorite==='haute'&&a.statut!=='terminé'),
      'moyenne':  open.filter(a=>a.priorite==='moyenne'&&a.statut!=='terminé'),
      'terminé':  open.filter(a=>a.statut==='terminé')
    };
    document.getElementById('app').innerHTML = `
    <div class="toolbar">
      <button onclick="App.editAction()">+ Ajouter action</button>
      <span class="spacer"></span>
      <span class="muted" style="font-size:13px">${open.filter(a=>a.statut==='terminé').length} / ${open.length} terminées</span>
    </div>
    <div class="action-kanban">
      ${[['haute','Haute priorité','red'],['moyenne','Moyenne','amber'],['terminé','Terminées','green']].map(([key,label,color])=>`
        <div class="kanban-col">
          <div class="kanban-header ${color}">
            <span>${label}</span><span class="kanban-count">${byStatus[key].length}</span>
          </div>
          ${byStatus[key].map(a=>`
            <div class="kanban-card">
              <div class="kanban-title"><strong>${a.titre}</strong></div>
              <div class="kanban-meta">
                <span class="badge ${a.priorite==='haute'?'red':a.priorite==='moyenne'?'amber':'green'}">${a.priorite}</span>
                <span class="badge">${a.categorie}</span>
              </div>
              ${a.echeance?`<div class="kanban-date muted">📅 ${a.echeance}</div>`:''}
              ${a.note?`<div class="kanban-note muted">${a.note}</div>`:''}
              <div class="kanban-actions">
                ${a.statut!=='terminé'?`<button class="success" onclick="App.doneAction('${a.id}')">✓ Terminé</button>`:''}
                <button class="ghost" onclick="App.editAction('${a.id}')">Éditer</button>
                <button class="danger" onclick="App.archiveAction('${a.id}')">Archiver</button>
              </div>
            </div>`).join('') || `<div class="kanban-empty muted">Aucune</div>`}
        </div>`).join('')}
    </div>`;
  };

  A.editAction = id => {
    const a = A.state.actions.find(x=>x.id===id)||{id:A.uid('act'),titre:'',categorie:'',priorite:'moyenne',echeance:new Date().toISOString().slice(0,10),statut:'à faire',onglet:'Dashboard',note:'',archive:false};
    A.openModal('Action prioritaire',`
      <div class="form-grid">
        <label>Titre<input id="atitre" value="${a.titre}"></label>
        <label>Catégorie<input id="acat" value="${a.categorie}"></label>
        <label>Priorité<select id="aprio">${['basse','moyenne','haute'].map(x=>`<option ${a.priorite===x?'selected':''}>${x}</option>`)}</select></label>
        <label>Échéance<input type="date" id="aeche" value="${a.echeance}"></label>
        <label>Statut<select id="astat">${['à faire','en cours','terminé','retard'].map(x=>`<option ${a.statut===x?'selected':''}>${x}</option>`)}</select></label>
        <label>Onglet lié<input id="aong" value="${a.onglet}"></label>
        <label class="full">Note<textarea id="anote">${a.note||''}</textarea></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveAction('${a.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteAction('${a.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveAction = id => {
    const a={id,titre:atitre.value,categorie:acat.value,priorite:aprio.value,echeance:aeche.value,statut:astat.value,onglet:aong.value,note:anote.value,archive:false};
    const i=A.state.actions.findIndex(x=>x.id===id);
    if(i>=0)A.state.actions[i]=a;else A.state.actions.push(a);
    A.save();A.closeModal();A.render();
  };
  A.doneAction    = id => { const a=A.state.actions.find(x=>x.id===id);a.statut='terminé';A.save();A.renderActions(); };
  A.archiveAction = id => { const a=A.state.actions.find(x=>x.id===id);a.archive=true;A.save();A.renderActions(); };
  A.deleteAction  = id => { A.state.actions=A.state.actions.filter(x=>x.id!==id);A.save();A.closeModal();A.render(); };

  /* ─── PLAN 5 ANS ─── */
  A.renderPlan = () => {
    const jalons = A.state.plan.sort((a,b)=>a.date.localeCompare(b.date));
    const avgProg = jalons.length ? Math.round(jalons.reduce((a,b)=>a+Number(b.progression),0)/jalons.length) : 0;

    // Projection cashflow 60 mois annotée
    const ms60 = A.months(A.currentMonth, 60);
    const summary = A.monthSummary(A.currentMonth);

    // Événements financiers des jalons (fin prêt conso → cashflow change)
    const IMPACTS = {
      'Fin prêt conso':    {from:'2026-08', delta:+798,  color:'#138a5b'},
      'Loyer Sénégal':     {from:'2026-11', delta:+610,  color:'#2457ff'},
      'PEA 500 €/mois':   {from:'2026-08', delta:-500,  color:'#7555d9'},
    };

    // Cashflow projeté avec impacts jalons
    let cumulativeDelta = 0;
    const cashProj = ms60.map(m => {
      Object.values(IMPACTS).forEach(imp => { if(m===imp.from) cumulativeDelta+=imp.delta; });
      return A.monthSummary(m).cashflow + cumulativeDelta;
    });

    // Répartition par statut
    const byStatut = {};
    jalons.forEach(j=>{ byStatut[j.statut]=(byStatut[j.statut]||0)+1; });

    document.getElementById('app').innerHTML = `
    <!-- KPIs -->
    <div class="grid cards">
      <div class="card kpi kpi-blue">
        <small>Jalons au total</small><strong>${jalons.length}</strong>
        <em>${jalons.filter(j=>j.statut==='terminé').length} terminés</em>
      </div>
      <div class="card kpi kpi-green">
        <small>Progression globale</small><strong>${avgProg}%</strong>
        <em>moyenne des jalons</em>
      </div>
      <div class="card kpi kpi-amber">
        <small>Prochain jalon</small>
        <strong style="font-size:16px">${jalons.filter(j=>j.statut!=='terminé')[0]?.titre||'—'}</strong>
        <em>${jalons.filter(j=>j.statut!=='terminé')[0]?.date||''}</em>
      </div>
      <div class="card kpi kpi-red">
        <small>En retard</small><strong>${jalons.filter(j=>j.statut==='retard').length}</strong>
        <em>jalons à débloquer</em>
      </div>
    </div>
    <br>

    <!-- Timeline visuelle -->
    <div class="card" style="margin-bottom:18px">
      <div class="section-title">
        <h3>Roadmap 5 ans</h3>
        <button onclick="App.editMilestone()">+ Ajouter jalon</button>
      </div>
      <div class="plan-timeline">
        ${jalons.map(j=>{
          const s = j.statut;
          const cls = s==='terminé'?'done':s==='en cours'?'active':s==='retard'?'late':'todo';
          const color = s==='terminé'?'#138a5b':s==='en cours'?'#2457ff':s==='retard'?'#c73636':'#94a3b8';
          const priorityColor = j.priorite==='haute'?'red':j.priorite==='moyenne'?'amber':'green';
          return `<div class="plan-tl-item ${cls}">
            <div class="plan-tl-dot" style="background:${color}"></div>
            <div class="plan-tl-card">
              <div class="plan-tl-header">
                <div>
                  <strong>${j.titre}</strong>
                  <div class="plan-tl-meta">
                    <span class="badge ${priorityColor}">${j.priorite}</span>
                    <span class="badge">${j.categorie}</span>
                    <span class="muted">${j.date}</span>
                  </div>
                </div>
                <button class="ghost icon-btn" onclick="App.editMilestone('${j.id}')">Éditer</button>
              </div>
              ${j.description?`<p class="plan-tl-desc muted">${j.description}</p>`:''}
              <div class="plan-prog-wrap">
                <div class="plan-prog-bar"><div class="plan-prog-fill" style="width:${j.progression}%;background:${color}"></div></div>
                <span class="plan-prog-label">${j.progression}%</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Projection cashflow + impacts jalons -->
    <div class="grid two">
      <div class="card">
        <h3>Projection cashflow 5 ans — avec impacts jalons</h3><br>
        <div style="position:relative;height:260px;min-width:0"><canvas id="planCashChart"></canvas></div>
        <div class="plan-impact-legend">
          ${Object.entries(IMPACTS).map(([nom,imp])=>`
            <div class="plan-impact-chip" style="border-color:${imp.color}">
              <span style="color:${imp.color};font-weight:900">${imp.delta>0?'+':''}${A.fmt(imp.delta)}/mois</span>
              <span>${nom}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Progression par statut</h3><br>
        <div style="position:relative;height:180px;min-width:0"><canvas id="planStatChart"></canvas></div>
        <br>
        <h3>Notes libres</h3><br>
        <textarea style="width:100%;min-height:100px;border:1px solid var(--line);border-radius:10px;padding:10px"
          onchange="App.state.planNotes=this.value;App.save()"
          placeholder="Notes stratégiques...">${A.state.planNotes||''}</textarea>
      </div>
    </div>`;

    // Cashflow projeté
    const PALETTE_CASHFLOW = cashProj.map(v=>v>=0?'rgba(19,138,91,.72)':'rgba(199,54,54,.72)');
    A.makeChart('planCashChart','bar',{
      labels: ms60.filter((_,i)=>i%3===0).map(m=>m.slice(0,7)),
      datasets:[{
        label:'Cashflow projeté',
        data: cashProj.filter((_,i)=>i%3===0),
        backgroundColor: PALETTE_CASHFLOW.filter((_,i)=>i%3===0),
        borderRadius:4,borderWidth:0
      }]
    },{
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>A.fmt(ctx.raw)}}},
      scales:{x:{grid:{display:false}},y:{ticks:{callback:v=>A.fmt(v)},grid:{color:'#eef2f7'}}}
    });

    const statLabels = Object.keys(byStatut);
    A.makeChart('planStatChart','doughnut',{
      labels:statLabels,
      datasets:[{data:statLabels.map(k=>byStatut[k]),backgroundColor:['#138a5b','#2457ff','#c73636','#94a3b8'],borderWidth:2,borderColor:'#fff'}]
    },{plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw}`}}},cutout:'55%'});
  };

  A.editMilestone = id => {
    const j = A.state.plan.find(x=>x.id===id)||{id:A.uid('jalon'),titre:'',date:new Date().toISOString().slice(0,10),statut:'à faire',categorie:'',priorite:'moyenne',description:'',progression:0};
    A.openModal('Jalon — Plan 5 ans',`
      <div class="form-grid">
        <label>Titre<input id="jtitre" value="${j.titre}"></label>
        <label>Date cible<input type="date" id="jdate" value="${j.date}"></label>
        <label>Statut<select id="jstat">${['à faire','en cours','terminé','retard'].map(x=>`<option ${j.statut===x?'selected':''}>${x}</option>`)}</select></label>
        <label>Catégorie<input id="jcat" value="${j.categorie}"></label>
        <label>Priorité<select id="jprio">${['basse','moyenne','haute'].map(x=>`<option ${j.priorite===x?'selected':''}>${x}</option>`)}</select></label>
        <label>Progression (%)<input type="number" id="jprog" value="${j.progression}" min="0" max="100"></label>
        <label class="full">Description<textarea id="jdesc">${j.description||''}</textarea></label>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="App.saveMilestone('${j.id}')">Enregistrer</button>
        <button class="danger" onclick="App.deleteMilestone('${j.id}')">Supprimer</button>
      </div>`
    );
  };
  A.saveMilestone = id => {
    const j={id,titre:jtitre.value,date:jdate.value,statut:jstat.value,categorie:jcat.value,priorite:jprio.value,description:jdesc.value,actions:'',progression:Number(jprog.value)};
    const i=A.state.plan.findIndex(x=>x.id===id);
    if(i>=0)A.state.plan[i]=j;else A.state.plan.push(j);
    A.save();A.closeModal();A.render();
  };
  A.deleteMilestone = id => { A.state.plan=A.state.plan.filter(x=>x.id!==id);A.save();A.closeModal();A.render(); };
})();
