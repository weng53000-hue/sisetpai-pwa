/*
  四色牌遊戲 (Four Color Cards Game)
  © 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
  All Rights Reserved.
  未經授權嚴禁複製、修改、散佈或商業使用。
*/
/* ══════════════════════════════════════
   REAL FOUR COLOR CARD RULES IMPLEMENTATION
   4 colours × 7 suits × 4 copies = 112 cards
   ══════════════════════════════════════ */

// Green/White use: 將士象車馬包卒
// Red(orange)/Yellow use: 帥仕相俥傌炮兵
const SUITS_GW = ['將','士','象','車','馬','包','卒'];
const SUITS_RY = ['帥','仕','相','俥','傌','炮','兵'];
const COLORS = ['g','w','r','y'];
const COLOR_NAME = {g:'綠',w:'白',r:'紅',y:'黃'};
const COLOR_HEX = {g:'#2d8c2d',w:'#e8e0d0',r:'#d4520a',y:'#d4ac0d'};

// Suit groups for win checking
const SHUN_HIGH = {g:['將','士','象'],w:['將','士','象'],r:['帥','仕','相'],y:['帥','仕','相']}; // 2hu
const SHUN_LOW  = {g:['車','馬','包'],w:['車','馬','包'],r:['俥','傌','炮'],y:['俥','傌','炮']}; // 1hu
const JIANG = {g:'將',w:'將',r:'帥',y:'帥'};
const BING  = {g:'卒',w:'卒',r:'兵',y:'兵'};

function suitsFor(color){ return (color==='g'||color==='w') ? SUITS_GW : SUITS_RY; }

function createDeck(){
  const deck=[];
  for(const c of COLORS){
    for(const s of suitsFor(c)){
      for(let i=0;i<4;i++) deck.push({color:c,suit:s});
    }
  }
  return shuffle(deck);
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function cardKey(c){return c.color+'_'+c.suit;}

/* ── State ── */
let G = {
  deck:[], playerHand:[], cpuHand:[],
  playerMelds:[], playerMeldsAn:[], cpuMelds:[],
  topCard:null,
  turn:'player',      // 'player' | 'cpu'
  phase:'play',       // 'play' | 'eat' | 'discard'
  selectedIdx:-1,
  eatCandidates:[],   // indices in playerHand that form meld with topCard
  eatMeldType:null,
  hasDrawn:false,
  drewFromEmpty:false,
  mustDiscard:false,
  drawnCard:null,       // Rule 23：摸牌無法配對時限定只能出這張
  stagingCard:null,     // 待出牌區：摸牌後暫放此處，未入手中
  pScore:0, cScore:0,
  active:false,
};

/* ── Show screens ── */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('hidden',s.id!==id));
  _refreshInstallBtn();
  if(id!=='game'){
    clearTimeout(_tugTimer);_tugTimer=null;
    clearTimeout(_tugTimeout);_tugTimeout=null;
    if(_tugPhase>0){_tugPhase=0;const w=document.getElementById('tugWar');if(w)w.classList.remove('active');}
    _tugPrevTurn=null;
  }
}

/* ── New game ── */
function startNew(){ showSetup(); }
function startGameActual(scene,pattern){
  G.deck=createDeck();
  G.playerHand=[];G.cpuHand=[];
  G.playerMelds=[];G.cpuMelds=[];
  G.topCard=null;G.turn='player';G.phase='play';
  G.selectedIdx=-1;G.hasDrawn=false;G.drewFromEmpty=false;G.mustDiscard=false;G.drawnCard=null;G.stagingCard=null;G.playerMeldsAn=[];G.active=true;
  G.scene=scene||'default'; G.cardPattern=pattern||'none';
  // Deal 18 cards each
  for(let i=0;i<18;i++){G.playerHand.push(G.deck.pop());G.cpuHand.push(G.deck.pop());}
  sortHand(G.playerHand);
  // CPU auto-organizes obvious melds from initial hand
  cpuTryFormMelds();
  save(); show('game'); render();
  setTimeout(()=>notifyPlayer('👤','遊戲開始！','你先出牌，或先摸牌再出牌'), 400);
  toast('新遊戲開始！每人18張，湊8胡即可喊胡～');
}

function loadGame(){
  const s=localStorage.getItem('scp2');
  if(s){G=JSON.parse(s);G.active=true;if(G.drawnCard===undefined)G.drawnCard=null;if(G.stagingCard===undefined)G.stagingCard=null;if(!G.playerMeldsAn)G.playerMeldsAn=[];applySceneClasses(G.scene||'default',G.cardPattern||'none');show('game');render();toast('繼續上次牌局');}
}
function save(){localStorage.setItem('scp2',JSON.stringify(G));document.getElementById('contBtn').style.display='block';}
function pauseGame(){save();showModal('暫停',[{l:'繼續遊戲',c:'p',f:()=>{closeModal();show('game');}},{l:'回主頁',c:'s',f:()=>{closeModal();show('home');}},{l:'🗑️ 結束遊戲',c:'d',f:()=>endGame()}]);}
function endGame(){
  closeModal();
  G.active=false;
  localStorage.removeItem('scp2');
  document.getElementById('contBtn').style.display='none';
  applySceneClasses('default','none');
  show('home');
  toast('已結束本次牌局');
}

/* ── Sort hand ── */
function sortHand(h){
  h.sort((a,b)=>{
    const ci=COLORS.indexOf(a.color)-COLORS.indexOf(b.color);
    if(ci!==0)return ci;
    return suitsFor(a.color).indexOf(a.suit)-suitsFor(b.color).indexOf(b.suit);
  });
}

/* ── Player turn notification ── */
let _notifyTimer = null;
function notifyPlayer(icon, title, sub){
  const ov = document.getElementById('notifyOverlay');
  const ic = document.getElementById('notifyIcon');
  const tt = document.getElementById('notifyTitle');
  const sb = document.getElementById('notifySub');
  ic.textContent = icon;
  tt.textContent = title;
  sb.textContent = sub;
  ov.classList.remove('hidden');
  clearTimeout(_notifyTimer);
  _notifyTimer = setTimeout(()=> ov.classList.add('hidden'), 1800);
}

/* ── Tug-of-war idle animation ── */
let _tugTimer=null,_tugTimeout=null,_tugPhase=0,_tugPrevTurn=null;

function _tugCharInner(idx){
  const pat=(G&&G.cardPattern)?G.cardPattern:'none';
  const icons=CARD_ICONS[pat];
  if(icons&&icons[idx]!=null){
    const ico=icons[idx];
    return ico.startsWith('<svg')?ico:`<span>${ico}</span>`;
  }
  const scene=(G&&G.scene)?G.scene:'default';
  const sc={default:['🀄','🎴','🀄','🎴'],sports:['⚽','🏆','🥅','🎽'],toilet:['🚽','🧼','💩','🪥'],kochikame:['👮','🚔','⭐','🔫']};
  return `<span>${(sc[scene]||sc.default)[idx%4]}</span>`;
}
function _tugPopulate(){
  const tl=document.getElementById('tugTeamL'),tr=document.getElementById('tugTeamR');
  if(!tl||!tr) return;
  tl.innerHTML=[0,1].map(i=>`<div class="tug-char">${_tugCharInner(i)}</div>`).join('');
  tr.innerHTML=[2,3].map(i=>`<div class="tug-char">${_tugCharInner(i)}</div>`).join('');
}
function _schedTug(){
  clearTimeout(_tugTimer);_tugTimer=null;
  if(G&&G.active&&G.turn==='player') _tugTimer=setTimeout(_startTug,30000);
}
function resetTugTimer(){
  clearTimeout(_tugTimer);_tugTimer=null;
  if(_tugPhase>0&&_tugPhase<4){
    clearTimeout(_tugTimeout);_tugTimeout=null;
    _tugPhase=4;
    const tl=document.getElementById('tugTeamL'),tr=document.getElementById('tugTeamR');
    if(tl) tl.style.cssText='opacity:1;animation:tugWalkOutL .6s ease forwards;';
    if(tr) tr.style.cssText='opacity:1;animation:tugWalkOutR .6s ease forwards;';
    _tugTimeout=setTimeout(()=>{
      _tugPhase=0;
      const w=document.getElementById('tugWar');if(w) w.classList.remove('active');
      if(G&&G.active&&G.turn==='player') _schedTug();
    },700);
  } else if(_tugPhase===0){
    _schedTug();
  }
}
function _startTug(){
  if(_tugPhase!==0||!G||!G.active||G.turn!=='player') return;
  _tugPhase=1;
  _tugPopulate();
  const wrap=document.getElementById('tugWar'),tl=document.getElementById('tugTeamL'),tr=document.getElementById('tugTeamR'),knot=document.getElementById('tugKnot');
  if(!wrap||!tl||!tr||!knot){_tugPhase=0;return;}
  wrap.classList.add('active');
  tl.style.cssText='animation:tugWalkInL .9s ease forwards;';
  tr.style.cssText='animation:tugWalkInR .9s ease forwards;';
  knot.style.cssText='';
  _tugTimeout=setTimeout(()=>{
    if(_tugPhase!==1) return;
    _tugPhase=2;
    tl.style.cssText='transform:translateX(0);opacity:1;animation:tugPullL 1.1s ease-in-out infinite;';
    tr.style.cssText='transform:translateX(0);opacity:1;animation:tugPullR 1.1s ease-in-out infinite;';
    knot.style.cssText='animation:tugKnotPull 1.1s ease-in-out infinite;';
    _tugTimeout=setTimeout(()=>{
      if(_tugPhase!==2) return;
      _tugPhase=3;
      knot.style.cssText='';
      const winL=Math.random()<0.5;
      const winner=winL?tl:tr,loser=winL?tr:tl;
      loser.style.cssText=`opacity:1;animation:${winL?'tugFallR':'tugFallL'} .7s ease forwards;`;
      winner.style.cssText='transform:translateX(0);opacity:1;animation:tugBounce .5s ease 3;';
      _tugTimeout=setTimeout(()=>{
        if(_tugPhase!==3) return;
        _tugPhase=4;
        tl.style.cssText='opacity:1;animation:tugWalkOutL .8s ease forwards;';
        tr.style.cssText='opacity:1;animation:tugWalkOutR .8s ease forwards;';
        _tugTimeout=setTimeout(()=>{
          _tugPhase=0;
          wrap.classList.remove('active');
          _schedTug();
        },900);
      },3200);
    },3500);
  },1000);
}

