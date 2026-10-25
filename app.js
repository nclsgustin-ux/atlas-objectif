const rates={common:1.1e-9,rare:1.6e-9,epic:2.2e-9,legendary:4.4e-9};
const odds={common:.5,rare:.3,epic:.15,legendary:.05};
const passportTiers=[[0,0],[1,5],[11,10],[31,15],[61,20],[101,25]];
const passportGoals=[1,11,31,61,101];
const regionTiers={france:[[70,20],[100,15],[135,10],[170,8],[200,7],[250,6],[300,5],[350,4],[400,3],[Infinity,2]]};
const $=id=>document.getElementById(id);
const state={parcelCost:100,badgeCost:200,usdEur:.92,seasonCost:9.2,clubCost:46,scenario:'habituel'};
const FREE_STREAK_30=110,FREE_ADS_30=600,SEASON_PASS_AB=1030,CLUB_STREAK_30=3545,CLUB_ADS_30=600;
const number=id=>{const n=Number($(id)?.value);return Number.isFinite(n)&&n>0?n:0};
const fmt=(value,d=2)=>{const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n):'—'};
const fmtInt=n=>Math.max(0,Math.floor(Number.isFinite(n)?n:0)).toLocaleString('fr-FR');
function badgePct(count){const n=Math.max(0,Math.floor(Number(count)||0));for(let i=passportTiers.length-1;i>=0;i--)if(n>=passportTiers[i][0])return passportTiers[i][1];return 0}
function parcelState(){return Object.fromEntries(Object.keys(rates).map(k=>[k,number(k)]))}
function totalParcels(p){return Object.values(p).reduce((sum,n)=>sum+(Number.isFinite(n)?n:0),0)}
function tier(total){const row=regionTiers.france.find(([max])=>total<=max)||regionTiers.france.at(-1);return {max:row[0],mult:row[1]}}
function boostedHours(){const usual=Math.min(24,number('boostHours'));return state.scenario==='prudent'?2:state.scenario==='optimise'?20:usual}
function expectedParcels(current,added){const p={...current};for(const key of Object.keys(rates))p[key]+=added*odds[key];return p}
function rawRent(p,badges,addLpu=false){let perSecond=0;for(const [key,count] of Object.entries(p))perSecond+=rates[key]*count;if(addLpu&&totalParcels(p)>0)perSecond+=rates.legendary-rates.common;return perSecond*86400*30*(1+badgePct(badges)/100)}
function monthly(p,badges,hours,{srb=true,lpu=false,tierMult}={}){const total=totalParcels(p),m=tierMult??tier(total||1).mult;const base=rawRent(p,badges,lpu)*state.usdEur;const boostTime=Math.min(24,Math.max(0,hours))*30;let value=base*(1+(m-1)*boostTime/720);if(srb){const eventHours=Math.min(720,number('srbHours')),overlap=Math.min(eventHours,boostTime);value+=base*((50-m)*overlap+(50-1)*Math.max(0,eventHours-overlap))/720}return {value,base,m}}
function parcelMixAt(p,count){const total=totalParcels(p);const mix=total?Object.fromEntries(Object.entries(p).map(([k,n])=>[k,n/total])):odds;return Object.fromEntries(Object.keys(rates).map(k=>[k,count*mix[k]]))}
function renderBoostTable(p,badges,hours,currentTotal){
 const host=$('boostTable');if(!host)return;
 
 const rows=regionTiers.france;let min=1;const out=[];
 rows.forEach(([max,mult],index)=>{
   const estimateCount=Number.isFinite(max)?max:min;const mixAtMax=parcelMixAt(p,estimateCount);const atMax=monthly(mixAtMax,badges,hours,{srb:false,tierMult:mult}).value;const srb=monthly(mixAtMax,badges,hours,{srb:true,tierMult:mult}).value;
   let breakeven='—';if(index>0&&Number.isFinite(max)){const previousMax=rows[index-1][0];const previousRent=monthly(parcelMixAt(p,previousMax),badges,hours,{tierMult:rows[index-1][1]}).value;const oneParcel=monthly(parcelMixAt(p,1),badges,hours,{tierMult:mult}).value;const needed=Math.ceil(previousRent/oneParcel);breakeven=needed<=max?`${fmtInt(Math.max(min,needed))} parcelles`:'Au-delà du palier'}
   const effectiveTotal=Math.max(1,currentTotal);const active=effectiveTotal>=min&&effectiveTotal<=max;
   out.push(`<tr class="${active?'active-tier':''}"><td>${fmtInt(min)}–${Number.isFinite(max)?fmtInt(max):'∞'}</td><td>${mult}×</td><td>${fmt(atMax)} € / mois</td><td>${fmt(srb)} € / mois</td><td>${breakeven}</td></tr>`);min=Number.isFinite(max)?max+1:min;
 });host.innerHTML=out.join('')
}
function profitableJump(p,badges,hours,total){
 
 const rows=regionTiers.france;const effective=Math.max(1,total);const index=rows.findIndex(([max])=>effective<=max);if(index<0||index>=rows.length-1)return null;
 const [currentMax,currentMult]=rows[index];const reference=monthly(parcelMixAt(p,currentMax),badges,hours,{tierMult:currentMult}).value;
 for(let i=index+1;i<rows.length;i++){
   const [max,mult]=rows[i];const min=rows[i-1][0]+1;const one=monthly(parcelMixAt(p,1),badges,hours,{tierMult:mult}).value;const target=Math.max(min,Math.ceil(reference/one));
   if(target<=max||!Number.isFinite(max))return {from:currentMax,target,plots:Math.max(0,target-total),ab:Math.max(0,target-total)*state.parcelCost,mult,reference};
 }
 return null
}
function goalBadgeCounts(badges,canBuy){if(!canBuy)return [0];return [0,...passportGoals.filter(target=>target>badges).map(target=>target-badges)]}
function optimizeAB(p,badges,totalAB,hours,{canBuyBadges=false,lpu=false}={}){
 const pool=Math.max(0,Math.floor(totalAB));const badgeChoices=goalBadgeCounts(badges,canBuyBadges);let best={p:{...p},badges,parcels:0,badgesBought:0,spent:0,left:pool,value:monthly(p,badges,hours).value,lpu:false};
 for(const badgeCount of badgeChoices){const badgeSpend=badgeCount*state.badgeCost;if(badgeSpend>pool)continue;const maxParcels=Math.floor((pool-badgeSpend)/state.parcelCost);for(let count=0;count<=maxParcels;count++){
   const candidateP=expectedParcels(p,count);const applyLpu=Boolean(lpu&&totalParcels(candidateP)>0);const value=monthly(candidateP,badges+badgeCount,hours,{lpu:applyLpu}).value;const spent=badgeSpend+count*state.parcelCost;
   if(value>best.value+1e-12||(Math.abs(value-best.value)<=1e-12&&spent<best.spent)){best={p:candidateP,badges:badges+badgeCount,parcels:count,badgesBought:badgeCount,spent,left:pool-spent,value,lpu:applyLpu}}
  }}
 return best
}
function payback(cost,gain){if(!(cost>0))return '—';if(!(gain>0)||!Number.isFinite(gain))return 'Pas d’amortissement par le loyer';const m=cost/gain;if(m<1)return '≈ 1 mois';if(m<24)return `≈ ${Math.ceil(m)} mois`;return `≈ ${fmt(m/12,1)} ans (${Math.ceil(m)} mois)`}
function allocationLine(plan,hasBadgeAccess){const out=[];if(plan.entryBadges)out.push(`${plan.entryBadges} badge${plan.entryBadges>1?'s':''} d’accès`);if(plan.badgesBought){out.push(`${plan.badgesBought} badge${plan.badgesBought>1?'s':''} → passeport +${badgePct(plan.badges)-badgePct(plan.badges-plan.badgesBought)} %`)}if(plan.parcels)out.push(`${plan.parcels} parcelle${plan.parcels>1?'s':''}`);if(plan.lpu)out.push('1 amélioration légendaire');if(!out.length)return plan.left?'Garder les AB':'Aucun achat';return out.join(' + ')+(plan.badgesBought&&!hasBadgeAccess?' (si badge accessible)':'')}
function allocationExplanation(plan,pool,hasBadgeAccess,prefix=''){
 const steps=[];if(prefix)steps.push(prefix);if(plan.entryBadges)steps.push(`Obtenir d’abord ${plan.entryBadges} badges (${fmtInt(plan.entryBadges*state.badgeCost)} AB) lors d’un déplacement dans une zone éligible pour ouvrir l’Explorer Club.`);if(plan.badgesBought)steps.push(`${plan.badgesBought} badge${plan.badgesBought>1?'s':''} (${fmtInt(plan.badgesBought*state.badgeCost)} AB) pour atteindre ${plan.badges} badges et le bonus passeport de ${badgePct(plan.badges)} %; prévoir cet achat lors d’un passage en zone éligible.`);if(plan.parcels){steps.push(`${plan.parcels} parcelle${plan.parcels>1?'s':''} pour ${fmtInt(plan.parcels*state.parcelCost)} AB, rareté moyenne estimée.`);const before=totalParcels(parcelState()),after=before+plan.parcels,oldTier=tier(before||1),newTier=tier(after||1);if(newTier.mult<oldTier.mult)steps.push(`Ce lot franchit le seuil et fait passer le boost de ${oldTier.mult}× à ${newTier.mult}×; le revenu après franchissement a été comparé au maintien dans le palier actuel.`);else if(after<oldTier.max)steps.push(`Vous restez à ${oldTier.mult}×; il restera ${fmtInt(oldTier.max-after)} parcelles avant la baisse du multiplicateur.`)}if(plan.lpu)steps.push('Utiliser l’amélioration légendaire sur une parcelle possédée.');if(!plan.parcels&&!plan.badgesBought&&!plan.lpu)steps.push('Conserver les AB : les dépenses possibles n’améliorent pas le revenu récurrent estimé.');steps.push(`${fmtInt(plan.left)} AB restent en réserve sur ${fmtInt(pool)} disponibles.`);return steps.join(' ')
}
function set(id,text){const el=$(id);if(el)el.textContent=text}
function renderTierChart(p,badges,hours,currentTotal){
 const svg=$('tierChart');if(!svg)return;
 const W=720,H=250,L=48,R=16,T=14,B=30,maxPlots=Math.min(1000,Math.max(400,Math.ceil(currentTotal/100)*100));
 const values=[];for(let n=1;n<=maxPlots;n++){const mix=parcelMixAt(p,n);values.push(monthly(mix,badges,hours,{srb:true,tierMult:tier(n).mult}).value)}
 const top=Math.max(...values,0.01)*1.08,x=n=>L+(n/maxPlots)*(W-L-R),y=v=>H-B-(v/top)*(H-T-B);
 const points=values.map((v,i)=>`${i?'L':'M'}${x(i+1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 let grid='';for(let k=0;k<=4;k++){const val=top*k/4,yy=y(val);grid+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#34443b" stroke-width="1"/><text x="${L-7}" y="${yy+3}" text-anchor="end" fill="#9aab9e" font-size="10">${fmt(val,1)}€</text>`}
 const currentX=x(Math.max(1,Math.min(maxPlots,currentTotal||1))),currentY=y(values[Math.max(0,Math.min(values.length-1,(currentTotal||1)-1))]||0);
 const labels=[1,Math.round(maxPlots*.25),Math.round(maxPlots*.5),Math.round(maxPlots*.75),maxPlots].map(n=>`<text x="${x(n)}" y="${H-8}" text-anchor="middle" fill="#9aab9e" font-size="10">${n}</text>`).join('');
 svg.innerHTML=`${grid}<path d="${points}" fill="none" stroke="#bdec83" stroke-width="2.5" stroke-linejoin="round"/><line x1="${currentX}" y1="${T}" x2="${currentX}" y2="${H-B}" stroke="#f5c76b" stroke-dasharray="4 4"/><circle cx="${currentX}" cy="${currentY}" r="5" fill="#f5c76b"/><text x="${Math.min(W-70,currentX+8)}" y="${Math.max(T+13,currentY-9)}" fill="#fff0c6" font-size="10">${fmtInt(currentTotal)} parcelles</text>${labels}<text x="${W-R}" y="${H-8}" text-anchor="end" fill="#9aab9e" font-size="9">Parcelles</text>`;
}
function renderParcelSimulation(p,badges,hours,total){
 const savedAB=Math.floor(number('ab')),extraAB=Math.floor(number('simulationAb')),budget=savedAB+extraAB;
 const parcelCount=Math.floor(budget/state.parcelCost),spent=parcelCount*state.parcelCost,left=budget-spent,afterTotal=total+parcelCount;
 const before=monthly(p,badges,hours,{srb:true}),after=monthly(expectedParcels(p,parcelCount),badges,hours,{srb:true});
 const currentTier=tier(total||1),nextTier=tier(afterTotal||1),change=after.value-before.value;
 set('simulationParcels',`${fmtInt(parcelCount)} parcelle${parcelCount===1?'':'s'} achetable${parcelCount===1?'':'s'}`);
 set('simulationReserve',`${fmtInt(savedAB)} AB`);set('simulationAdded',`${fmtInt(extraAB)} AB`);set('simulationBudget',`${fmtInt(budget)} AB`);set('simulationLeft',`${fmtInt(left)} AB`);
 set('simulationBefore',`${fmt(before.value)} € / mois`);set('simulationAfter',`${fmt(after.value)} € / mois`);
 const changeEl=$('simulationChange');if(changeEl){changeEl.textContent=`${change>=0?'+':'−'}${fmt(Math.abs(change))} € / mois`;changeEl.classList.toggle('negative',change<0);changeEl.classList.toggle('positive',change>=0)}
 if(parcelCount===0)set('simulationTier',`Il faut ${fmtInt(state.parcelCost-budget)} AB de plus pour acheter une parcelle. Le loyer reste au palier ${currentTier.mult}×.`);
 else if(currentTier.mult!==nextTier.mult)set('simulationTier',`Le total passerait de ${fmtInt(total)} à ${fmtInt(afterTotal)} parcelles : le boost descend de ${currentTier.mult}× à ${nextTier.mult}×. Cette baisse est déjà incluse dans le loyer estimé après achat.`);
 else set('simulationTier',`Le total passerait de ${fmtInt(total)} à ${fmtInt(afterTotal)} parcelles. Tu restes dans le palier ${nextTier.mult}×, jusqu’à ${fmtInt(nextTier.max)} parcelles.`);
 set('simulationNote',`Estimation fondée sur tes parcelles, tes ${fmtInt(badges)} badges, ${hours} h de boost par jour et ${fmtInt(number('srbHours'))} h de SRB par mois. Les nouvelles parcelles suivent une rareté moyenne estimée (50 % communes, 30 % rares, 15 % épiques, 5 % légendaires).`);
}
function calc(){
 const parcels=parcelState(),total=totalParcels(parcels),badges=Math.floor(number('badges')),ab=Math.floor(number('ab')),askedTarget=number('target'),hours=boostedHours(),srbHours=number('srbHours');
 const current=monthly(parcels,badges,hours,{srb:true});set('monthlyIncome',`${fmt(current.value)} €`);set('baseIncome',`${fmt(current.base)} €`);set('passportBonus',`${badgePct(badges)} %`);set('totalParcels',fmtInt(total));
 set('incomeExplain',`${current.m}× au rythme de boost saisi + ${fmtInt(srbHours)} h de SRB estimées à 50× / mois.`);
 const progress=askedTarget?Math.min(100,current.value/askedTarget*100):100;const nearGoal=askedTarget>0&&progress>=80;const nextGoal=Math.ceil(Math.max(askedTarget,current.value)*1.5*2)/2;const planTarget=nearGoal?nextGoal:askedTarget;
 $('progressBar').style.width=`${Number.isFinite(progress)?progress:0}%`;set('progressLabel',`${fmt(progress,0)} %`);
 set('gapLabel',nearGoal?`Objectif suivant proposé : ${fmt(nextGoal)} € / mois. Écart après réévaluation : ${fmt(Math.max(0,nextGoal-current.value))} €.`:`Écart à l’objectif : ${fmt(Math.max(0,askedTarget-current.value))} € / mois`);
 set('goalSuggestion',nearGoal?`Vous êtes à ${fmt(progress,0)} % de votre objectif initial. L’application revoit le plan vers ${fmt(nextGoal)} € / mois.`:'Un objectif supérieur sera proposé à partir de 80 % de progression.');
 renderBoostTable(parcels,badges,hours,total);renderTierChart(parcels,badges,hours,total);set('boostSrbHeader',`Avec SRB ${fmtInt(srbHours)} h / mois`);set('srbIncome',`${fmt(current.value)} € / mois`);
 const active=tier(total||1),nextMax=active.max;set('nextMilestone',`${active.mult}× jusqu’à ${fmtInt(nextMax)} parcelles`);set('milestoneCost',`${fmtInt(Math.max(0,nextMax-total)*state.parcelCost)} AB pour atteindre le haut du palier`);
 const badgeAccess=true,canBuyBadges=true,freeStreak=total>=3?FREE_STREAK_30:0,clubStreak=total>=3?CLUB_STREAK_30:0,freeAB=freeStreak+FREE_ADS_30,freePool=ab+freeAB;
 const freePlan=optimizeAB(parcels,badges,freePool,hours,{canBuyBadges,lpu:false});const freeLine=allocationExplanation(freePlan,freePool,badgeAccess,`Sur 30 jours : ${freeStreak} AB de série quotidienne + ${FREE_ADS_30} AB pour 20 pubs/jour${total<3?' (série débloquée à 3 parcelles)':''}.`);
 set('freePlan',freeLine);set('freeAction',allocationLine(freePlan,badgeAccess));set('freeLeft',`${fmtInt(freePlan.left)} AB estimés en réserve`);set('freeIncome',`${fmt(freePlan.value)} € / mois avec SRB`);set('freeFoot',`Projection après 30 jours de collecte gratuite : ${fmtInt(freeAB)} AB ajoutés aux ${fmtInt(ab)} déjà en réserve.`);
 const seasonCost=number('settingSeasonCost'),clubCost=number('settingClubCost'),seasonAB=SEASON_PASS_AB,seasonPool=freePool+seasonAB,seasonLpu=true;
 const passPlan=optimizeAB(parcels,badges,seasonPool,hours,{canBuyBadges,lpu:seasonLpu});const passGain=passPlan.value-freePlan.value;const passPayback=payback(seasonCost,passGain);
 set('premiumCost',`${fmt(seasonCost)} €`);set('premiumAction',allocationLine(passPlan,badgeAccess));set('premiumLeft',`${fmtInt(passPlan.left)} AB estimés en réserve`);set('premiumIncome',`${fmt(passPlan.value)} € / mois avec SRB`);set('premiumPayback',passPayback);set('premiumPlan',allocationExplanation(passPlan,seasonPool,badgeAccess,`Projection 30 jours : ${fmtInt(freeAB)} AB gratuits + ${fmtInt(seasonAB)} AB de repère Premium. L’amélioration légendaire est incluse si vous terminez toute la piste.`));set('premiumFoot',`Après un mois de pass puis arrêt · variation vs gratuit : ${passGain>0?'+':''}${fmt(passGain)} € / mois.`);
 const missingBadges=Math.max(0,5-badges),entryAB=missingBadges*state.badgeCost,clubAds=CLUB_ADS_30,clubPool=ab+clubStreak+clubAds,clubCanUse=badges>=5||ab>=entryAB,clubStartBadges=Math.max(5,badges),clubFunding=Math.max(0,clubPool-entryAB);
 const rawClub=optimizeAB(parcels,clubStartBadges,clubCanUse?clubFunding:ab,hours,{canBuyBadges,lpu:false});const clubPlan=clubCanUse?{...rawClub,spent:rawClub.spent+entryAB,entryBadges:missingBadges}:rawClub;const clubGain=clubCanUse?clubPlan.value-freePlan.value:0;const clubPayback=payback(clubCost,clubGain);
 set('clubCost',`${fmt(clubCost)} €`);set('clubAction',clubCanUse?allocationLine(clubPlan,badgeAccess):`D’abord ${missingBadges} badges · ${fmtInt(entryAB)} AB`);set('clubIncome',clubCanUse?`${fmt(clubPlan.value)} € / mois avec SRB`:'—');set('clubPayback',clubCanUse?clubPayback:'Bloqué : 5 badges requis');set('clubPlan',clubCanUse?allocationExplanation(clubPlan,clubPool,badgeAccess,`Après accès Club : estimation sur 30 jours de connexion et ${clubAds} AB issus des pubs. Le Club exige 5 badges possédés avant l’abonnement.`):`Il vous manque ${missingBadges} badges (coût indicatif ${fmtInt(entryAB)} AB). Achetez-les lors d’un passage dans une zone éligible; le Club sera accessible une fois les 5 badges obtenus.`);set('clubFoot',clubCanUse?`Après un mois Club puis arrêt · variation vs gratuit : ${clubGain>0?'+':''}${fmt(clubGain)} € / mois.`:'L’abonnement Club ne s’active qu’après possession de 5 badges.');
 const bothPool=freePool+seasonAB+(clubStreak-freeStreak)+CLUB_ADS_30;const bothCanUse=clubCanUse;const bothRaw=bothCanUse?optimizeAB(parcels,clubStartBadges,Math.max(0,bothPool-entryAB),hours,{canBuyBadges,lpu:seasonLpu}):passPlan;const bothPlan=bothCanUse?{...bothRaw,spent:bothRaw.spent+entryAB,entryBadges:missingBadges}:passPlan;const bothGain=bothCanUse?bothPlan.value-freePlan.value:0;const bothCost=seasonCost+clubCost;const bothPayback=payback(bothCost,bothGain);
 set('bothCost',`${fmt(bothCost)} €`);set('bothAction',bothCanUse?allocationLine(bothPlan,badgeAccess):`D’abord ${missingBadges} badges`);set('bothIncome',bothCanUse?`${fmt(bothPlan.value)} € / mois avec SRB`:'—');set('bothPayback',bothCanUse?bothPayback:'Bloqué : 5 badges requis');set('bothPlan',bothCanUse?allocationExplanation(bothPlan,bothPool,badgeAccess,`Projection combinée sur 30 jours : série Club + pubs + ${fmtInt(seasonAB)} AB Premium.`):`Obtenez d’abord 5 badges; le coût estimé est ${fmtInt(entryAB)} AB. Ensuite, les récompenses Premium et Club sont calculées ensemble.`);set('bothFoot',bothCanUse?`Après un mois des deux offres puis arrêt · variation vs gratuit : ${bothGain>0?'+':''}${fmt(bothGain)} € / mois.`:'Ne souscrivez pas au Club avant d’avoir les 5 badges.');
 const abRows=[['Gratuit',freeStreak,FREE_ADS_30,0],['Season Pass',freeStreak,FREE_ADS_30,SEASON_PASS_AB],['Explorer Club',clubStreak,CLUB_ADS_30,0],['Season Pass + Explorer Club',clubStreak,CLUB_ADS_30,SEASON_PASS_AB]];const yieldHost=$('abYieldTable');if(yieldHost)yieldHost.innerHTML=abRows.map(([name,streak,ads,subscription])=>`<tr><td>${name}</td><td>${fmtInt(streak)} AB</td><td>${fmtInt(ads)} AB</td><td>${subscription?fmtInt(subscription)+' AB':''}</td><td><b>${fmtInt(streak+ads+subscription)} AB</b></td></tr>`).join('');
 const options=[{id:'card-premium',name:'Season Pass',cost:seasonCost,gain:passGain,payback:passPayback,plan:passPlan,pool:seasonPool,allowed:true},{id:'card-club',name:'Explorer Club',cost:clubCost,gain:clubGain,payback:clubPayback,plan:clubPlan,pool:clubPool,allowed:clubCanUse},{id:'card-both',name:'Season Pass + Explorer Club',cost:bothCost,gain:bothGain,payback:bothPayback,plan:bothPlan,pool:bothPool,allowed:bothCanUse}].filter(o=>o.allowed&&o.gain>0);
 document.querySelectorAll('.strategy-card').forEach(c=>c.classList.remove('best-choice','best-free','best-paid'));
 const freeCard=$('card-free');freeCard?.classList.add('best-choice','best-free');
 let title=nearGoal?`Cap suivant : ${fmt(nextGoal)} € / mois · voie gratuite`:'Ligne directrice sans dépense';
 let text=`${freeLine}${nearGoal?` Pour ce nouvel objectif de ${fmt(nextGoal)} €, la feuille de route recalcule le prochain palier rentable.`:''}`;
 const selectedPlan=freePlan,selectedPool=freePool,selectedName='voie gratuite';
 if(options.length){options.sort((a,b)=>a.cost/a.gain-b.cost/b.gain);const best=options[0];$(best.id)?.classList.add('best-choice','best-paid');text+=` Si tu souhaites investir, le meilleur ratio parmi les options payantes est ${best.name} : ${fmt(best.cost)} € pour une hausse estimée de ${fmt(best.gain)} € de loyer par mois; amortissement indicatif ${best.payback}. ${allocationExplanation(best.plan,best.pool,badgeAccess)}`;}
 set('recTitle',title);set('recText',text);
 const planTotal=total+selectedPlan.parcels,planTier=tier(planTotal||1),cap=planTier.max;
 set('roadmapNow',`${selectedName} : ${allocationLine(selectedPlan,badgeAccess)}. Le plan compte ${fmtInt(ab)} AB actuels et les récompenses estimées du prochain mois (${fmtInt(selectedPool-ab)} AB), soit ${fmtInt(selectedPool)} AB à répartir. Revenu mensuel prévu après achats : ${fmt(selectedPlan.value)} € SRB compris.`);
 const plotsToCap=Math.max(0,cap-planTotal);set('roadmapCap',plotsToCap?`Le palier actuel donne ${planTier.mult}× jusqu’à ${fmtInt(cap)} parcelles. Après l’action conseillée, arrêtez-vous à ${fmtInt(cap)} : il reste ${fmtInt(plotsToCap)} parcelles (${fmtInt(plotsToCap*state.parcelCost)} AB) avant la baisse. Un achat au-delà fait baisser le multiplicateur immédiatement.`:`Après l’action, vous êtes au dernier rang du palier ${planTier.mult}× (${fmtInt(cap)} parcelles). N’achetez pas une parcelle isolée au-delà : économisez d’abord pour que le revenu dépasse de nouveau son niveau actuel.`);
 const nextBadgeGoal=passportGoals.find(goal=>goal>selectedPlan.badges);if(nextBadgeGoal){const badgeNeed=nextBadgeGoal-selectedPlan.badges,badgeBonus=badgePct(nextBadgeGoal)-badgePct(selectedPlan.badges);if(badgeBonus)set('roadmapCap',`${$('roadmapCap').textContent} Le prochain bonus permanent est à ${fmtInt(nextBadgeGoal)} badges (+${badgeBonus} %); il en manque ${badgeNeed}, soit environ ${fmtInt(badgeNeed*state.badgeCost)} AB. Achetez-les lors d’un déplacement dans une zone éligible.`)}
 const jump=profitableJump(selectedPlan.p,selectedPlan.badges,hours,planTotal);if(jump){const totalPlots=Math.max(0,jump.target-planTotal),extraAfterCap=Math.max(0,jump.target-Math.max(planTotal,cap));set('roadmapJump',`Un « saut de palier », c’est économiser puis acheter plusieurs parcelles d’un coup après une baisse de boost. Le calcul estime qu’à ${fmtInt(jump.target)} parcelles (${jump.mult}×), votre loyer mensuel retrouve ou dépasse celui du haut du palier précédent. Depuis le plan conseillé, gardez ${fmtInt(totalPlots*state.parcelCost)} AB (${fmtInt(totalPlots)} parcelles) avant de reprendre. Après ${fmtInt(cap)}, il faudra encore ${fmtInt(extraAfterCap)} parcelles (${fmtInt(extraAfterCap*state.parcelCost)} AB).`)}else set('roadmapJump',`Vous êtes dans le dernier palier disponible du tableau (2×). Continuer d’acheter augmente alors le revenu sans nouveau seuil de baisse.`);
 set('assumptionText',`Revenu estimé = loyer de base × bonus passeport × boosts publicitaires (${hours} h/j au multiplicateur France ${current.m}×) + ${fmtInt(srbHours)} h de SRB mensuelles à 50×. Le SRB est compris dans le chiffre principal. Conversion USD→EUR indicative et modifiable.`);
 renderParcelSimulation(parcels,badges,hours,total);
}
function openModal(){$('modal').classList.add('open')}function closeModal(){$('modal').classList.remove('open')}
$('settingsOpen').onclick=openModal;$('sourcesOpen').onclick=openModal;$('modalClose').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};$('detailsToggle').onclick=openModal;
 $('saveSettings').onclick=()=>{state.parcelCost=Math.max(1,number('settingParcelCost')||100);state.badgeCost=Math.max(1,number('settingBadgeCost')||200);state.seasonCost=number('settingSeasonCost');state.clubCost=number('settingClubCost');state.usdEur=Math.max(.01,Number($('settingUsdEur')?.value)||.92);calc();closeModal()};
