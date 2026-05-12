(function(){
  const A = window.App;

  A.renderDashboard = () => {
    const s = A.monthSummary(A.currentMonth);
    const p = A.patrimoineNet();
    const ms = A.months(A.currentMonth, 12);
    const cashData = ms.map(m => A.monthSummary(m).cashflow);
    const taux = Math.round((s.epargne / (s.revenus || 1)) * 100);

    document.getElementById('app').innerHTML = `
      <div class="grid cards">
        <div class="card kpi kpi-green">
          <small>Revenus du mois</small>
          <strong>${A.fmt(s.revenus)}</strong>
          <em>${A.monthLabel(A.currentMonth)}</em>
        </div>
        <div class="card kpi kpi-red">
          <small>Dépenses</small>
          <strong>${A.fmt(s.depenses)}</strong>
          <em>hors crédits</em>
        </div>
        <div class="card kpi kpi-amber">
          <small>Crédits</small>
          <strong>${A.fmt(s.credits)}</strong>
          <em>mensualités</em>
        </div>
        <div class="card kpi kpi-purple">
          <small>Épargne / inv.</small>
          <strong>${A.fmt(s.epargne)}</strong>
          <em>taux : ${taux}%</em>
        </div>
        <div class="card kpi kpi-blue">
          <small>Cashflow final</small>
          <strong class="${s.cashflow>=0?'positive':'negative'}">${A.fmt(s.cashflow)}</strong>
          <em>après épargne</em>
        </div>
        <div class="card kpi kpi-green2">
          <small>Patrimoine net</small>
          <strong>${A.fmt(p.net)}</strong>
          <em>brut ${A.fmt(p.brut)}</em>
        </div>
      </div>
      <br>
      <div class="grid two">
        <div class="card">
          <div class="section-title">
            <h3>Cashflow 12 mois</h3>
            <button class="secondary" onclick="App.goto('suivi')">Modifier dans le suivi →</button>
          </div>
          <canvas id="cashflowChart"></canvas>
        </div>
        <div class="card">
          <h3>Alertes automatiques</h3><br>
          <div class="alert-list">${A.alerts().map(x=>`<div class="alert ${x.level||''}">${x.txt}</div>`).join('')}</div>
        </div>
      </div>
      <br>
      <div class="grid two">
        <div class="card">
          <h3>Répartition patrimoine</h3>
          <canvas id="patChart"></canvas>
        </div>
        <div class="card">
          <h3>Actions prioritaires urgentes</h3><br>
          <div class="action-list">
            ${A.state.actions.filter(a=>!a.archive&&a.statut!=='terminé').sort((a,b)=>a.echeance.localeCompare(b.echeance)).slice(0,3).map(a=>`
              <div class="alert">
                <strong>${a.titre}</strong>
                <br><small>${a.categorie} · ${a.echeance} · <span class="badge ${a.priorite==='haute'?'red':a.priorite==='moyenne'?'amber':'green'}">${a.priorite}</span></small>
              </div>`).join('')||'<p class="muted">Aucune action urgente.</p>'}
          </div>
          <br>
          <h3>Derniers mouvements</h3>
          <div class="table-wrap">
            <table><tbody>
              ${A.state.mouvements.slice(-5).reverse().map(m=>`
                <tr><td>${m.date}</td><td>${m.libelle}</td><td class="num">${A.fmt(m.montant)}</td></tr>`
              ).join('')||'<tr><td class="muted" colspan="3">Aucun mouvement enregistré.</td></tr>'}
            </tbody></table>
          </div>
        </div>
      </div>`;

    /* Cashflow chart avec couleurs positif/négatif */
    A.makeChart('cashflowChart', 'bar', {
      labels: ms.map(A.monthLabel),
      datasets: [{
        label: 'Cashflow',
        data: cashData,
        backgroundColor: cashData.map(v => v >= 0 ? 'rgba(19,138,91,.72)' : 'rgba(199,54,54,.72)'),
        borderColor: cashData.map(v => v >= 0 ? '#138a5b' : '#c73636'),
        borderWidth: 1.5,
        borderRadius: 6
      }]
    }, {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => A.fmt(ctx.raw) } }
      },
      scales: {
        y: { ticks: { callback: v => A.fmt(v) }, grid: { color: '#eef2f7' } },
        x: { grid: { display: false } }
      }
    });

    /* Patrimoine doughnut avec couleurs distinctes */
    const patLabels = A.state.patrimoine.map(x => x.nom).concat(['Épargne liquide']);
    const patData = A.state.patrimoine.map(x => x.valeur).concat([p.liquid]);
    A.makeChart('patChart', 'doughnut', {
      labels: patLabels,
      datasets: [{
        data: patData,
        backgroundColor: ['#2457ff','#138a5b','#c58a1e','#7555d9','#0e7490','#b45309'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }, {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${A.fmt(ctx.raw)}` } }
      }
    });
  };
})();