/* ── Try form meld button ── */
function tryFormMeld(){
  // 待出牌區模式：摸牌 + 選取的手牌一起組合
  if(G.stagingCard){
    if(_selectedForMeld.length < 1){ toast('請先選取手牌才能與摸牌組合'); return; }
    const allCards = [G.stagingCard, ..._selectedForMeld.map(x => G.playerHand[x])];
    const t = meldTypeForMeld(allCards);
    if(t.valid){
      formMeldWithStaging([..._selectedForMeld], false);
    } else {
      toast('❌ 這幾張牌無法與摸牌組合，請重新選取');
      _selectedForMeld = [];
      G.selectedIdx = -1;
      render();
    }
    return;
  }
  if(_selectedForMeld.length < 2){ toast('請先選取 2 張以上的牌才能組合'); return; }
  const selCards = _selectedForMeld.map(x => G.playerHand[x]);
  const t = meldTypeForMeld(selCards);
  if(t.valid){
    formPlayerMeld([..._selectedForMeld], false);
  } else {
    toast('❌ 這幾張牌不能組合，請重新選取');
    _selectedForMeld = [];
    G.selectedIdx = -1;
    render();
  }
}

// Rule 20：暗胡按鈕觸發
function tryFormMeldAn(){
  // 待出牌區模式：摸牌 + 選取的手牌一起暗胡組合
  if(G.stagingCard){
    if(_selectedForMeld.length < 1){ toast('請先選取手牌才能與摸牌組合'); return; }
    const allCards = [G.stagingCard, ..._selectedForMeld.map(x => G.playerHand[x])];
    const t = meldTypeForMeld(allCards);
    if(t.valid){
      formMeldWithStaging([..._selectedForMeld], true);
    } else {
      toast('❌ 這幾張牌無法與摸牌組合，請重新選取');
      _selectedForMeld = [];
      G.selectedIdx = -1;
      render();
    }
    return;
  }
  if(_selectedForMeld.length < 2){ toast('請先選取 2 張以上的牌才能組合'); return; }
  const selCards = _selectedForMeld.map(x => G.playerHand[x]);
  const t = meldTypeForMeld(selCards);
  if(t.valid){
    formPlayerMeld([..._selectedForMeld], true);
  } else {
    toast('❌ 這幾張牌不能組合，請重新選取');
    _selectedForMeld = [];
    G.selectedIdx = -1;
    render();
  }
}

// 嚴格版 meldType：至少 2 張才算有效組合（不允許單張）
function meldTypeForMeld(cards){
  if(cards.length < 2) return {valid:false, ming:0, label:'需至少2張'};
  const t = meldType(cards);
  // 2張的情況：只有同色將帥二張(2胡) 或 兵卒配對 才算有效
  if(cards.length === 2){
    const [a,b] = cards;
    const isSameColorJiang = a.color===b.color && a.suit===b.suit && a.suit===JIANG[a.color];
    const isBingPair = a.suit===BING[a.color] && b.suit===BING[b.color];
    const isSameColorSame = a.color===b.color && a.suit===b.suit; // 同色同字二張（0胡有效）
    if(isSameColorJiang || isBingPair || isSameColorSame){
      return {valid:true, ming:t.ming, label:t.label};
    }
    return {valid:false, ming:0, label:'二張需同色同字或兵卒'};
  }
  // 3張以上：沿用 meldType 的結果，但必須是已知有效組合
  const validLabels = ['兵卒三張','兵卒四張','順子高','順子低','將帥三張','將帥四張','同色同字三張','同色同字四張','同色將帥二張','同色同字0胡'];
  if(validLabels.includes(t.label)){
    return {valid:true, ming:t.ming, label:t.label};
  }
  return {valid:false, ming:0, label:'無效組合'};
}

/* ── Render ── */
function render(){
  renderCpu(); renderPlayer(); renderTopCard(); renderMelds(); renderStagingArea();
  document.getElementById('pScore').textContent=G.pScore;
  document.getElementById('cScore').textContent=G.cScore;
  document.getElementById('deckCnt').textContent=G.deck.length+'張';
  // Dynamic turn badge
  let badgeText, badgeColor;
  if(G.turn==='player'){
    if(G.mustDiscard){
      badgeText='👤 吃牌後請打出一張';
      badgeColor='rgba(255,160,60,.95)';
    } else if(G.stagingCard){
      badgeText='🃏 已摸牌！選手牌組合或點待出牌出牌';
      badgeColor='rgba(255,220,100,.9)';
    } else if(G.hasDrawn){
      badgeText='👤 請出牌或組合';
      badgeColor='rgba(255,220,100,.9)';
    } else {
      badgeText='👤 請摸牌或放棄';
      badgeColor='rgba(255,220,100,.9)';
    }
  } else {
    badgeText='🤖 電腦思考中...';
    badgeColor='rgba(150,220,150,.9)';
  }
  const badge = document.getElementById('turnBadge');
  badge.textContent=badgeText;
  badge.style.color=badgeColor;
  badge.classList.toggle('player-turn', G.turn==='player');
  const phEnabled = G.turn==='player' && !G.mustDiscard && !G.hasDrawn;
  document.getElementById('drawBtn').classList.toggle('off',!phEnabled);
  // 放棄按鈕：未摸牌 OR（手牌空後才摸牌的drewFromEmpty狀態），且非mustDiscard，且無待出牌
  const handEmpty0 = G.playerHand.length===0 && calcHuWithHand(G.playerHand,G.playerMelds,G.playerMeldsAn)<8;
  const canGiveUp = G.turn==='player' && !G.mustDiscard && !G.stagingCard
                    && (!G.hasDrawn || G.drewFromEmpty) && !handEmpty0;
  document.getElementById('giveUpBtn').classList.toggle('off',!canGiveUp);
  const meldBtn=document.getElementById('meldBtn');
  // 待出牌區模式：至少選1張手牌即可顯示「與摸牌組合」；一般模式：至少選2張
  const canMeld = G.stagingCard
    ? (_selectedForMeld.length>=1 && G.turn==='player' && !G.mustDiscard)
    : (_selectedForMeld.length>=2 && G.turn==='player' && !G.mustDiscard);
  meldBtn.style.display=canMeld?'block':'none';
  meldBtn.textContent = G.stagingCard ? '與摸牌組合' : '組合';
  // Rule 20：暗胡按鈕：有效組合且 an > ming 時出現
  const anMeldBtn=document.getElementById('anMeldBtn');
  if(anMeldBtn){
    let showAn=false;
    if(canMeld){
      const selCards = G.stagingCard
        ? [G.stagingCard, ..._selectedForMeld.map(x=>G.playerHand[x])]
        : _selectedForMeld.map(x=>G.playerHand[x]);
      const t=meldTypeForMeld(selCards);
      showAn=t.valid && meldType(selCards).an>meldType(selCards).ming;
    }
    anMeldBtn.style.display=showAn?'block':'none';
  }
  const cancelSelBtn=document.getElementById('cancelSelBtn');
  cancelSelBtn.style.display=(_selectedForMeld.length>=1&&G.turn==='player')?'block':'none';
  checkHuBtn();
  // Tug-of-war timer: schedule on player turn, clear on cpu turn
  if(G.turn!==_tugPrevTurn){
    _tugPrevTurn=G.turn;
    if(G.turn==='player') _schedTug();
    else {clearTimeout(_tugTimer);_tugTimer=null;}
  }
}

function renderCpu(){
  const el=document.getElementById('cpuHand');
  el.innerHTML='';
  const n=G.cpuHand.length;
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='cback';
    if(i>0)d.style.marginLeft=n>16?'-12px':'-8px';
    d.textContent='牌';
    el.appendChild(d);
  }
}

function renderPlayer(){
  const el=document.getElementById('playerHand');
  el.innerHTML='';
  G.playerHand.forEach((c,i)=>{
    const inMeld=_selectedForMeld.includes(i);
    const isSel=G.selectedIdx===i;
    const isDrawn=G.drawnCard && c===G.drawnCard;  // Rule 23：摸到的牌高亮
    const d=document.createElement('div');
    d.className=`pcard clr-${c.color}${isSel||inMeld?' sel':''}${isDrawn?' drawn':''}`;
    if(inMeld&&!isSel) d.style.borderColor='rgba(255,220,100,.8)';
    d.innerHTML=`${getCardIconHTML(c.suit)}<span class="cs">${c.suit}</span><span class="cc">${COLOR_NAME[c.color]}</span>`;
    d.onclick=()=>selectCard(i);
    el.appendChild(d);
  });
}

function renderTopCard(){
  const el=document.getElementById('playZone');
  if(!G.topCard){el.innerHTML='<span style="color:rgba(255,255,255,.25);font-size:12px">出牌區</span>';document.getElementById('colorReq').innerHTML='';return;}
  const c=G.topCard;
  el.innerHTML=`<div class="top-card clr-${c.color}">${getCardIconHTML(c.suit)}<span class="tc-suit">${c.suit}</span><span class="tc-clr">${COLOR_NAME[c.color]}</span></div>`;
  document.getElementById('colorReq').innerHTML=
    `<div class="req-dot" style="background:${COLOR_HEX[c.color]}"></div><span>${COLOR_NAME[c.color]}色 ${c.suit}</span>`;
}

