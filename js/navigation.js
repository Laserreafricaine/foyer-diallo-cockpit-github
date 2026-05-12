(function(){
  const A=window.App;
  A.openModal=(t,b)=>{document.getElementById('modalTitle').innerHTML=t;document.getElementById('modalBody').innerHTML=b;document.getElementById('modal').classList.remove('hidden')};
  A.closeModal=()=>document.getElementById('modal').classList.add('hidden');
  A.goto=r=>{A.route=r;A.render()};
  A.shiftMonth=d=>{A.currentMonth=A.addMonths(A.currentMonth,d);A.render()};
  A.navGroups=[
    {title:'Pilotage',tone:'blue',items:[['dashboard','Dashboard','▦'],['actions','Actions prioritaires','✓']]},
    {title:'Trésorerie',tone:'green',items:[['suivi','Suivi mensuel','◷'],['revenus','Revenus','↗'],['depenses','Dépenses','↘'],['mouvements','Mouvements','⇄']]},
    {title:'Patrimoine',tone:'purple',items:[['patrimoine','Patrimoine global','◇'],['epargne','Épargne','◉']]},
    {title:'Engagements',tone:'amber',items:[['credits','Crédits','▣']]},
    {title:'Stratégie',tone:'blue',items:[['plan','Plan 5 ans','◎'],['simulateurs','Simulateurs','∑']]},
    {title:'Entreprises & projets',tone:'green',items:[['serre','La Serre Africaine','✦']]},
    {title:'Configuration',tone:'purple',items:[['parametres','Paramètres','⚙']]}
  ];
  A.renderNav=()=>{
    const nav=document.getElementById('nav');
    nav.innerHTML=A.navGroups.map(g=>`<div class="nav-group nav-${g.tone}"><div class="nav-group-title"><span></span>${g.title}</div>${g.items.map(([id,lab,ico])=>`<button class="nav-btn ${A.route===id?'active':''}" onclick="App.goto('${id}')"><span class="nav-ico">${ico}</span><span>${lab}</span></button>`).join('')}</div>`).join('');
  };
  A.getRouteName=()=>{
    const flat=A.navGroups.flatMap(g=>g.items.map(([id,lab])=>[id,lab]));
    return Object.fromEntries(flat)[A.route]||'Dashboard';
  };
  A.render=()=>{
    // Détruire toutes les instances Chart.js actives avant de changer de page
    // (évite le flash blanc causé par les boucles rAF sur des canvas détachés du DOM)
    Object.keys(A.charts||{}).forEach(id=>A.destroyChart(id));
    A.renderNav();
    document.getElementById('currentMonthLabel').textContent=A.monthLabel(A.currentMonth);
    document.getElementById('pageTitle').textContent=A.getRouteName();
    document.getElementById('pageSubtitle').textContent=A.route==='suivi'?'Source de vérité financière du foyer':A.route==='dashboard'?'Vue exécutive consolidée du foyer':A.route==='parametres'?'Configuration client, membres et sauvegardes':'Données sauvegardées automatiquement';
    ({dashboard:A.renderDashboard,suivi:A.renderSuivi,mouvements:A.renderMouvements,patrimoine:A.renderPatrimoine,epargne:A.renderEpargne,revenus:()=>A.renderAnalyse('revenu'),depenses:()=>A.renderAnalyse('dépense'),credits:A.renderCredits,plan:A.renderPlan,simulateurs:A.renderSimulateurs,actions:A.renderActions,serre:A.renderSerre,parametres:A.renderParametres}[A.route]||A.renderDashboard)();
  };
  document.addEventListener('DOMContentLoaded',()=>{A.load();A.render()});
})();
