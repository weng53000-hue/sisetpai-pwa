/*
  四色牌遊戲 (Four Color Cards Game)
  © 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
  All Rights Reserved.
  未經授權嚴禁複製、修改、散佈或商業使用。
*/
// BGM
let _bgmOn = false;
function _startBGM(){
  const a = document.getElementById('bgmAudio');
  if(!a) return;
  a.loop = true;
  a.volume = 1;
  a.play().catch(()=>{});
}
function bgmChoose(play){
  document.getElementById('bgmPrompt').classList.remove('show');
  sessionStorage.setItem('bgmAsked','1');
  if(play){
    _bgmOn = true;
    document.getElementById('bgmBtn').textContent = '🎵';
    _startBGM();
  }
}
function toggleBGM(){
  _bgmOn = !_bgmOn;
  const a = document.getElementById('bgmAudio');
  const btn = document.getElementById('bgmBtn');
  if(_bgmOn){ _startBGM(); }
  else { a.pause(); }
  btn.textContent = _bgmOn ? '🎵' : '🔇';
}
window.addEventListener('load', function(){
  _refreshInstallBtn();
  if(!sessionStorage.getItem('bgmAsked')){
    document.getElementById('bgmPrompt').classList.add('show');
  }
});