function renderMelds(){
  // Player melds (right side)
  const pm=document.getElementById('playerMelds');
  pm.innerHTML='';
  G.playerMelds.forEach((m,idx)=>{
    const isAn=G.playerMeldsAn&&G.playerMeldsAn[idx];
    const t=meldType(m);
    const row=document.createElement('div');
    row.className='meld-grp'+(isAn?' meld-an':'');
    if(isAn){
      // 暗胡：蓋牌顯示，每張牌背面加「暗」標（UI #4 fix：cards 包在橫排 wrapper 內）
      const cardRow=document.createElement('div');
      cardRow.className='meld-an-cards';
      m.forEach(()=>{
        const mc=document.createElement('div');
        mc.className='mc mc-an';
        mc.textContent='暗';
        cardRow.appendChild(mc);
      });
      row.appendChild(cardRow);
      // 暗胡台數標籤（在 column flex 的下一行）
      const badge=document.createElement('div');
      badge.className='meld-an-badge';
      badge.textContent=`${t.an}胡`;
      row.appendChild(badge);
    } else {
      m.forEach(c=>{
        const mc=document.createElement('div');
        mc.className=`mc clr-${c.color}`;mc.textContent=c.suit;
        row.appendChild(mc);
      });
    }
    pm.appendChild(row);
  });
  document.getElementById('playerHuN').textContent=calcHuWithHand(G.playerHand, G.playerMelds, G.playerMeldsAn);
  // 動態調整手牌區右側空間，避免被組合牌遮蓋
  requestAnimationFrame(()=>{
    const pw=document.getElementById('playerHandWrap');
    const pmEl=document.getElementById('playerMelds');
    if(pw&&pmEl) pw.style.paddingRight=pmEl.offsetWidth>0?(pmEl.offsetWidth+12)+'px':'0px';
  });

  // CPU melds
  const cm=document.getElementById('cpuMelds');
  cm.innerHTML='';
  G.cpuMelds.forEach(m=>{
    const row=document.createElement('div');row.className='meld-grp';
    m.forEach(c=>{
      const mc=document.createElement('div');
      mc.className=`mc clr-${c.color}`;mc.textContent=c.suit;
      row.appendChild(mc);
    });
    cm.appendChild(row);
  });
  document.getElementById('cpuHuN').textContent=calcHu(G.cpuMelds);
}

/* ── Staging area render ── */
function renderStagingArea(){
  const area = document.getElementById('stagingArea');
  const el   = document.getElementById('stagingCardEl');
  if(!area || !el) return;
  if(!G.stagingCard){
    area.classList.add('hidden');
    return;
  }
  area.classList.remove('hidden');
  const c = G.stagingCard;
  el.className = `rcard big clr-${c.color} staging-card-anim`;
  el.innerHTML = `${getCardIconHTML(c.suit)}<span class="rs">${c.suit}</span><span class="rc" style="font-size:8px">${COLOR_NAME[c.color]}</span>`;
}

/* ── Hu calculation ── */
function calcHu(melds){
  let hu=0;
  for(const m of melds){
    const t=meldType(m);
    hu+=t.ming; // simplified: count ming value
  }
  return hu;
}

function meldType(cards){
  if(cards.length===1){
    const c=cards[0];
    if(c.suit===JIANG[c.color]) return {ming:1,an:1,label:'將帥單張'};
    return {ming:0,an:0,label:'單張'};
  }
  if(cards.length===2){
    const [a,b]=cards;
    if(a.color===b.color && a.suit===b.suit && a.suit===JIANG[a.color]) return {ming:2,an:2,label:'同色將帥二張'};
    if(a.color===b.color && a.suit===b.suit) return {ming:0,an:0,label:'同色同字0胡'};
    return {ming:0,an:0,label:'無效'};
  }
  if(cards.length===3){
    const [a,b,c2]=cards;
    // 不同色兵卒
    const suits=cards.map(x=>x.suit);
    const isBing=cards.every(x=>x.suit===BING[x.color]);
    if(isBing) return {ming:3,an:3,label:'兵卒三張'};
    // same color
    if(a.color===b.color&&b.color===c2.color){
      const col=a.color;
      if(SHUN_HIGH[col]&&suits.sort().join()===SHUN_HIGH[col].slice().sort().join()) return {ming:2,an:2,label:'順子高'};
      if(SHUN_LOW[col]&&suits.sort().join()===SHUN_LOW[col].slice().sort().join()) return {ming:1,an:1,label:'順子低'};
      if(a.suit===b.suit&&b.suit===c2.suit&&a.suit===JIANG[col]) return {ming:4,an:6,label:'將帥三張'};
      if(a.suit===b.suit&&b.suit===c2.suit) return {ming:1,an:3,label:'同色同字三張'};
    }
    return {ming:0,an:0,label:'無效'};
  }
  if(cards.length===4){
    const [a,b,c2,d]=cards;
    const isBing4=cards.every(x=>x.suit===BING[x.color]);
    if(isBing4) return {ming:4,an:4,label:'兵卒四張'};
    if(a.color===b.color&&b.color===c2.color&&c2.color===d.color){
      const col=a.color;
      if(a.suit===b.suit&&b.suit===c2.suit&&c2.suit===d.suit&&a.suit===JIANG[col]) return {ming:8,an:10,label:'將帥四張'};
      if(a.suit===b.suit&&b.suit===c2.suit&&c2.suit===d.suit) return {ming:6,an:8,label:'同色同字四張'};
    }
    return {ming:0,an:0,label:'無效'};
  }
  return {ming:0,an:0,label:'?'};
}

// meldsAn：與 melds 同長度的 bool[]，true 表示該組為暗胡（計 .an 值）
function totalHu(melds, meldsAn){
  return melds.reduce((s,m,i)=>{
    const t=meldType(m);
    return s+(meldsAn&&meldsAn[i]?t.an:t.ming);
  },0);
}

// 判斷一張牌是否為將/帥
function isJiang(card){ return card.suit === JIANG[card.color]; }

// 計算含手中將/帥單牌的總胡數（每張未成組的將/帥算 1 胡）
function calcHuWithHand(hand, melds, meldsAn){
  let hu = totalHu(melds, meldsAn);
  hand.forEach(c => { if(isJiang(c)) hu += 1; });
  return hu;
}

// Rule 15：非將帥散牌必須「全部組合」或「全部成對」才能胡牌
// 成對條件：
//   ① 同色同字兩張（如 2張綠車）
//   ② 兵/卒可跨色成對（如 綠卒 + 紅兵）
function isHandClearForWin(hand) {
  const nonJiang = hand.filter(c => !isJiang(c));
  if (nonJiang.length === 0) return true;       // 手中全為將/帥，符合
  if (nonJiang.length % 2 !== 0) return false;  // 奇數張，無法全部成對

  const bingZu = nonJiang.filter(c => c.suit === BING[c.color]);
  const others  = nonJiang.filter(c => c.suit !== BING[c.color]);

  // 非兵卒牌：各 color+suit 組合必須為偶數張（同色同字成對）
  const counts = {};
  for (const c of others) {
    const key = c.color + '_' + c.suit;
    counts[key] = (counts[key] || 0) + 1;
  }
  if (Object.values(counts).some(n => n % 2 !== 0)) return false;

  // 兵卒牌：總數必須為偶數（可跨色成對）
  return bingZu.length % 2 === 0;
}