document.querySelectorAll('input').forEach(el=>el.addEventListener('input',calc));document.querySelectorAll('.scenario-pill').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.scenario-pill').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.scenario=btn.dataset.scenario;calc()});
const settingsGrid=document.querySelector('.settings-grid');const dynamic=[['settingUsdEur','Conversion USD → EUR','0.92','0.01','€/$']];for(const [id,label,value,min,suffix] of dynamic){if(!$(id)){const el=document.createElement('label');el.innerHTML=`${label} <span class="input-suffix"><input id="${id}" type="number" value="${value}" min="${min}" step="any"><span>${suffix}</span></span>`;settingsGrid.append(el);el.querySelector('input').addEventListener('input',calc)}}

const AD_TIMER_KEY='atlas-earth-ab-ad-due-v1',AD_FIRED_KEY='atlas-earth-ab-ad-fired-v1',AD_WAIT=20*60*1000;
function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
function safeSet(key,value){try{localStorage.setItem(key,String(value))}catch{}}
function tickAdReminder(){const due=Number(safeGet(AD_TIMER_KEY));const button=$('adReminderButton'),status=$('adReminderStatus');if(!button||!status)return;if(!due){button.dataset.timer='20m';button.setAttribute('aria-label','Démarrer le rappel de publicité Atlas Earth, 20 minutes');status.textContent='Le rappel démarre uniquement quand vous appuyez sur le bouton.';return}if(due>Date.now()){const left=Math.ceil((due-Date.now())/1000),mins=Math.floor(left/60),secs=left%60;button.dataset.timer=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;button.setAttribute('aria-label',`Rappel en cours, prochaine pub de 1 AB dans ${mins} minutes et ${secs} secondes; appuyez pour recommencer`);status.textContent=`Prochaine pub de 1 AB dans ${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;return}button.dataset.timer='!';button.setAttribute('aria-label','Le rappel de publicité de 1 AB est arrivé; appuyez pour relancer 20 minutes');status.textContent='La pub de 1 AB devrait être disponible. Retournez dans Atlas Earth.';if(safeGet(AD_FIRED_KEY)!==String(due)){safeSet(AD_FIRED_KEY,due);if('Notification'in window&&Notification.permission==='granted')new Notification('Atlas Earth · pub disponible',{body:'La vidéo publicitaire donnant 1 AB devrait être disponible.'})}}
if($('adReminderButton'))$('adReminderButton').onclick=async()=>{if('Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}const due=Date.now()+AD_WAIT;safeSet(AD_TIMER_KEY,due);safeSet(AD_FIRED_KEY,'');tickAdReminder()};
setInterval(tickAdReminder,1000);tickAdReminder();


// PWA installation: Android/Chrome prompt; iPhone/iPad users receive Safari instructions.
const installButton=$('installAppButton');let deferredInstallPrompt=null;
const isInstalled=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
if(installButton){installButton.hidden=isInstalled();window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;installButton.hidden=false});window.addEventListener('appinstalled',()=>{installButton.hidden=true;deferredInstallPrompt=null});installButton.addEventListener('click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installButton.hidden=true;return}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);alert(ios?'Pour installer : ouvre cette page dans Safari, touche Partager, puis « Sur l’écran d’accueil ».':'Pour installer : ouvre le menu du navigateur puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».')})}
const nativeWebView=location.hostname==='localhost'||location.protocol==='capacitor:'||location.protocol==='ionic:';
if('serviceWorker'in navigator&&location.protocol!=='file:'&&!nativeWebView)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20261025-1',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{}));

// Focused app sections with bottom navigation; hash keeps the current page shareable.
const pageNames=['accueil','profil','strategie','boosts','simulation','cagnotte'];
function showPage(name,{updateHash=false}={}){
 const page=pageNames.includes(name)?name:'accueil';
 document.querySelectorAll('main [data-page]').forEach(view=>{view.hidden=view.dataset.page!==page});
 document.querySelectorAll('.nav-item').forEach(button=>{const active=button.dataset.nav===page;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
 if(updateHash&&location.hash!==`#${page}`)history.replaceState(null,'',`#${page}`);
 window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.nav,{updateHash:true})));
