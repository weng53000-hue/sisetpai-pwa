/*
  四色牌遊戲 (Four Color Cards Game)
  © 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
  All Rights Reserved.
  未經授權嚴禁複製、修改、散佈或商業使用。
*/
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(()=>console.log('SW registered')).catch(()=>{});
}
// PWA install prompt
let deferredPrompt;
function _refreshInstallBtn(){
  const btn=document.getElementById('installBtn');
  if(btn) btn.style.display=(!document.getElementById('home').classList.contains('hidden'))?'flex':'none';
}
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredPrompt=e;
  _refreshInstallBtn();
});
window.addEventListener('appinstalled',()=>{
  deferredPrompt=null;
  document.getElementById('installBtn').style.display='none';
});
function installApp(){
  if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.promise.then(()=>{deferredPrompt=null;});}
  else{ document.getElementById('iosHint').style.display='block'; }
}