/* ══ SCENE & PATTERN SYSTEM ══ */
const SUIT_IDX = {'將':0,'帥':0,'士':1,'仕':1,'象':2,'相':2,'車':3,'俥':3,'馬':4,'傌':4,'包':5,'炮':5,'卒':6,'兵':6};
const SCENE_DEFAULT_PATTERN = {default:'none',sports:'none',toilet:'none',kochikame:'kochikame'};
const SCENE_DECO = {
  default:'',
  sports:`<div style="position:absolute;font-size:46px;opacity:.1;top:11%;left:3%">⚽</div><div style="position:absolute;font-size:30px;opacity:.1;top:58%;left:7%">🥅</div><div style="position:absolute;font-size:32px;opacity:.1;top:16%;right:4%">🏆</div><div style="position:absolute;font-size:26px;opacity:.1;bottom:17%;right:7%">👟</div><div style="position:absolute;font-size:24px;opacity:.1;bottom:34%;left:17%">🎽</div>`,
  toilet:`<div style="position:absolute;font-size:48px;opacity:.12;top:7%;left:2%">🚽</div><div style="position:absolute;font-size:32px;opacity:.12;top:27%;right:3%">🛁</div><div style="position:absolute;font-size:28px;opacity:.12;bottom:19%;left:7%">🚿</div><div style="position:absolute;font-size:30px;opacity:.12;bottom:9%;right:9%">🪥</div><div style="position:absolute;font-size:26px;opacity:.12;top:51%;left:15%">🧼</div><div style="position:absolute;font-size:38px;opacity:.1;top:5%;right:19%">💩</div><div style="position:absolute;font-size:22px;opacity:.1;bottom:31%;right:17%">🪣</div>`,
  kochikame:`<div style="position:absolute;font-size:46px;opacity:.1;top:13%;left:3%">👮</div><div style="position:absolute;font-size:36px;opacity:.1;bottom:19%;right:4%">🚔</div><div style="position:absolute;font-size:30px;opacity:.1;top:47%;left:9%">🔫</div><div style="position:absolute;font-size:28px;opacity:.1;top:9%;right:6%">⭐</div><div style="position:absolute;font-size:24px;opacity:.1;bottom:29%;left:5%">🏅</div>`
};
// Kochikame: 兩津/中川/秋本/大原/寺井/本田/磯鷺
const _KC=[
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="12" r="7" fill="#C8924A"/><rect x="2" y="3" width="16" height="6" rx="2.5" fill="#1565C0"/><rect x="1.5" y="7.5" width="17" height="2" fill="#0D47A1"/><rect x="5.5" y="10" width="3" height="1.2" rx=".6" fill="#3d1a00"/><rect x="11.5" y="10" width="3" height="1.2" rx=".6" fill="#3d1a00"/><circle cx="7.5" cy="12" r="1.2" fill="#1a0800"/><circle cx="12.5" cy="12" r="1.2" fill="#1a0800"/><path d="M7.5 15.5 Q10 17.5 12.5 15.5" stroke="#7a3a00" stroke-width="1" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="11.5" r="7" fill="#F5D5B0"/><ellipse cx="10" cy="4" rx="7" ry="3" fill="#1a1a1a"/><circle cx="7.5" cy="11.5" r="1.2" fill="#1a1a1a"/><circle cx="12.5" cy="11.5" r="1.2" fill="#1a1a1a"/><path d="M7.5 15 Q10 17 12.5 15" stroke="#c07060" stroke-width=".8" fill="none"/><path d="M5 18 L8 15.5 L10 17 L12 15.5 L15 18" fill="#1565C0"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="3.5" cy="12" rx="2" ry="5" fill="#8B4513"/><ellipse cx="16.5" cy="12" rx="2" ry="5" fill="#8B4513"/><circle cx="10" cy="11" r="7" fill="#FDDBB0"/><ellipse cx="10" cy="4.5" rx="5.5" ry="3.5" fill="#8B4513"/><circle cx="7.5" cy="11" r="1.1" fill="#1a0800"/><circle cx="12.5" cy="11" r="1.1" fill="#1a0800"/><path d="M7.5 14 Q10 16 12.5 14" stroke="#E8806A" stroke-width=".8" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="11" r="8" fill="#F5C898"/><ellipse cx="10" cy="3.5" rx="5" ry="2" fill="#e0b880"/><rect x="4" y="2.5" width="12" height="4" rx="2" fill="#1565C0"/><rect x="3" y="5.5" width="14" height="2" fill="#0D47A1"/><circle cx="7" cy="10.5" r="1.3" fill="#1a1a1a"/><circle cx="13" cy="10.5" r="1.3" fill="#1a1a1a"/><rect x="6.5" y="8.2" width="3" height=".9" rx=".4" fill="#5a2800"/><rect x="10.5" y="8.2" width="3" height=".9" rx=".4" fill="#5a2800"/><path d="M7 14 Q10 16 13 14" stroke="#a06850" stroke-width=".9" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="10" cy="11.5" rx="5.5" ry="7" fill="#F5D5B0"/><ellipse cx="10" cy="4.5" rx="4.5" ry="3" fill="#2a1800"/><circle cx="7.5" cy="11.5" r="1.1" fill="#1a1a1a"/><circle cx="12.5" cy="11.5" r="1.1" fill="#1a1a1a"/><path d="M8.5 8.5 L7.5 9.5" stroke="#6a3800" stroke-width=".8"/><path d="M11.5 8.5 L12.5 9.5" stroke="#6a3800" stroke-width=".8"/><path d="M8 14.5 Q10 13.5 12 14.5" stroke="#c09070" stroke-width=".8" fill="none"/><ellipse cx="16" cy="7" rx="1.2" ry="2" fill="#7ad4ff" opacity=".8"/><path d="M15.5 9 L15.8 11" stroke="#7ad4ff" stroke-width=".7" opacity=".8"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="11.5" r="7.5" fill="#F5D5B0"/><path d="M2.5 9 Q10 2 17.5 9" fill="#FF6000"/><rect x="2" y="7.5" width="16" height="4" rx="1.5" fill="#CC4000"/><rect x="3" y="9.5" width="14" height="2.5" rx="1" fill="#222"/><rect x="5" y="9.7" width="10" height="1.8" rx=".9" fill="#87CEEB" opacity=".7"/><circle cx="7.5" cy="14.5" r="1.2" fill="#1a1a1a"/><circle cx="12.5" cy="14.5" r="1.2" fill="#1a1a1a"/><path d="M8 17.5 Q10 19 12 17.5" stroke="#c09060" stroke-width=".8" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="11.5" r="7" fill="#F5D5B0"/><ellipse cx="10" cy="4.5" rx="5" ry="3.5" fill="#6B3A10"/><circle cx="7.5" cy="11.5" r="1.1" fill="#1a1a1a"/><circle cx="12.5" cy="11.5" r="1.1" fill="#1a1a1a"/><circle cx="6.5" cy="13.5" r=".6" fill="#E8A090"/><circle cx="13.5" cy="13.5" r=".6" fill="#E8A090"/><circle cx="5.5" cy="12.5" r=".5" fill="#E8A090"/><circle cx="14.5" cy="12.5" r=".5" fill="#E8A090"/><path d="M7.5 15.5 Q10 17.5 12.5 15.5" stroke="#c08070" stroke-width=".8" fill="none"/><rect x="4" y="17.5" width="12" height="2.5" rx="1" fill="#1565C0"/></svg>`
];
// PAW Patrol: Chase/Marshall/Rubble/Rocky/Zuma/Skye/Ryder
const _PP=[
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="2" width="15" height="6.5" rx="2.5" fill="#1565C0"/><rect x="1.5" y="7" width="17" height="2" fill="#0D47A1"/><circle cx="10" cy="13" r="7" fill="#C8924A"/><ellipse cx="10" cy="16.5" rx="3.5" ry="1.8" fill="#2a1800"/><circle cx="7.5" cy="11" r="1.3" fill="#1a0800"/><circle cx="12.5" cy="11" r="1.3" fill="#1a0800"/><ellipse cx="10" cy="8.5" rx="4" ry="1.5" fill="#2a1800"/><path d="M4 9 Q3 6 4.5 4" stroke="#C8924A" stroke-width="2.5" fill="none"/><path d="M16 9 Q17 6 15.5 4" stroke="#C8924A" stroke-width="2.5" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="2" width="14" height="6" rx="2" fill="#E53935"/><rect x="2" y="6.5" width="16" height="2" fill="#C62828"/><circle cx="10" cy="13" r="7" fill="#fff" stroke="#eee" stroke-width=".5"/><circle cx="7.5" cy="11.5" r="1.3" fill="#1a1a1a"/><circle cx="12.5" cy="11.5" r="1.3" fill="#1a1a1a"/><circle cx="6" cy="13.5" r="1" fill="#1a1a1a"/><circle cx="14" cy="13" r=".8" fill="#1a1a1a"/><circle cx="9.5" cy="9" r=".7" fill="#1a1a1a"/><circle cx="12" cy="8.5" r=".6" fill="#1a1a1a"/><path d="M7.5 16.5 Q10 18.5 12.5 16.5" stroke="#f0a0a0" stroke-width=".8" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 8.5 Q3 2 10 2 Q17 2 18 8.5" fill="#FF8F00"/><rect x="1.5" y="7.5" width="17" height="2.5" fill="#E65100"/><circle cx="10" cy="13" r="7" fill="#A0522D"/><ellipse cx="10" cy="10" rx="5" ry="2" fill="#7a3a10"/><circle cx="7.5" cy="12" r="1.5" fill="#1a0800"/><circle cx="12.5" cy="12" r="1.5" fill="#1a0800"/><ellipse cx="10" cy="16" rx="4" ry="2.5" fill="#7a3a10"/><ellipse cx="6.5" cy="16" rx="1.5" ry="1" fill="#fff"/><ellipse cx="13.5" cy="16" rx="1.5" ry="1" fill="#fff"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M4 7.5 Q5 2 10 2 Q15 2 16 7.5" fill="#388E3C"/><rect x="3" y="6.5" width="14" height="2.5" fill="#2E7D32"/><circle cx="10" cy="13" r="7" fill="#9E9E9E"/><circle cx="7.5" cy="12" r="1.2" fill="#2a2a2a"/><circle cx="12.5" cy="12" r="1.2" fill="#2a2a2a"/><ellipse cx="10" cy="15.5" rx="3" ry="1.8" fill="#757575"/><path d="M7.5 17 Q10 19 12.5 17" stroke="#a08060" stroke-width=".8" fill="none"/><path d="M4 9 Q3 6 4.5 4" stroke="#9E9E9E" stroke-width="2" fill="none"/><path d="M16 9 Q17 6 15.5 4" stroke="#9E9E9E" stroke-width="2" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="12" r="8" fill="#5D4037"/><circle cx="7.5" cy="11" r="1.3" fill="#1a0800"/><circle cx="12.5" cy="11" r="1.3" fill="#1a0800"/><ellipse cx="10" cy="15" rx="3.5" ry="1.8" fill="#3E2723"/><path d="M7.5 17 Q10 19 12.5 17" stroke="#a07060" stroke-width=".8" fill="none"/><rect x="4" y="15.5" width="12" height="4.5" rx="2" fill="#00ACC1"/><path d="M4 9 Q3 5 5 3" stroke="#5D4037" stroke-width="2.5" fill="none"/><path d="M16 9 Q17 5 15 3" stroke="#5D4037" stroke-width="2.5" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><ellipse cx="4" cy="6" rx="2.5" ry="4.5" fill="#E0B87A" transform="rotate(15 4 6)"/><ellipse cx="16" cy="6" rx="2.5" ry="4.5" fill="#E0B87A" transform="rotate(-15 16 6)"/><circle cx="10" cy="12" r="7" fill="#E0B87A"/><ellipse cx="7.5" cy="11.5" rx="2.5" ry="1.8" fill="#EC407A"/><ellipse cx="12.5" cy="11.5" rx="2.5" ry="1.8" fill="#EC407A"/><rect x="9.5" y="10.5" width="1" height="2" rx=".5" fill="#EC407A"/><circle cx="7.5" cy="11.5" r="1" fill="#1a0800"/><circle cx="12.5" cy="11.5" r="1" fill="#1a0800"/><path d="M7.5 15.5 Q10 17.5 12.5 15.5" stroke="#c09040" stroke-width=".8" fill="none"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 8 Q4 1.5 10 1.5 Q16 1.5 17 8" fill="#E53935"/><rect x="2" y="6.5" width="16" height="2.5" fill="#C62828"/><circle cx="10" cy="13" r="6.5" fill="#F5CBA0"/><ellipse cx="10" cy="7.5" rx="4.5" ry="2" fill="#8B5E3C"/><circle cx="7.5" cy="12.5" r="1.2" fill="#2a1800"/><circle cx="12.5" cy="12.5" r="1.2" fill="#2a1800"/><path d="M8 16 Q10 17.5 12 16" stroke="#c09060" stroke-width=".8" fill="none"/></svg>`
];
// Pikmin: 紅/黃/藍/紫/白/石/翅膀
const _PM=[
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2.5" x2="10" y2="6" stroke="#6B2800" stroke-width="1.5"/><ellipse cx="10" cy="2" rx="2.2" ry="1.3" fill="#7CFC00"/><circle cx="10" cy="13" r="7" fill="#E53935"/><ellipse cx="7.5" cy="10.5" rx="1.5" ry=".8" fill="#8B0000"/><ellipse cx="12.5" cy="10.5" rx="1.5" ry=".8" fill="#8B0000"/><circle cx="7.5" cy="12" r="1.5" fill="#fff"/><circle cx="12.5" cy="12" r="1.5" fill="#fff"/><circle cx="7.5" cy="12" r=".7" fill="#000"/><circle cx="12.5" cy="12" r=".7" fill="#000"/><ellipse cx="10" cy="17" rx="3.5" ry="2" fill="#C62828"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2.5" x2="10" y2="6" stroke="#8B6914" stroke-width="1.5"/><ellipse cx="10" cy="2" rx="2.2" ry="1.3" fill="#7CFC00"/><ellipse cx="3" cy="11" rx="2.3" ry="4" fill="#FDD835" transform="rotate(-10 3 11)"/><ellipse cx="17" cy="11" rx="2.3" ry="4" fill="#FDD835" transform="rotate(10 17 11)"/><circle cx="10" cy="13" r="6.5" fill="#FDD835"/><circle cx="7.5" cy="12.5" r="1.5" fill="#fff"/><circle cx="12.5" cy="12.5" r="1.5" fill="#fff"/><circle cx="7.5" cy="12.5" r=".7" fill="#000"/><circle cx="12.5" cy="12.5" r=".7" fill="#000"/><ellipse cx="10" cy="17" rx="3" ry="1.8" fill="#F9A825"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2.5" x2="10" y2="6" stroke="#1a3a7a" stroke-width="1.5"/><ellipse cx="10" cy="2" rx="2.2" ry="1.3" fill="#7CFC00"/><circle cx="10" cy="13" r="7" fill="#1976D2"/><circle cx="7.5" cy="12" r="1.5" fill="#fff"/><circle cx="12.5" cy="12" r="1.5" fill="#fff"/><circle cx="7.5" cy="12" r=".7" fill="#000"/><circle cx="12.5" cy="12" r=".7" fill="#000"/><ellipse cx="10" cy="16.5" rx="3" ry="2" fill="#0D47A1"/><ellipse cx="10" cy="15.5" rx="2.5" ry="1.5" fill="#42A5F5"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2" x2="10" y2="5" stroke="#4a1060" stroke-width="1.5"/><ellipse cx="10" cy="1.5" rx="2.2" ry="1.3" fill="#7CFC00"/><circle cx="10" cy="13" r="8.5" fill="#7B1FA2"/><circle cx="7" cy="12" r="1.8" fill="#fff"/><circle cx="13" cy="12" r="1.8" fill="#fff"/><circle cx="7" cy="12" r=".9" fill="#000"/><circle cx="13" cy="12" r=".9" fill="#000"/><ellipse cx="10" cy="18" rx="4.5" ry="2.5" fill="#6A1B9A"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2.5" x2="10" y2="6" stroke="#999" stroke-width="1.5"/><ellipse cx="10" cy="2" rx="2.2" ry="1.3" fill="#7CFC00"/><circle cx="10" cy="13" r="7" fill="#f8f8f8" stroke="#ccc" stroke-width=".5"/><circle cx="7.5" cy="12" r="1.5" fill="#E53935"/><circle cx="12.5" cy="12" r="1.5" fill="#E53935"/><circle cx="7.5" cy="12" r=".6" fill="#000"/><circle cx="12.5" cy="12" r=".6" fill="#000"/><ellipse cx="10" cy="17" rx="3" ry="2" fill="#e0e0e0"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="1.5" x2="10" y2="5" stroke="#555" stroke-width="1.5"/><ellipse cx="10" cy="1.2" rx="2.2" ry="1.3" fill="#7CFC00"/><path d="M3 14.5 Q2 8 5 6 Q8 3.5 12 4.5 Q16.5 4.5 17.5 9 Q18.5 13 17 15.5 Q15 19.5 10 19.5 Q5 19.5 3 14.5z" fill="#757575"/><path d="M5 8.5 Q7.5 6.5 9.5 7.5" stroke="#9E9E9E" stroke-width=".8" fill="none"/><path d="M11.5 6 Q14 5.5 16 7.5" stroke="#9E9E9E" stroke-width=".8" fill="none"/><circle cx="7.5" cy="12" r="1.5" fill="#fff"/><circle cx="12.5" cy="12" r="1.5" fill="#fff"/><circle cx="7.5" cy="12" r=".7" fill="#000"/><circle cx="12.5" cy="12" r=".7" fill="#000"/></svg>`,
  `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="2.5" x2="10" y2="6" stroke="#c06080" stroke-width="1.5"/><ellipse cx="10" cy="2" rx="2.2" ry="1.3" fill="#7CFC00"/><ellipse cx="3.5" cy="8.5" rx="3.5" ry="2" fill="rgba(180,220,255,.7)" transform="rotate(-20 3.5 8.5)"/><ellipse cx="16.5" cy="8.5" rx="3.5" ry="2" fill="rgba(180,220,255,.7)" transform="rotate(20 16.5 8.5)"/><circle cx="10" cy="13" r="6.5" fill="#F48FB1"/><circle cx="7.5" cy="12.5" r="1.4" fill="#fff"/><circle cx="12.5" cy="12.5" r="1.4" fill="#fff"/><circle cx="7.5" cy="12.5" r=".7" fill="#000"/><circle cx="12.5" cy="12.5" r=".7" fill="#000"/><ellipse cx="10" cy="17" rx="3" ry="2" fill="#E91E8C"/></svg>`
];
// Animals: 將帥/士仕/象相/車俥/馬傌/包炮/卒兵
const _AN=['🦁','🦊','🐘','🦬','🐴','🐸','🐣'];
const CARD_ICONS={kochikame:_KC,pawpatrol:_PP,pikmin:_PM,animals:_AN};

