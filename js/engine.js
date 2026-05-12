(function(){const A=window.App;
A.accountLineId=(account)=>({
  'epargne-salma':'epa-salma',
  'epargne-awa':'epa-awa',
  'epargne-salif':'epa-salif',
  'pea-compte':'pea'
}[account.id]||('epa-'+account.id));
A.upsertEpargneLineFromAccount=(account,force=false)=>{
  if(!account||!account.id)return null;
  const id=A.accountLineId(account);
  let line=A.state.lines.find(l=>l.id===id)||A.state.lines.find(l=>l.accountId===account.id)||null;
  const amount=Number(account.versementAuto||0);
  const base={id,type:'épargne',nom:account.nom,categorie:account.typeCompte||'Épargne',proprietaire:account.proprietaire||'Foyer',defaultAmount:amount,schedules:[{from:A.currentMonth||'2026-05',amount}],overrides:{},actif:true,dateDebut:A.currentMonth||'2026-05',dateFin:'',notes:account.notes||'',accountId:account.id};
  if(!line){A.state.lines.push(base);return base;}
  line.accountId=account.id;
  line.type='épargne';
  line.nom=account.nom;
  line.categorie=account.typeCompte||line.categorie||'Épargne';
  line.proprietaire=account.proprietaire||line.proprietaire||'Foyer';
  line.notes=account.notes||line.notes||'';
  if(line.actif===undefined)line.actif=true;
  if(!line.overrides)line.overrides={};
  if(!line.dateDebut)line.dateDebut=A.currentMonth||'2026-05';
  if(force){
    line.defaultAmount=amount;
    line.schedules=[{from:A.currentMonth||'2026-05',amount}];
  }else if(!line.schedules||!line.schedules.length){
    line.defaultAmount=amount;
    line.schedules=[{from:A.currentMonth||'2026-05',amount}];
  }
  return line;
};
A.syncEpargneAccountsToLines=(force=false)=>{
  if(!A.state||!Array.isArray(A.state.accounts)||!Array.isArray(A.state.lines))return;
  A.state.accounts.forEach(c=>A.upsertEpargneLineFromAccount(c,force));
};
A.lineAmountPlanned=(line,month)=>{if(!line.actif)return 0;if(line.dateDebut&&month<line.dateDebut)return 0;if(line.dateFin&&month>line.dateFin)return 0;if(line.overrides&&line.overrides[month]!=null)return Number(line.overrides[month]);let s=[...(line.schedules||[])].sort((a,b)=>a.from.localeCompare(b.from));let v=line.defaultAmount||0;s.forEach(p=>{if(p.from<=month)v=Number(p.amount)});return v};
A.lineAmountReal=(line,month)=>{if(!line.actif)return 0;if(line.dateDebut&&month<line.dateDebut)return 0;if(line.dateFin&&month>line.dateFin)return 0;if(line.overridesReel&&line.overridesReel[month]!=null)return Number(line.overridesReel[month]);return A.lineAmountPlanned(line,month)};
A.lineAmount=(line,month,mode)=>{if(mode==='reel')return A.lineAmountReal(line,month);return A.lineAmountPlanned(line,month)};A.monthRows=(month,mode)=>A.state.lines.map(l=>({...l,amount:A.lineAmount(l,month,mode)}));A.monthSummary=(month,mode)=>{let rows=A.monthRows(month,mode),sum=t=>rows.filter(r=>r.type===t).reduce((a,b)=>a+b.amount,0);let revenus=sum('revenu'),depenses=sum('dépense'),credits=sum('crédit'),epargne=sum('épargne');let mouvements=A.state.mouvements.filter(m=>m.mois===month);mouvements.forEach(m=>{if(m.impact==='manuel'){if(m.type==='revenu')revenus+=Number(m.montant);if(m.type==='dépense')depenses+=Number(m.montant);if(m.type==='crédit')credits+=Number(m.montant);if(m.type==='épargne')epargne+=Number(m.montant)}});return{revenus,depenses,credits,epargne,cashflow:revenus-depenses-credits-epargne}};A.months=(start,n)=>Array.from({length:n},(_,i)=>A.addMonths(start,i));A.patrimoineNet=()=>{let liquid=A.state.accounts.reduce((a,c)=>a+Number(c.soldeReel||c.soldeDepart||0),0);let brut=A.state.patrimoine.reduce((a,p)=>a+Number(p.valeur||0),0)+liquid;let dettes=A.state.patrimoine.reduce((a,p)=>a+Number(p.dette||0),0);return{brut,dettes,liquid,net:brut-dettes}};A.alerts=()=>{let out=[];let cm=A.currentMonth;if(cm<='2026-07')out.push({level:'red',txt:'Fin du prêt conso en juillet 2026 : 798 €/mois à réallouer.'});if(cm<='2026-11')out.push({level:'amber',txt:'Loyer Sénégal attendu dès novembre 2026 : +610 €/mois.'});let pee=A.state.accounts.find(x=>x.id==='pee');if(pee&&pee.soldeReel>40000)out.push({level:'amber',txt:'PEE très concentré : vérifier arbitrage et diversification.'});if(pee&&pee.dateMaj<'2026-04-01')out.push({level:'red',txt:'Mise à jour PEE à faire.'});out.push({level:'amber',txt:'Mettre à jour le patrimoine immobilier au moins une fois par trimestre.'});return out};A.destroyChart=id=>{if(A.charts[id]){A.charts[id].destroy();delete A.charts[id];}};A.makeChart=(id,type,data,options={})=>{A.destroyChart(id);let el=document.getElementById(id);if(!el)return;A.charts[id]=new Chart(el,{type,data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},...options}})};A.csv=(rows,name)=>{let text=rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\n');let blob=new Blob([text],{type:'text/csv'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();};})();
