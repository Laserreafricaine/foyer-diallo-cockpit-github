window.App = window.App || {};
(function(){
  const A=window.App;
  A.clone=o=>JSON.parse(JSON.stringify(o));
  A.fmt=n=>(Number(n)||0).toLocaleString('fr-FR',{style:'currency',currency:((A.state&&A.state.settings&&A.state.settings.currency)||'EUR'),maximumFractionDigits:0});
  A.monthLabel=m=>new Date(m+'-01T00:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  A.addMonths=(m,d)=>{const [y,mo]=String(m).split('-').map(Number);const x=new Date(y,(mo||1)-1+d,1);const yy=x.getFullYear();const mm=String(x.getMonth()+1).padStart(2,'0');return `${yy}-${mm}`};
  A.uid=p=>p+'-'+Math.random().toString(36).slice(2,9);
  A.currentMonth='2026-05'; A.route='dashboard'; A.charts={};

  A.baseSettings={
    householdName:'Foyer Diallo',
    brandInitials:'FD',
    subtitle:'Pilotage financier',
    currency:'EUR',
    country:'France',
    mainGoal:'Liberté financière familiale',
    horizonYears:5,
    startMonth:'2026-05',
    members:[
      {id:'foyer',nom:'Foyer',role:'Foyer',actif:true},
      {id:'mandiaye',nom:'Mandiaye',role:'Adulte',actif:true},
      {id:'julie',nom:'Julie',role:'Adulte',actif:true},
      {id:'enfants',nom:'Enfants',role:'Enfants',actif:true},
      {id:'senegal',nom:'Sénégal',role:'Patrimoine',actif:true}
    ],
    categories:{
      revenu:['Salaire','Variable','Allocation','Passif','Annexe'],
      dépense:['Vie courante','Charges','Enfants','Mobilité','Santé','Variable'],
      crédit:['Immobilier','Consommation','Auto','Travaux'],
      épargne:['Livret A','PEL','PEA','PEE','Enfant','Investissement','Immobilier']
    },
    assumptions:{inflation:2,rendementETF:5,tauxImmo:3.5,croissanceRevenus:1},
    mode:'personnel'
  };
  A.defaults={
    lines:[
      ['salaire-mandiaye','revenu','Salaire Mandiaye','Salaire','Mandiaye',4137],['variables-mandiaye','revenu','Variables Mandiaye','Variable','Mandiaye',690],['revenus-julie','revenu','Revenus Julie','Salaire','Julie',910],['caf','revenu','CAF','Allocation','Foyer',496],['cpam','revenu','CPAM','Allocation','Foyer',160],['revenus-annexes','revenu','Revenus annexes','Annexe','Foyer',120],['loyer-senegal','revenu','Loyer Sénégal','Passif','Sénégal',0,[{from:'2026-05',amount:0},{from:'2026-11',amount:610}]],['loyer-france','revenu','Loyer France','Passif','Foyer',0],
      ['alimentation','dépense','Alimentation','Vie courante','Foyer',900],['energie-eau','dépense','Énergie + eau','Charges','Foyer',382],['assurances','dépense','Assurances','Charges','Foyer',160],['telephone-internet','dépense','Téléphone / internet','Charges','Foyer',90],['ecole-enfants','dépense','École / enfants','Enfants','Enfants',300],['transport','dépense','Transport','Mobilité','Foyer',150],['sante','dépense','Santé','Santé','Foyer',80],['depenses-non-planifiees','dépense','Dépenses non planifiées','Variable','Foyer',0],
      ['credit-lissage-immo','crédit','Lissage immo','Immobilier','Foyer',1031,null,'2026-05','2045-12'],['credit-conso','crédit','Prêt conso','Consommation','Foyer',798,[{from:'2026-05',amount:798},{from:'2026-08',amount:0}],'2026-05','2026-07'],['credit-vehicule','crédit','Véhicule','Auto','Foyer',196,null,'2026-05','2031-12'],['eco-pret','crédit','Éco-prêt 0 %','Travaux','Foyer',36],
      ['epa-salma','épargne','Épargne Salma','Enfant','Enfants',50],['epa-awa','épargne','Épargne Awa','Enfant','Enfants',30],['epa-salif','épargne','Épargne Salif','Enfant','Enfants',30],['pea','épargne','PEA','Investissement','Foyer',0,[{from:'2026-05',amount:0},{from:'2026-08',amount:500}]]
    ].map(x=>({id:x[0],type:x[1],nom:x[2],categorie:x[3],proprietaire:x[4],defaultAmount:x[5],schedules:x[6]||[{from:'2026-05',amount:x[5]}],overrides:{},actif:true,dateDebut:x[7]||'2026-05',dateFin:x[8]||'',notes:''})),
    accounts:[
      ['livret-a-mandiaye','Livret A Mandiaye','Mandiaye','Livret A',2000,0,''],['livret-a-julie','Livret A Julie','Julie','Livret A',2800,0,''],['pel-julie','PEL Julie','Julie','PEL',5625,0,'2,5 %, fin 2029'],['epargne-salma','Épargne Salma','Enfants','Enfant',3744,50,''],['epargne-awa','Épargne Awa','Enfants','Enfant',1732,30,''],['epargne-salif','Épargne Salif','Enfants','Enfant',2725,30,''],['pea-compte','PEA','Foyer','PEA',0,0,'500 €/mois dès août 2026'],['pee','PEE','Mandiaye','PEE',47332,0,'Mise à jour trimestrielle'],['locatif','Investissement locatif','Foyer','Immobilier',0,0,'']
    ].map(x=>({id:x[0],nom:x[1],proprietaire:x[2],typeCompte:x[3],soldeDepart:x[4],versementAuto:x[5],soldeReel:x[4],dateMaj:'2026-05-01',objectif:0,notes:x[6],historique:[{date:'2026-05-01',valeur:x[4]}]})),
    patrimoine:[
      ['rp','Résidence principale Eulmont','immobilier',370000,194226,'Foyer'],['maison-sn','Maison Sénégal','immobilier',150000,0,'Sénégal'],['terrains-sn','2 terrains Sénégal','terrain',10670,0,'Sénégal'],['pee-pat','PEE Demathieu Bard','PEE',47332,0,'Mandiaye']
    ].map(x=>({id:x[0],nom:x[1],type:x[2],valeur:x[3],dette:x[4],proprietaire:x[5],dateMaj:'2026-05-01',notes:'',historique:[{date:'2026-05-01',valeur:x[3]}]})),
    credits:[['immo','Lissage immo',1031,194226,2.1,'2026-05','2045-12','Immobilier','Résidence principale'],['conso','Prêt conso',798,2394,4.2,'2024-01','2026-07','Consommation',''],['vehicule','Véhicule',196,11760,3.5,'2026-05','2031-12','Auto','Véhicule'],['eco','Éco-prêt 0 %',36,3600,0,'2026-05','2034-12','Travaux','Résidence principale']].map(x=>({id:x[0],nom:x[1],mensualite:x[2],capital:x[3],taux:x[4],dateDebut:x[5],dateFin:x[6],type:x[7],actifLie:x[8],notes:''})),
    mouvements:[],
    actions:[['Mettre à jour la valeur PEE','Épargne','haute','2026-06-30','à faire','Épargne'],['Préparer fin prêt conso','Crédits','haute','2026-07-31','en cours','Crédits'],['Activer suivi loyer Sénégal','Revenus','moyenne','2026-11-01','à faire','Revenus']].map(x=>({id:A.uid('act'),titre:x[0],categorie:x[1],priorite:x[2],echeance:x[3],statut:x[4],onglet:x[5],note:'',archive:false})),
    plan:[['Fin prêt conso','2026-07-31','en cours','Crédits','haute','Libérer 798 €/mois',''],['Loyer Sénégal','2026-11-01','à faire','Revenus','haute','Démarrer revenu passif 610 €/mois',''],['PEA 500 €/mois','2026-08-01','à faire','Investissement','moyenne','Automatiser versement ETF','']].map(x=>({id:A.uid('jalon'),titre:x[0],date:x[1],statut:x[2],categorie:x[3],priorite:x[4],description:x[5],actions:x[6],progression:x[2]=='terminé'?100:30})),
    serre:{mouvements:[],stock:[],notes:'Module autonome de suivi recettes, dépenses et production.'},
    settings:A.clone(A.baseSettings)
  };
  A.templateDefaults=A.clone(A.defaults);
  A.templateDefaults.settings=Object.assign(A.clone(A.baseSettings),{householdName:'Mon foyer',brandInitials:'MF',subtitle:'Cockpit financier familial',country:'France',mainGoal:'Construire une vision claire du foyer',mode:'template',members:[{id:'foyer',nom:'Foyer',role:'Foyer',actif:true},{id:'adulte-1',nom:'Adulte 1',role:'Adulte',actif:true},{id:'adulte-2',nom:'Adulte 2',role:'Adulte',actif:true},{id:'enfants',nom:'Enfants',role:'Enfants',actif:true}]});
  A.templateDefaults.lines=[
    {id:'revenu-principal-1',type:'revenu',nom:'Revenu principal 1',categorie:'Salaire',proprietaire:'Adulte 1',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''},
    {id:'revenu-principal-2',type:'revenu',nom:'Revenu principal 2',categorie:'Salaire',proprietaire:'Adulte 2',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''},
    {id:'depense-logement',type:'dépense',nom:'Logement',categorie:'Charges',proprietaire:'Foyer',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''},
    {id:'depense-vie-courante',type:'dépense',nom:'Vie courante',categorie:'Vie courante',proprietaire:'Foyer',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''},
    {id:'credit-principal',type:'crédit',nom:'Crédit principal',categorie:'Immobilier',proprietaire:'Foyer',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''},
    {id:'epargne-securite',type:'épargne',nom:'Épargne de sécurité',categorie:'Livret A',proprietaire:'Foyer',defaultAmount:0,schedules:[{from:'2026-05',amount:0}],overrides:{},actif:true,dateDebut:'2026-05',dateFin:'',notes:''}
  ];
  A.templateDefaults.accounts=[];
  A.templateDefaults.patrimoine=[];
  A.templateDefaults.credits=[];
  A.templateDefaults.mouvements=[];
  A.templateDefaults.actions=[];
  A.templateDefaults.plan=[];
  A.demoDefaults=A.clone(A.templateDefaults);
  A.demoDefaults.settings=Object.assign(A.clone(A.templateDefaults.settings),{householdName:'Foyer Démo',brandInitials:'FD',mainGoal:'Exemple complet de pilotage familial',mode:'demo'});
  A.demoDefaults.lines.forEach((l,i)=>{const vals=[4200,1800,1100,650,900,500];l.defaultAmount=vals[i]||0;l.schedules=[{from:'2026-05',amount:l.defaultAmount}];});
  A.demoDefaults.accounts=[{id:'livret-demo',nom:'Livret de sécurité',proprietaire:'Foyer',typeCompte:'Livret A',soldeDepart:7500,versementAuto:200,soldeReel:7500,dateMaj:'2026-05-01',objectif:15000,notes:'Exemple',historique:[{date:'2026-05-01',valeur:7500}]}];
  A.demoDefaults.patrimoine=[{id:'rp-demo',nom:'Résidence principale',type:'immobilier',valeur:280000,dette:180000,proprietaire:'Foyer',dateMaj:'2026-05-01',notes:'Exemple',historique:[{date:'2026-05-01',valeur:280000}]}];
})();