function getCardIconHTML(suit){
  const pat=G.cardPattern||'none';
  if(!pat||pat==='none'||pat==='zebra') return '';
  const icons=CARD_ICONS[pat];
  if(!icons) return '';
  const idx=SUIT_IDX[suit]??-1;
  if(idx<0||idx>=icons.length) return '';
  return `<div class="ci">${icons[idx]}</div>`;
}
function applySceneClasses(scene,pattern){
  const b=document.body;
  [...b.classList].filter(c=>c.startsWith('sc-')||c.startsWith('pat-')).forEach(c=>b.classList.remove(c));
  if(scene&&scene!=='default') b.classList.add('sc-'+scene);
  if(pattern==='zebra') b.classList.add('pat-zebra');
  const deco=document.getElementById('sceneDeco');
  if(deco) deco.innerHTML=SCENE_DECO[scene]||'';
}
let _setupScene='default',_setupPattern='none';
function showSetup(){
  _setupScene='default';_setupPattern='none';
  document.querySelectorAll('.scene-btn').forEach(b=>b.classList.toggle('active',b.dataset.scene==='default'));
  document.querySelectorAll('.pat-btn').forEach(b=>b.classList.toggle('active',b.dataset.pat==='none'));
  show('setupScreen');
}
function selectScene(s){
  _setupScene=s;
  document.querySelectorAll('.scene-btn').forEach(b=>b.classList.toggle('active',b.dataset.scene===s));
  selectPattern(SCENE_DEFAULT_PATTERN[s]||'none');
}
function selectPattern(p){
  _setupPattern=p;
  document.querySelectorAll('.pat-btn').forEach(b=>b.classList.toggle('active',b.dataset.pat===p));
}
function confirmSetup(){
  applySceneClasses(_setupScene,_setupPattern);
  startGameActual(_setupScene,_setupPattern);
}

/* ── Select & play card ── */
let _selectedForMeld = [];

function cancelSelection(){
  _selectedForMeld = [];
  G.selectedIdx = -1;
  render();
}