window.addEventListener('hashchange',()=>showPage(location.hash.slice(1)));
showPage(location.hash.slice(1));

// Keep the player's working profile on this device, including the selected boost scenario.
const PROFILE_STORAGE_KEY='atlas-objectif-player-profile-v1';
const PROFILE_FIELD_IDS=['common','rare','epic','legendary','badges','ab','boostHours','srbHours','target','simulationAb'];
function readSavedProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)||'null')}catch{return null}}
function savePlayerProfile(){
 const values=Object.fromEntries(PROFILE_FIELD_IDS.map(id=>[id,$(id)?.value??'']));
 try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify({...values,scenario:state.scenario}))}catch{}
}
function restorePlayerProfile(){
 const saved=readSavedProfile();if(!saved||typeof saved!=='object')return;
 for(const id of PROFILE_FIELD_IDS){if(typeof saved[id]==='string'&&$(id))$(id).value=saved[id]}
 if(['prudent','habituel','optimise'].includes(saved.scenario)){
  state.scenario=saved.scenario;
  document.querySelectorAll('.scenario-pill').forEach(button=>button.classList.toggle('active',button.dataset.scenario===state.scenario));
 }
}
restorePlayerProfile();
PROFILE_FIELD_IDS.forEach(id=>$(id)?.addEventListener('input',savePlayerProfile));
document.querySelectorAll('.scenario-pill').forEach(button=>button.addEventListener('click',savePlayerProfile));
calc();