function selectCard(i){
  if(!G.active) return;
  if(G.turn!=='player') return;

  // 吃牌後必須打出一張
  if(G.mustDiscard){
    discardCard(i);
    return;
  }

  if(G.phase!=='play') return;

  // 待出牌區存在：只允許選手牌準備與摸牌組合，不可直接出手牌
  if(G.stagingCard){
    if(_selectedForMeld.includes(i)){
      _selectedForMeld = _selectedForMeld.filter(x => x !== i);
      G.selectedIdx = _selectedForMeld.length > 0 ? _selectedForMeld[_selectedForMeld.length-1] : -1;
    } else {
      _selectedForMeld.push(i);
      G.selectedIdx = i;
    }
    if(_selectedForMeld.length >= 1){
      const allCards = [G.stagingCard, ..._selectedForMeld.map(x => G.playerHand[x])];
      const t = meldTypeForMeld(allCards);
      if(t.valid && t.ming > 0){
        toast('已選 ' + allCards.map(c=>COLOR_NAME[c.color]+c.suit).join(' ') + ' → ' + t.ming + '胡，按「與摸牌組合」確認');
      } else if(t.valid){
        toast('已選 ' + allCards.map(c=>COLOR_NAME[c.color]+c.suit).join(' ') + '（有效組合），按「與摸牌組合」確認');
      } else {
        toast('繼續加牌或點待出牌區直接出牌');
      }
    } else {
      toast('選手牌後按「與摸牌組合」，或點待出牌區直接出牌');
    }
    render();
    return;
  }

  if(_selectedForMeld.includes(i)){
    if(_selectedForMeld.length === 1){
      // 單選再點同一張 → 出牌（需先摸牌或吃/碰後）
      if(!G.hasDrawn){
        toast('⚠️ 請先摸牌或放棄，才能出牌');
        return;
      }
      // Rule 23：摸牌後只能出摸進來的那張
      if(G.drawnCard && G.playerHand[i] !== G.drawnCard){
        const di = G.playerHand.indexOf(G.drawnCard);
        const dc = G.drawnCard;
        toast(`⚠️ 摸牌後只能出 ${COLOR_NAME[dc.color]}${dc.suit}，或組含摸牌的牌組`);
        return;
      }
      _selectedForMeld = [];
      G.selectedIdx = -1;
      playCard(i);
      return;
    } else {
      // 多選中取消這張
      _selectedForMeld = _selectedForMeld.filter(x => x !== i);
      G.selectedIdx = _selectedForMeld.length > 0 ? _selectedForMeld[_selectedForMeld.length-1] : -1;
    }
  } else {
    // 加入選取
    _selectedForMeld.push(i);
    G.selectedIdx = i;
  }

  // 顯示提示
  if(_selectedForMeld.length >= 2){
    const selCards = _selectedForMeld.map(x => G.playerHand[x]);
    const t = meldTypeForMeld(selCards);
    if(t.valid && t.ming > 0){
      toast('已選 ' + selCards.map(c=>COLOR_NAME[c.color]+c.suit).join(' ') + ' → ' + t.ming + '胡，按「組合」確認');
    } else if(t.valid){
      toast('已選 ' + selCards.map(c=>COLOR_NAME[c.color]+c.suit).join(' ') + '（有效組合），按「組合」確認');
    } else {
      toast('已選 ' + selCards.length + ' 張，繼續加牌或重新選取');
    }
  }

  render(); // 必須用完整 render 才能更新組合按鈕
}

function formPlayerMeld(idxs, isAn=false){
  resetTugTimer();
  const cards = idxs.map(i => G.playerHand[i]);
  // Rule 23：摸牌後，組合必須包含摸到的牌
  if(G.hasDrawn && G.drawnCard && !cards.includes(G.drawnCard)){
    const dc = G.drawnCard;
    toast(`⚠️ 摸牌後組合必須包含摸到的牌（${COLOR_NAME[dc.color]}${dc.suit}）`);
    return;
  }
  const t = meldType(cards);
  // Rule 20：暗胡僅在 an > ming 時有效，否則降為明胡
  const actualAn = isAn && t.an > t.ming;
  // Remove from hand (descending order to preserve indices)
  [...idxs].sort((a,b)=>b-a).forEach(i => G.playerHand.splice(i,1));
  G.playerMelds.push(cards);
  G.playerMeldsAn.push(actualAn);   // Rule 20：記錄是否暗胡
  _selectedForMeld = [];
  G.selectedIdx = -1;
  G.drawnCard = null;   // Rule 23：組合完成即解除摸牌限制
  sortHand(G.playerHand);
  const label = cards.map(c => COLOR_NAME[c.color]+c.suit).join(' ');
  if(actualAn){
    toast(`🀫 暗胡！${label} +${t.an}胡（暗）`);
  } else if(t.ming > 0){
    toast('✅ 組合完成！' + label + ' +' + t.ming + '胡');
  } else {
    toast('✅ 組合 ' + label + '（有效組合，不計胡）');
  }
  // 不自動胡牌，等玩家按「胡！」按鈕
  save(); render();
}

function playCard(i){
  const card=G.playerHand[i];
  G.playerHand.splice(i,1);
  G.topCard=card;
  G.selectedIdx=-1; _selectedForMeld=[]; G.hasDrawn=false; G.drewFromEmpty=false; G.drawnCard=null;
  sortHand(G.playerHand);
  save(); render();
  toast(`出牌：${COLOR_NAME[card.color]}${card.suit}`);
  G.turn='cpu'; render();
  setTimeout(()=>cpuCheckEat(),700);
}

function discardCard(i){
  const card=G.playerHand[i];
  G.playerHand.splice(i,1);
  G.topCard=card;
  G.mustDiscard=false;
  G.drawnCard=null;
  G.selectedIdx=-1;
  _selectedForMeld=[];
  sortHand(G.playerHand);
  G.turn='cpu';         // 先設回合再 render，防止胡牌按鈕瞬閃
  save();render();
  toast(`打出：${COLOR_NAME[card.color]}${card.suit}`);
  setTimeout(()=>cpuCheckEat(),700);
}

/* ── Give Up ── */
function playerGiveUp(){
  if(G.turn!=='player'||!G.active||G.mustDiscard) return;
  // 已摸牌但非「手牌空後摸牌」→ 不能放棄
  if(G.hasDrawn && !G.drewFromEmpty){toast('⚠️ 已摸牌，請出牌或組合');return;}
  // 手牌空且台數未達8，強制摸牌後才能放棄
  if(!G.hasDrawn && G.playerHand.length===0 && calcHuWithHand(G.playerHand,G.playerMelds,G.playerMeldsAn)<8){
    toast('⚠️ 手牌空且台數不足，請先摸牌');
    return;
  }
  resetTugTimer();
  _selectedForMeld=[];
  G.selectedIdx=-1;
  G.drewFromEmpty=false;
  G.drawnCard=null;
  G.turn='cpu';
  G.hasDrawn=false;
  save();render();
  toast('👋 玩家放棄，換電腦出牌');
  setTimeout(()=>cpuCheckEat(),700);
}

/* ── Draw ── */
function playerDraw(){
  if(G.turn!=='player'||!G.active||G.mustDiscard) return;
  if(G.hasDrawn||G.stagingCard){toast('本回合已摸牌');return;}
  resetTugTimer();
  if(G.deck.length===0){toast('牌堆已空！');return;}
  if(G.playerHand.length===0) G.drewFromEmpty=true;
  const c=G.deck.pop();

  // 待出牌區：牌不入手，先放暫存
  G.stagingCard=c;
  G.hasDrawn=true;
  G.drawnCard=null;

  // 判斷是否可與手牌配對/組合
  const cands=findEatCandidates(c, G.playerHand);
  save(); render();
  if(cands.length>0){
    toast(`摸牌：${COLOR_NAME[c.color]}${c.suit}　可配對！選手牌後按「與摸牌組合」，或點待出牌區出牌`);
    notifyPlayer('🃏','摸牌！','可與手牌配對，選手牌後組合，或點待出牌出牌');
  } else {
    toast(`摸牌：${COLOR_NAME[c.color]}${c.suit}　無法配對，請點待出牌區出牌`);
    notifyPlayer('🃏','無法配對！','請點選待出牌區出牌');
  }
}

/* ── 出待出牌 ── */
function playStagingCard(){
  if(!G.stagingCard||G.turn!=='player'||!G.active) return;
  const c=G.stagingCard;
  G.stagingCard=null;
  G.topCard=c;
  G.hasDrawn=false;
  G.drewFromEmpty=false;
  G.drawnCard=null;
  _selectedForMeld=[];
  G.selectedIdx=-1;
  save(); render();
  toast(`出牌：${COLOR_NAME[c.color]}${c.suit}`);
  G.turn='cpu'; render();
  setTimeout(()=>cpuCheckEat(),700);
}

/* ── 與待出牌組合 ── */
function formMeldWithStaging(handIdxs, isAn=false){
  if(!G.stagingCard) return;
  resetTugTimer();
  const handCards=handIdxs.map(i=>G.playerHand[i]);
  const allCards=[G.stagingCard,...handCards];
  const t=meldType(allCards);
  const actualAn=isAn && t.an>t.ming;
  // 移除手牌
  [...handIdxs].sort((a,b)=>b-a).forEach(i=>G.playerHand.splice(i,1));
  G.playerMelds.push(allCards);
  G.playerMeldsAn.push(actualAn);
  G.stagingCard=null;
  _selectedForMeld=[];
  G.selectedIdx=-1;
  sortHand(G.playerHand);
  const label=allCards.map(c=>COLOR_NAME[c.color]+c.suit).join(' ');
  if(actualAn) toast(`🀫 暗胡！${label} +${t.an}胡（暗）`);
  else if(t.ming>0) toast(`✅ 組合完成！${label} +${t.ming}胡`);
  else toast(`✅ 組合 ${label}（有效組合）`);
  // 若手牌仍有牌，需打出一張；若已空則直接換電腦
  if(G.playerHand.length>0){
    G.mustDiscard=true;
    save(); render();
    document.getElementById('discardHint').classList.remove('hidden');
  } else {
    save(); render();
    G.turn='cpu'; render();
    setTimeout(()=>cpuCheckEat(),700);
  }
}

/* ── Eat check ── */
function findEatCandidates(card, hand){
  /* 回傳所有可與 card 組成有效牌組的候選組合
     優先順序（index 0 = 最優先）：
     1. 開牌 (kai)  - 手中有3張同色同字 → 湊4張 → 最高胡數
     2. 對牌 (dui)  - 手中有2張同色同字 → 湊3張
     3. 吃牌 (chi)  - 手中有2張同色湊順子
     4. 兵卒 (bing) - 不同色兵卒湊組
  */
  const dui  = []; // 對牌 / 開牌 candidates（優先）
  const chi  = []; // 吃牌 candidates
  const bing = []; // 兵卒 candidates

  // ── 對牌 / 開牌：同色同字 ──
  const sameIdxs = hand.reduce((a,c2,i)=>{
    if(c2.color===card.color && c2.suit===card.suit) a.push(i);
    return a;
  }, []);
  // 開牌：手中3張 + 打出1張 = 4張
  if(sameIdxs.length >= 3){
    dui.push({type:'kai', priority:0,
      cards:[card, hand[sameIdxs[0]], hand[sameIdxs[1]], hand[sameIdxs[2]]],
      handIdxs:[sameIdxs[0], sameIdxs[1], sameIdxs[2]]});
  }
  // 對牌：手中2張 + 打出1張 = 3張
  if(sameIdxs.length >= 2){
    dui.push({type:'dui', priority:1,
      cards:[card, hand[sameIdxs[0]], hand[sameIdxs[1]]],
      handIdxs:[sameIdxs[0], sameIdxs[1]]});
  }
  // 對牌（2張）：手中1張 + 打出1張 = 2張同色同字（0胡有效組合）
  if(sameIdxs.length >= 1){
    dui.push({type:'pair', priority:2,
      cards:[card, hand[sameIdxs[0]]],
      handIdxs:[sameIdxs[0]]});
  }

  // ── 吃牌：同色順子 ──
  const shh = SHUN_HIGH[card.color];
  const shl = SHUN_LOW[card.color];
  if(shh && shh.includes(card.suit)){
    const need = shh.filter(s=>s!==card.suit);
    const idxs = findIndices(hand, card.color, need);
    if(idxs) chi.push({type:'shun_high', priority:3,
      cards:[card,...idxs.map(i=>hand[i])], handIdxs:idxs});
  }
  if(shl && shl.includes(card.suit)){
    const need = shl.filter(s=>s!==card.suit);
    const idxs = findIndices(hand, card.color, need);
    if(idxs) chi.push({type:'shun_low', priority:4,
      cards:[card,...idxs.map(i=>hand[i])], handIdxs:idxs});
  }

  // ── 兵卒：不同色兵卒組合 ──
  const isBing = card.suit === BING[card.color];
  if(isBing){
    const bIdxs = hand.reduce((a,c2,i)=>{
      if(c2.suit===BING[c2.color]) a.push(i);
      return a;
    }, []);
    if(bIdxs.length >= 2){
      bing.push({type:'bing3', priority:5,
        cards:[card, hand[bIdxs[0]], hand[bIdxs[1]]],
        handIdxs:[bIdxs[0], bIdxs[1]]});
    }
    if(bIdxs.length >= 1){
      bing.push({type:'bing2', priority:6,
        cards:[card, hand[bIdxs[0]]],
        handIdxs:[bIdxs[0]]});
    }
  }

  // 依優先順序合併：對牌/開牌 → 吃牌 → 兵卒
  return [...dui, ...chi, ...bing];
}

function findIndices(hand,color,suits){
  const used=[];
  for(const s of suits){
    const i=hand.findIndex((c,j)=>c.color===color&&c.suit===s&&!used.includes(j));
    if(i===-1) return null;
    used.push(i);
  }
  return used;
}

function findMeldForCard(card,hand){
  // Returns first valid meld or null
  const c=findEatCandidates(card,hand);
  return c.length>0?c[0]:null;
}

/* ── Player eat prompt ── */
let _eatChoice=null;
function promptEat(card){
  const cands = findEatCandidates(card, G.playerHand);
  if(cands.length === 0){ skipEat(); return; }

  // index 0 = 最高優先（對牌/開牌 > 吃牌 > 兵卒）
  _eatChoice = cands[0];

  // 判斷動作類型標題
  const typeLabels = {
    kai:       '🀄 開牌！（4張同色同字）',
    dui:       '🀄 對牌！（3張同色同字）',
    pair:      '🃏 對子（2張同色同字）',
    shun_high: '🃏 吃牌（順子：將士象）',
    shun_low:  '🃏 吃牌（順子：車馬包）',
    bing3:     '🃏 吃牌（兵卒3張）',
    bing2:     '🃏 吃牌（兵卒2張）',
  };
  const title = typeLabels[_eatChoice.type] || '吃牌？';

  // 渲染預覽牌
  const prev = document.getElementById('eatPreview');
  prev.innerHTML = '';
  _eatChoice.cards.forEach(c => {
    const d = document.createElement('div');
    d.className = `rcard clr-${c.color}`;
    d.innerHTML = `<span class="rs">${c.suit}</span><span class="rc" style="font-size:8px">${COLOR_NAME[c.color]}</span>`;
    prev.appendChild(d);
  });

  const t = meldType(_eatChoice.cards);
  const huText = t.ming > 0 ? `+${t.ming} 胡` : '有效組合（不計胡）';
  document.getElementById('eatMsg').textContent = `組合後 ${huText}，完成後需打出一張牌`;
  document.getElementById('eatTitle').textContent = title;

  // 如果有多個選項，通知玩家
  if(cands.length > 1){
    const types = cands.map(c=>typeLabels[c.type]||c.type).join(' / ');
    notifyPlayer('🀄', title.replace(/[🀄🃏]/g,'').trim(), `可選：${cands.length}種組合，顯示最優先`);
  } else {
    notifyPlayer('🀄', title.replace(/[🀄🃏]/g,'').trim(), huText);
  }

  document.getElementById('eatOverlay').classList.remove('hidden');
}

function doEat(){
  document.getElementById('eatOverlay').classList.add('hidden');
  if(!_eatChoice) return;
  // Remove hand cards used
  const toRemove=[..._eatChoice.handIdxs].sort((a,b)=>b-a);
  toRemove.forEach(i=>G.playerHand.splice(i,1));
  // Add meld & clear stale selection
  G.playerMelds.push(_eatChoice.cards);
  G.playerMeldsAn.push(false);          // Bug 1 fix：吃牌永遠是明胡，保持陣列同步
  _selectedForMeld = [];
  G.selectedIdx = -1;
  G.topCard=null;
  sortHand(G.playerHand);
  // 吃牌後不自動胡牌，改由 checkHuBtn() 顯示胡牌按鈕讓玩家自行選擇
  G.mustDiscard=true;
  G.turn='player';
  render();
  document.getElementById('discardHint').classList.remove('hidden');
  notifyPlayer('🍽️','吃牌成功！','請從手牌中打出一張牌');
  toast('吃牌成功！請打出一張牌');
}

function skipEat(){
  document.getElementById('eatOverlay').classList.add('hidden');
  _eatChoice = null;
  G.topCard = null;   // 不吃：清除場牌，保持玩家回合
  render();
  toast('👤 請摸牌或出牌');
}

/* ── CPU logic ── */
/* ── 電腦看門狗（Watchdog）── */
let _cpuWatchdog = null;
let _hammerTimer  = null;
const CPU_TIMEOUT  = 6000;  // 6秒無回應 → 自動叫醒
const HAMMER_DELAY = 3500;  // 3.5秒後顯示錘子按鈕

function _cpuWatchdogStart(){
  _cpuWatchdogClear();
  // 3.5秒後顯示錘子按鈕
  _hammerTimer = setTimeout(()=>{
    document.getElementById('hammerBtn').classList.add('show');
  }, HAMMER_DELAY);
  // 6秒後自動叫醒
  _cpuWatchdog = setTimeout(()=>{
    if(G.turn==='cpu' && G.active){
      console.warn('[Watchdog] CPU 無回應，自動叫醒');
      wakeUpCpu(true);  // true = 自動觸發
    }
  }, CPU_TIMEOUT);
}

function _cpuWatchdogClear(){
  clearTimeout(_cpuWatchdog);
  clearTimeout(_hammerTimer);
  _cpuWatchdog = null;
  _hammerTimer  = null;
  document.getElementById('hammerBtn').classList.remove('show');
}

function cpuThinkStart(){
  document.getElementById('thinking').classList.remove('hidden');
  _cpuWatchdogStart();
}
function cpuThinkEnd(){
  document.getElementById('thinking').classList.add('hidden');
  _cpuWatchdogClear();
}

/* 叫醒電腦 */
function wakeUpCpu(auto=false){
  _cpuWatchdogClear();
  cpuThinkEnd();
  // 強制交還玩家回合
  G.turn='player';
  G.hasDrawn=false;
  G.mustDiscard=false;
  G.drawnCard=null;
  G.topCard=null;
  _selectedForMeld=[];
  G.selectedIdx=-1;
  save(); render();
  if(auto){
    toast('⚙️ 電腦無回應，已自動恢復');
    notifyPlayer('⚙️','已自動恢復！','電腦回合逾時，輪到玩家出牌');
  } else {
    toast('🔨 咚！電腦被敲醒了，輪到玩家出牌');
    notifyPlayer('🔨','電腦被敲醒了！','輪到玩家出牌');
  }
}