// Move each navigation target into its own app-level viewport.
const appMain=document.querySelector('main');
const homeShell=appMain?.querySelector(':scope > .page-view[data-page="accueil"]');
const workspace=appMain?.querySelector(':scope > .workspace');
const inputsPage=workspace?.querySelector('.inputs[data-page="profil"]');
const results=workspace?.querySelector('.results');
const dashboardPage=results?.querySelector(':scope > .page-view[data-page="accueil"]');
const strategyPage=results?.querySelector(':scope > .page-view[data-page="strategie"]');
const boostsPage=results?.querySelector(':scope > .page-view[data-page="boosts"]');
if(appMain&&homeShell&&workspace&&inputsPage&&dashboardPage&&strategyPage&&boostsPage){
 homeShell.append(dashboardPage);
 appMain.insertBefore(inputsPage,workspace);
 appMain.insertBefore(strategyPage,workspace);
 appMain.insertBefore(boostsPage,workspace);
 workspace.remove();
}
showPage(location.hash.slice(1));
if($('simulationProfileLink'))$('simulationProfileLink').addEventListener('click',()=>showPage('profil',{updateHash:true}));

// Monthly rent balance ledger, stored separately from the player's strategy profile.
const SAVINGS_STORAGE_KEY='atlas-objectif-monthly-savings-v1';
const monthInput=$('savingsMonth');
const today=new Date();const currentMonth=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
function readSavings(){try{const data=JSON.parse(localStorage.getItem(SAVINGS_STORAGE_KEY)||'[]');return Array.isArray(data)?data.filter(x=>x&&/^\d{4}-\d{2}$/.test(x.month)&&Number.isFinite(Number(x.start))&&(x.end===''||x.end===null||Number.isFinite(Number(x.end)))):[]}catch{return []}}
function money(value){return `${fmt(value)} €`}
function savingsChangeText(delta,previous){const percent=previous===0?null:delta/Math.abs(previous)*100;return `${delta>=0?'+':'−'}${money(Math.abs(delta))}${percent===null?'':` (${percent>=0?'+':'−'}${fmt(Math.abs(percent),0)} %)`}`}
function monthLabel(value){const [year,month]=value.split('-').map(Number);return new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(new Date(year,month-1,1))}
function previousSavingsEntry(entries,month){return entries.filter(item=>item.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0]}
function renderSavings({loadForm=true}={}){
 const entries=readSavings().sort((a,b)=>a.month.localeCompare(b.month));
 const month=monthInput?.value||currentMonth;const existing=entries.find(item=>item.month===month);
 if(loadForm){if(existing){$('savingsStart').value=existing.start;$('savingsEnd').value=existing.end===''||existing.end===null?'':existing.end}
 else{const previous=previousSavingsEntry(entries,month);$('savingsStart').value=previous&&previous.end!==''&&previous.end!==null?previous.end:'0';$('savingsEnd').value=''}}
 const closed=entries.filter(item=>item.end!==''&&item.end!==null).sort((a,b)=>a.month.localeCompare(b.month));
 const latest=entries.at(-1);$('savingsTotal').textContent=latest?money(latest.end===''||latest.end===null?Number(latest.start):Number(latest.end)):money(0);
 const start=Number($('savingsStart').value),end=$('savingsEnd').value===''?null:Number($('savingsEnd').value);
 const monthGain=end!==null?end-start:null;const thisMonth=$('savingsThisMonth');thisMonth.textContent=monthGain===null?'En cours':`${monthGain>=0?'+':'−'}${money(Math.abs(monthGain))}`;thisMonth.classList.toggle('negative',monthGain!==null&&monthGain<0);thisMonth.classList.toggle('positive',monthGain!==null&&monthGain>=0);
 const prior=previousSavingsEntry(closed,month);const priorGain=prior?Number(prior.end)-Number(prior.start):null;const delta=monthGain!==null&&priorGain!==null?monthGain-priorGain:null;const change=$('savingsChange');change.textContent=delta===null?'—':`${savingsChangeText(delta,priorGain)} vs ${monthLabel(prior.month)}`;change.classList.toggle('negative',delta!==null&&delta<0);change.classList.toggle('positive',delta!==null&&delta>=0);
 const host=$('savingsHistory');host.innerHTML=entries.length?entries.slice().reverse().map(item=>{const gain=item.end===''||item.end===null?null:Number(item.end)-Number(item.start);const older=closed.filter(x=>x.month<item.month).sort((a,b)=>b.month.localeCompare(a.month))[0];const olderGain=older?Number(older.end)-Number(older.start):null;const changeValue=gain!==null&&olderGain!==null?gain-olderGain:null;return `<tr><td>${monthLabel(item.month)}</td><td>${money(Number(item.start))}</td><td>${item.end===''||item.end===null?'En cours':money(Number(item.end))}</td><td>${gain===null?'—':`${gain>=0?'+':'−'}${money(Math.abs(gain))}`}</td><td>${changeValue===null?'—':savingsChangeText(changeValue,olderGain)}</td></tr>`}).join(''):'<tr><td colspan="5">Aucun mois enregistré.</td></tr>';
}
if(monthInput){monthInput.value=currentMonth;monthInput.addEventListener('change',renderSavings)}
['savingsStart','savingsEnd'].forEach(id=>$(id)?.addEventListener('input',()=>renderSavings({loadForm:false})));
$('saveSavingsMonth')?.addEventListener('click',()=>{
 const month=monthInput.value,start=Number($('savingsStart').value),rawEnd=$('savingsEnd').value,end=rawEnd===''?'':Number(rawEnd);
 if(!month||!Number.isFinite(start)||start<0||rawEnd!==''&&(!Number.isFinite(end)||end<0)){$('savingsStatus').textContent='Vérifie le mois et les montants saisis.';return}
 const entries=readSavings();const index=entries.findIndex(item=>item.month===month);const record={month,start:Number(start.toFixed(2)),end:end===''?'':Number(end.toFixed(2))};if(index>=0)entries[index]=record;else entries.push(record);
 try{localStorage.setItem(SAVINGS_STORAGE_KEY,JSON.stringify(entries));$('savingsStatus').textContent=end===''?`${monthLabel(month)} est enregistré. Tu pourras ajouter le solde de fin quand le mois sera terminé.`:`${monthLabel(month)} enregistré : ${money(end-start)} gagnés ce mois.`;renderSavings()}catch{$('savingsStatus').textContent='Enregistrement impossible sur cet appareil.'}
});
renderSavings();

// Screenshot OCR: recognition runs in a browser worker; the image stays on this device.
const parcelKeys=['common','rare','epic','legendary'];
let ocrWorkerPromise=null,ocrScriptPromise=null,pendingOcr=null;
function loadOcrLibrary(){
 if(window.Tesseract)return Promise.resolve(window.Tesseract);
 if(ocrScriptPromise)return ocrScriptPromise;
 ocrScriptPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';script.async=true;script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('Le moteur OCR ne s’est pas chargé.'));script.onerror=()=>reject(new Error('Impossible de télécharger le moteur OCR. Vérifie ta connexion internet puis réessaie.'));document.head.append(script)}).catch(error=>{ocrScriptPromise=null;throw error});
 return ocrScriptPromise;
}
async function getOcrWorker(){
 const Tesseract=await loadOcrLibrary();
 if(!ocrWorkerPromise)ocrWorkerPromise=Tesseract.createWorker('eng+fra',1,{logger:message=>{if(message.status==='recognizing text')set('ocrStatus',`Lecture de la capture… ${Math.round((message.progress||0)*100)} %`)}}).catch(error=>{ocrWorkerPromise=null;throw error});
 return ocrWorkerPromise;
}
async function prepareOcrImage(file){
 let bitmap;
 try{bitmap=await createImageBitmap(file)}catch{
  bitmap=await new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Cette image ne peut pas être ouverte. Choisis une capture PNG ou JPEG.'))};image.src=url});
 }
 const scale=Math.min(2.5,3200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.filter='grayscale(1) contrast(1.22)';context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL('image/jpeg',.94);
}
function normalizedOcrWord(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'')}
function ocrInteger(text){const raw=String(text||'').trim();if(!/^\d{1,3}(?:[,.\s]\d{3})*$|^\d{1,6}$/.test(raw))return null;const value=Number(raw.replace(/[,.\s]/g,''));return Number.isInteger(value)&&value>=0&&value<=100000?value:null}
function levenshtein(a,b){const row=Array.from({length:b.length+1},(_,index)=>index);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const previous=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=previous}}return row[b.length]}
function ocrLabelMatch(text,aliases){const word=normalizedOcrWord(text);if(aliases.includes(word))return true;return aliases.some(alias=>alias.length>=6&&Math.abs(alias.length-word.length)<=1&&levenshtein(word,alias)<=1)}
function readPassportBadges(words,maxLevel=5){
 const text=words.map(word=>String(word.text||'').trim()).filter(Boolean),normalized=text.map(normalizedOcrWord);let level=null,levelIndex=-1;
 for(let i=0;i<normalized.length;i++){if(normalized[i]!=='niveau'&&normalized[i]!=='level')continue;for(let j=i+1;j<Math.min(text.length,i+5);j++){const value=ocrInteger(text[j]);if(value!==null&&value<=maxLevel&&value<=5&&value>=(level??-1)){level=value;levelIndex=i;break}}}
 const tierStarts=[0,1,11,31,61,101],tierEnds=[0,10,30,60,100,Infinity];
 if(level===null){const joined=text.join(' ').replace(/[–—]/g,'-');for(let i=1;i<=maxLevel&&i<tierStarts.length;i++){const start=tierStarts[i],end=tierEnds[i];if(new RegExp(`\\b${start}\\s*-\\s*${end}\\s+(?:badges?)\\b`,'i').test(joined)){level=i;break}}}
 if(level===null)return null;
 const previous=level===0?0:tierStarts[level]-1;
 if(level===0)return {value:0,confidence:90,passportLevel:0,filled:0};
 const boxes=words.map(word=>word.bbox||{}),imageWidth=Math.max(...boxes.map(box=>Number(box.x1)||0),0),imageHeight=Math.max(...boxes.map(box=>Number(box.y1)||0),0);
 let headerY=0;
 // Prefer the badge label nearest the active level marker, rather than lower locked tiers.
 if(levelIndex>=0){const levelBox=words[levelIndex]?.bbox;if(levelBox){const ly=((levelBox.y0||0)+(levelBox.y1||0))/2;const candidates=words.filter(word=>ocrLabelMatch(word.text,['badge','badges'])&&word.bbox);candidates.sort((a,b)=>Math.abs(((a.bbox.y0||0)+(a.bbox.y1||0))/2-ly)-Math.abs(((b.bbox.y0||0)+(b.bbox.y1||0))/2-ly));if(candidates[0])headerY=((candidates[0].bbox.y0||0)+(candidates[0].bbox.y1||0))/2}}
 const headerWord=words.find(word=>ocrLabelMatch(word.text,['badge','badges'])&&word.bbox&&Math.abs(((word.bbox.y0||0)+(word.bbox.y1||0))/2-headerY)<Math.max(30,imageWidth*.07));if(headerWord)headerY=headerWord.bbox.y1||headerY;
 const nextHeaderY=words.filter(word=>ocrLabelMatch(word.text,['badge','badges'])&&word.bbox&&word.bbox.y0>headerY+imageWidth*.12).map(word=>word.bbox.y0).sort((a,b)=>a-b)[0]??imageHeight;
 const months=new Set(['october','octobre','march','mars','november','novembre','january','janvier','february','fevrier','april','avril','may','mai','june','juin','july','juillet','august','aout','september','septembre','december','decembre']);const banned=new Set(['niveau','level','badges','badge','boost','de','the','passport','passeport','2025','2026','2027']);
 const occupied=new Set();for(const word of words){const box=word.bbox||{},raw=String(word.text||'').trim(),key=normalizedOcrWord(raw),x=((box.x0||0)+(box.x1||0))/2,y=((box.y0||0)+(box.y1||0))/2;if(!key||Number(word.confidence)<30||x<imageWidth*.08||x>imageWidth*.93||y<headerY+imageWidth*.035||y>=nextHeaderY)continue;const number=ocrInteger(raw);if(number!==null&&!months.has(key))continue;if(banned.has(key)&&!months.has(key))continue;const col=Math.max(0,Math.min(4,Math.floor((x-imageWidth*.08)/(imageWidth*.168)))),row=Math.floor((y-headerY-imageWidth*.035)/(imageWidth*.14));occupied.add(`${row}:${col}`)}
 const filled=Math.min(tierEnds[level]-previous,occupied.size);if(!filled&&level>0)return readPassportBadges(words,level-1);const confidence=filled?Math.min(90,58+filled*8):45;
 return {value:previous+filled,confidence,passportLevel:level,filled};
}
function readCountsFromWords(words,type){
 const definitions=type==='parcels'?[['common',['common','commons','commun','communs','commune','communes']],['rare',['rare','rares']],['epic',['epic','epics','epique','epiques']],['legendary',['legendary','legendaire','legendaires']],['total',['total']]]:[['badges',['badge','badges','passeport','passport']]];
 const labels=[];for(const [key,aliases] of definitions)for(const word of words)if(ocrLabelMatch(word.text,aliases))labels.push({key,word});
 const numbers=[];for(let index=0;index<words.length;index++){const raw=String(words[index].text||'').trim(),value=ocrInteger(raw);if(value===null||raw.includes('%'))continue;const box=words[index].bbox||{},next=words[index+1],nextText=normalizedOcrWord(next?.text),centerY=((box.y0||0)+(box.y1||0))/2,nextCenterY=next?((next.bbox?.y0||0)+(next.bbox?.y1||0))/2:0;const adjacentPercent=next&&String(next.text||'').trim()==='%'&&Math.abs(centerY-nextCenterY)<Math.max(24,((box.y1||0)-(box.y0||0))*2);if(nextText==='percent'||nextText==='percentage'||adjacentPercent)continue;numbers.push({word:words[index],value,index})}
 const pairs=[];for(const label of labels)for(const number of numbers){const a=label.word.bbox||{},b=number.word.bbox||{},ah=Math.max(1,(a.y1||0)-(a.y0||0)),bh=Math.max(1,(b.y1||0)-(b.y0||0));const dy=Math.abs(((a.y0||0)+(a.y1||0))/2-((b.y0||0)+(b.y1||0))/2),dx=((b.x0||0)+(b.x1||0))/2-((a.x0||0)+(a.x1||0))/2;const maxDy=type==='badges'?Math.max(36,ah*1.7,bh*1.7):Math.max(100,ah*3,bh*3),maxDx=type==='badges'?Math.max(180,ah*6,bh*6):Math.max(300,ah*8,bh*8);if(dy>maxDy||Math.abs(dx)>maxDx)continue;const score=dy*1.8+Math.abs(dx)*.13+Math.max(0,-dx)*.35;pairs.push({key:label.key,number,score})}
 pairs.sort((a,b)=>a.score-b.score);const found={},usedNumbers=new Set();for(const pair of pairs){if(found[pair.key]||usedNumbers.has(pair.number.index))continue;found[pair.key]={value:pair.number.value,confidence:Number(pair.number.word.confidence)||0};usedNumbers.add(pair.number.index)}
 if(type==='parcels'&&found.total&&parcelKeys.filter(key=>found[key]).length===3){const missing=parcelKeys.find(key=>!found[key]),remainder=found.total.value-parcelKeys.filter(key=>found[key]).reduce((sum,key)=>sum+found[key].value,0);if(remainder>=0)found[missing]={value:remainder,confidence:0,derived:true}}
 if(type==='badges'){const passport=readPassportBadges(words);if(passport)found.badges=passport}
 return found;
}
function renderOcrReview(type,found){
 pendingOcr={type,found};const host=$('ocrDetectedValues');host.replaceChildren();const fields=type==='parcels'?parcelKeys.filter(key=>found[key]):found.badges?['badges']:[];
 if(!fields.length){$('ocrReview').hidden=true;set('ocrStatus',type==='parcels'?'Aucune quantité par rareté reconnue. Choisis une capture où les lignes Communes, Rares, Épiques et Légendaires sont visibles.':'Nombre de badges non reconnu. Choisis une capture où le total de badges est visible.');return}
 for(const key of fields){const labelText=key==='common'?'Parcelles communes':key==='rare'?'Parcelles rares':key==='epic'?'Parcelles épiques':key==='legendary'?'Parcelles légendaires':'Badges de passeport';const field=document.createElement('label');field.className='ocr-value-field';field.htmlFor=`ocrValue-${key}`;field.textContent=labelText;const input=document.createElement('input');input.id=`ocrValue-${key}`;input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.value=found[key].value;input.dataset.ocrField=key;field.append(input);host.append(field)}
 const partial=type==='parcels'&&fields.length<parcelKeys.length,sum=type==='parcels'?fields.reduce((total,key)=>total+found[key].value,0):0;let note=partial?'Certaines raretés n’ont pas été lues. Seules les valeurs affichées seront modifiées; les autres garderont leur valeur actuelle.':'Relis les nombres et corrige-les si nécessaire avant de les appliquer.';if(type==='parcels'&&found.total)note+=' Somme détectée : '+sum+'; total lu : '+found.total.value+(sum===found.total.value?' (cohérent).':' (à vérifier).')+(fields.some(key=>found[key].derived)?' Une rareté a été calculée à partir du total.':'');else if(type==='parcels')note+=' Somme détectée : '+sum+' parcelles.';if(type==='badges'&&found.badges?.passportLevel!==undefined)note=`Passeport niveau ${found.badges.passportLevel} : ${found.badges.value-found.badges.filled} badges des paliers précédents + ${found.badges.filled} case(s) remplie(s) détectée(s) dans ce palier. Vérifie le total avant de l’appliquer.`;$('ocrReviewNote').textContent=note;$('ocrReview').hidden=false;set('ocrStatus','Lecture terminée : '+fields.length+' valeur'+(fields.length>1?'s':'')+' détectée'+(fields.length>1?'s':'')+'.');
}
async function processScreenshot(file,type){
 if(!file)return;if(!file.type.startsWith('image/')){set('ocrStatus','Choisis un fichier image (PNG ou JPEG).');return}if(file.size>25*1024*1024){set('ocrStatus','Cette image dépasse 25 Mo. Fais une capture ou réduis sa taille avant de réessayer.');return}
 $('ocrReview').hidden=true;set('ocrStatus','Préparation de la capture…');for(const id of ['parcelScreenshot','badgeScreenshot'])if($(id))$(id).disabled=true;
 try{const source=await prepareOcrImage(file);set('ocrStatus','Chargement du moteur de lecture…');const worker=await getOcrWorker();await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});let result=await worker.recognize(source);let found=readCountsFromWords(result.data.words||[],type);const complete=type==='parcels'?parcelKeys.every(key=>found[key]&&!found[key].derived):Boolean(found.badges);if(!complete){set('ocrStatus','Je vérifie la capture avec une seconde méthode…');await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});result=await worker.recognize(source);const fallback=readCountsFromWords(result.data.words||[],type);for(const [key,value] of Object.entries(fallback))if(!found[key]||(value.confidence||0)>(found[key].confidence||0))found[key]=value}renderOcrReview(type,found)}catch(error){set('ocrStatus',error?.message||'La capture n’a pas pu être lue. Essaie une image plus nette.')}
 finally{for(const id of ['parcelScreenshot','badgeScreenshot'])if($(id))$(id).disabled=false}
}
for(const [id,type] of [['parcelScreenshot','parcels'],['badgeScreenshot','badges']])$(id)?.addEventListener('change',event=>{const file=event.target.files?.[0];processScreenshot(file,type);event.target.value='' });
$('applyOcrValues')?.addEventListener('click',()=>{
 if(!pendingOcr)return;const fields=[...$('ocrDetectedValues').querySelectorAll('[data-ocr-field]')];for(const input of fields){const value=Number(input.value);if(!Number.isInteger(value)||value<0){set('ocrStatus','Vérifie les nombres : ils doivent être des entiers positifs ou nuls.');input.focus();return}}
 for(const input of fields){const target=$(input.dataset.ocrField);target.value=input.value;target.dispatchEvent(new Event('input',{bubbles:true}))}savePlayerProfile();calc();$('ocrReview').hidden=true;set('ocrStatus','Les valeurs vérifiées ont été appliquées et enregistrées dans ton profil.');pendingOcr=null;
});
$('cancelOcrReview')?.addEventListener('click',()=>{$('ocrReview').hidden=true;pendingOcr=null;set('ocrStatus','Import annulé. Ton profil n’a pas été modifié.')});