function cpuCheckEat(){
  if(!G.active) return;
  if(!G.topCard){ cpuTurn(); return; }
  const card = G.topCard;
  const cands = findEatCandidates(card, G.cpuHand);
  // CPU always eats if it gets >= 1 ming-hu from the combo
  // findEatCandidates 已依優先順序排列（index 0 = 最高優先：對牌 > 吃牌 > 兵卒）
  const bestCand = cands.length > 0 ? cands[0] : null;

  if(bestCand && meldType(bestCand.cards).ming >= 1){
    cpuThinkStart();
    setTimeout(()=>{
      try{
      cpuThinkEnd();
      if(!G.active) return;
      // Eat the card
      const toRm = [...bestCand.handIdxs].sort((a,b)=>b-a);
      toRm.forEach(i => G.cpuHand.splice(i,1));
      G.cpuMelds.push(bestCand.cards);
      G.topCard = null;
      // Check win immediately
      if(checkWin(G.cpuHand, G.cpuMelds)){ cpuWins(); return; }
      // Must discard one card
      if(G.cpuHand.length > 0){
        const di = cpuChooseDiscard();
        const disc = G.cpuHand.splice(di,1)[0];
        G.topCard = disc;
        toast(`🤖 電腦吃牌，打出：${COLOR_NAME[disc.color]}${disc.suit}`);
      }
      if(checkWin(G.cpuHand, G.cpuMelds)){ cpuWins(); return; }
      G.turn='player'; G.hasDrawn=false; G.drewFromEmpty=false;
      save(); render();
      notifyPlayer('👤','換你了！','可摸牌、出牌或吃牌');
      // Check if player can eat CPU's discard
      if(G.topCard){
        const pCands = findEatCandidates(G.topCard, G.playerHand);
        if(pCands.length>0){
          setTimeout(()=>promptEat(G.topCard), 500);
        } else {
          G.topCard = null;
          render();
          toast('👤 輪到玩家出牌');
        }
      } else {
        toast('👤 輪到玩家出牌');
      }
      }catch(e){ console.error('[cpuCheckEat]',e); wakeUpCpu(true); }
    }, 1000);
  } else {
    cpuTurn();
  }
}

function cpuTurn(){
  if(!G.active || G.turn!=='cpu') return;
  // Clear center - player's card is no longer available (CPU chose not to eat)
  G.topCard = null;
  render();
  cpuThinkStart();
  setTimeout(()=>{
    try{
    cpuThinkEnd();
    if(!G.active) return;

    // Try to form melds from existing hand (simulate drawing)
    cpuTryFormMelds();

    // Check win
    if(checkWin(G.cpuHand, G.cpuMelds)){ cpuWins(); return; }

    // 手牌清空不等於勝利，必須胡數 >= 8
    if(G.cpuHand.length === 0 && checkWin(G.cpuHand, G.cpuMelds)){ cpuWins(); return; }
    if(G.cpuHand.length === 0){
      // ✅ 死鎖修復：手牌空但未達胡數 → 正常交還玩家回合
      G.turn='player'; G.hasDrawn=false; G.drewFromEmpty=false;
      save(); render();
      toast('👤 輪到玩家出牌');
      return;
    }
    const di = cpuChooseDiscard();
    const disc = G.cpuHand.splice(di,1)[0];
    G.topCard = disc;
    toast(`🤖 電腦出牌：${COLOR_NAME[disc.color]}${disc.suit}`);

    if(checkWin(G.cpuHand, G.cpuMelds)){ cpuWins(); return; }
    G.turn='player'; G.hasDrawn=false; G.drewFromEmpty=false;
    save(); render();
    notifyPlayer('👤','換你了！','可摸牌、出牌或吃牌');

    // Check if player can eat CPU's discard
    const pCands = findEatCandidates(disc, G.playerHand);
    if(pCands.length>0){
      setTimeout(()=>promptEat(disc), 500);
    } else {
      // Player can't eat - clear center so player starts fresh
      G.topCard = null;
      render();
      toast('👤 輪到玩家出牌');
    }
    }catch(e){ console.error('[cpuTurn]',e); wakeUpCpu(true); }
  }, 1400);
}

function cpuTryFormMelds(){
  // Repeatedly scan hand for completable melds
  let changed = true;
  let iterations = 0;
  while(changed && iterations < 10){
    changed = false; iterations++;
    for(let i=0; i<G.cpuHand.length; i++){
      const card = G.cpuHand[i];
      const rest = G.cpuHand.filter((_,j)=>j!==i);
      const cands = findEatCandidates(card, rest);
      const best = cands.reduce((b,c)=>{
        return (!b || meldType(c.cards).ming > meldType(b.cards).ming) ? c : b;
      }, null);
      if(best && meldType(best.cards).ming >= 1){
        // Form this meld
        const allIdxs = [i, ...best.handIdxs.map(j=> j>=i ? j+1 : j)].sort((a,b)=>b-a);
        // Safer: rebuild meld from original hand
        const meldCards = best.cards; // already has card + partners
        // Remove used cards from hand by matching
        let removed = 0;
        for(const mc of meldCards){
          const idx = G.cpuHand.findIndex(h=>h.color===mc.color&&h.suit===mc.suit);
          if(idx>=0){ G.cpuHand.splice(idx,1); removed++; }
        }
        if(removed === meldCards.length){
          G.cpuMelds.push(meldCards);
          changed = true;
          break;
        }
      }
    }
  }
}

function cpuChooseDiscard(){
  if(G.cpuHand.length===0) return 0;
  // Score each card: how useful it is (part of potential meld)
  let worst=-1, worstScore=999;
  G.cpuHand.forEach((c,i)=>{
    const rest = G.cpuHand.filter((_,j)=>j!==i);
    const potentialHu = findEatCandidates(c, rest).reduce((s,cd)=>s+meldType(cd.cards).ming,0);
    if(potentialHu < worstScore){ worstScore=potentialHu; worst=i; }
  });
  return worst>=0 ? worst : 0;
}

/* ── Win check ── */

/* ════════════════════════════
   胡牌規則
   ════════════════════════════
   可胡條件（同時滿足）：
   1. 輪到玩家且不在吃牌後棄牌狀態
   2. 已組合的牌組（melds）總胡數 >= 8
      （手中剩餘未組合的牌不影響判斷）
   必須：按下「胡！」按鈕才算胡牌
   ════════════════════════════ */

// 完整胡牌判斷（用於電腦自動勝利偵測）
function checkWin(hand, melds){
  return calcHuWithHand(hand, melds) >= 8;
}

// 更新胡牌按鈕顯示狀態（每次 render 都呼叫）
function checkHuBtn(){
  const btn = document.getElementById('huBtn');
  const hint = document.getElementById('discardHint');

  hint.classList.toggle('hidden', !G.mustDiscard);
  if(G.turn !== 'player' || !G.active){
    btn.classList.remove('show');
    btn.classList.remove('_notified');
    return;
  }

  const hu = calcHuWithHand(G.playerHand, G.playerMelds, G.playerMeldsAn);
  // Rule 15：非將帥散牌必須全部組合，或全部成對（同色同字 / 兵卒跨色）才能胡牌
  const handClear = isHandClearForWin(G.playerHand);

  // 胡牌按鈕顯示條件：組合區 + 手中將帥單牌 >= 8 胡，且非將帥牌已全部組合或成對
  // 吃牌後（mustDiscard=true）達條件同樣顯示，由玩家自行選擇胡牌或棄牌
  const wrap = document.getElementById('huBtnWrap');
  if(hu >= 8 && handClear){
    btn.classList.add('show');
    if(wrap) wrap.style.minHeight = '52px';
    // 胡牌按鈕出現時通知玩家
    if(!btn.classList.contains('_notified')){
      btn.classList.add('_notified');
      notifyPlayer('🀄','可以胡牌了！','按「胡牌！」按鈕宣告勝利');
    }
  } else {
    btn.classList.remove('show');
    btn.classList.remove('_notified');
    if(wrap) wrap.style.minHeight = '0';
  }
}

// 玩家按下「胡！」按鈕時呼叫
function declareHu(){
  if(!G.active) return;
  if(G.turn !== 'player'){ toast('❌ 現在是電腦的回合'); return; }
  // 吃牌後（mustDiscard=true）達條件仍可宣告胡牌，不再攔截
  // Rule 15：非將帥散牌必須全部組合或成對才能宣告胡牌
  if(!isHandClearForWin(G.playerHand)){
    toast('❌ 手中還有散牌未組合，請先組合或成對');
    return;
  }

  const hu = calcHuWithHand(G.playerHand, G.playerMelds, G.playerMeldsAn);

  if(hu >= 8){
    playerWins();
  } else {
    toast(`❌ 目前 ${hu} 胡（含手中將帥），還差 ${8 - hu} 胡才能胡牌！`);
  }
}

function playerWins(){
  G.active=false; G.pScore++;
  localStorage.removeItem('scp2');
  document.getElementById('contBtn').style.display='none';
  const hu = calcHuWithHand(G.playerHand, G.playerMelds, G.playerMeldsAn);
  showModal(`🎉 胡牌！${hu}胡`,[
    {l:'再來一局',c:'p',f:()=>{closeModal();startNew();}},
    {l:'回主頁',c:'s',f:()=>{closeModal();show('home');}}
  ],true);
}

function cpuWins(){
  G.active=false; G.cScore++;
  localStorage.removeItem('scp2');
  document.getElementById('contBtn').style.display='none';
  const hu = calcHuWithHand(G.cpuHand, G.cpuMelds);
  showModal(`😢 電腦胡牌（${hu}胡）\n下次加油！`,[
    {l:'再來一局',c:'p',f:()=>{closeModal();startNew();}},
    {l:'回主頁',c:'s',f:()=>{closeModal();show('home');}}
  ]);
}

/* ── Modal ── */
function showModal(title, btns, win=false){
  document.getElementById('mt').textContent=title;
  document.getElementById('mm').textContent='';
  const be=document.getElementById('mbtns');
  be.innerHTML='';
  btns.forEach(b=>{
    const el=document.createElement('button');
    el.className=`mbtn2 ${b.c}`;el.textContent=b.l;el.onclick=b.f;
    be.appendChild(el);
  });
  document.getElementById('mbox').className=win?'mbox win-anim':'mbox';
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal(){document.getElementById('modal').classList.add('hidden');}

/* ── Toast ── */
let _tt;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(_tt);
  _tt=setTimeout(()=>el.classList.add('hidden'),2400);
}

/* ── Init ── */
window.onload=()=>{
  const s=localStorage.getItem('scp2');
  if(s){try{const g=JSON.parse(s);if(g.active)document.getElementById('contBtn').style.display='block';}catch(e){}}
};
