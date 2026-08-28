(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const countEl = document.getElementById('apple-count'), bestEl = document.getElementById('best-score');
  const statusEl = document.getElementById('status'), message = document.getElementById('game-message');
  const startButton = document.getElementById('start-button'), resetButton = document.getElementById('reset-button');
  const mobileLeft = document.getElementById('mobile-left'), mobileRight = document.getElementById('mobile-right');
  const sprites = { player: new Image(), apple: new Image(), stump: new Image() };
  const stumpSprite = document.createElement('canvas');
  const isPortrait = window.matchMedia('(max-aspect-ratio:1 / 1)').matches;
  canvas.width = isPortrait ? 540 : 960; canvas.height = isPortrait ? 900 : 500;
  const APPLE_W = 186, APPLE_H = 147, STUMP_W = 105, STUMP_H = 89, GROUND_Y = isPortrait ? 820 : 449, PLAYER_W = isPortrait ? 90 : 70, PLAYER_H = isPortrait ? 107 : 83, PLAYER_GROUND_Y = GROUND_Y - PLAYER_H;
  let stumpReady = false, stumpBounds = null;
  sprites.player.src = 'assets/chiikawa.png'; sprites.apple.src = 'assets/apple.png'; sprites.stump.src = 'assets/stump.png';
  sprites.stump.onload = () => {
    stumpSprite.width = sprites.stump.naturalWidth; stumpSprite.height = sprites.stump.naturalHeight;
    const stumpCtx = stumpSprite.getContext('2d'); stumpCtx.drawImage(sprites.stump, 0, 0);
    const imageData = stumpCtx.getImageData(0, 0, stumpSprite.width, stumpSprite.height);
    const pixels = imageData.data, queue = [], seen = new Uint8Array(stumpSprite.width * stumpSprite.height);
    const isChecker = (i) => (pixels[i] === 238 && pixels[i + 1] === 238 && pixels[i + 2] === 238) || (pixels[i] === 255 && pixels[i + 1] === 255 && pixels[i + 2] === 255);
    for (let x = 0; x < stumpSprite.width; x++) { queue.push([x, 0]); queue.push([x, stumpSprite.height - 1]); }
    for (let y = 0; y < stumpSprite.height; y++) { queue.push([0, y]); queue.push([stumpSprite.width - 1, y]); }
    while (queue.length) { const [x, y] = queue.pop(); const pos = y * stumpSprite.width + x; if (x < 0 || y < 0 || x >= stumpSprite.width || y >= stumpSprite.height || seen[pos]) continue; seen[pos] = 1; const i = pos * 4; if (!isChecker(i)) continue; pixels[i + 3] = 0; queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    stumpCtx.putImageData(imageData, 0, 0);
    let minX = stumpSprite.width, minY = stumpSprite.height, maxX = 0, maxY = 0;
    for (let y = 0; y < stumpSprite.height; y++) for (let x = 0; x < stumpSprite.width; x++) { if (pixels[(y * stumpSprite.width + x) * 4 + 3] > 8) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); } }
    stumpBounds = {x:minX, y:minY, w:maxX-minX+1, h:maxY-minY+1}; stumpReady = true; if (!running) draw();
  };
  const keys = {}; let raf, last = 0, running = false, score = 0, best = Number(localStorage.getItem('chiikawa-best') || 0), world = 0, touchMoveDirection = 0, touchMoveTime = 0, touchStart = null;
  let player, items;
  bestEl.textContent = best;
  function reset(){ score=0; world=0; player={x:isPortrait?55:120,y:PLAYER_GROUND_Y,w:PLAYER_W,h:PLAYER_H,vy:0,onGround:true}; items=isPortrait?[{type:'apple',x:190,y:560,w:APPLE_W,h:APPLE_H},{type:'stump',x:365,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:630,y:480,w:APPLE_W,h:APPLE_H},{type:'stump',x:810,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:1080,y:600,w:APPLE_W,h:APPLE_H}]:[{type:'apple',x:390,y:310,w:APPLE_W,h:APPLE_H},{type:'stump',x:570,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:755,y:275,w:APPLE_W,h:APPLE_H},{type:'stump',x:900,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:1090,y:330,w:APPLE_W,h:APPLE_H},{type:'stump',x:1270,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H}]; countEl.textContent=0; statusEl.textContent='Ready to run'; draw(); }
  function start(){ if(running)return; running=true; message.classList.add('hidden'); statusEl.textContent='Running · collect apples'; last=performance.now(); raf=requestAnimationFrame(loop); }
  function jump(){if(running&&player.onGround){player.vy=-650;player.onGround=false}}
  function intersects(a,b){return a.x<a.w+b.x&&a.x+a.w>b.x&&a.y<a.h+b.y&&a.y+a.h>b.y}
  function loop(now){const dt=Math.min((now-last)/1000,.035);last=now; update(dt); draw();if(running)raf=requestAnimationFrame(loop)}
  function update(dt){const speed=260; if(keys.ArrowLeft)player.x-=speed*dt;if(keys.ArrowRight)player.x+=speed*dt;if(touchMoveTime>0){player.x+=touchMoveDirection*speed*dt;touchMoveTime-=dt}player.x=Math.max(20,Math.min(canvas.width-player.w-20,player.x));player.vy+=1500*dt;player.y+=player.vy*dt;if(player.y>=PLAYER_GROUND_Y){player.y=PLAYER_GROUND_Y;player.vy=0;player.onGround=true} world+=dt*(keys.ArrowRight||touchMoveDirection>0?90:45);items.forEach(o=>o.x-=dt*120);if(items[items.length-1].x<canvas.width-30){const type=Math.random()>.45?'stump':'apple';items.push({type,x:items[items.length-1].x+170+Math.random()*130,y:type==='stump'?GROUND_Y-STUMP_H:(Math.random()>.5?(isPortrait?500:300):(isPortrait?620:330)),w:type==='stump'?STUMP_W:APPLE_W,h:type==='stump'?STUMP_H:APPLE_H})}const hitbox={x:player.x+18,y:player.y+14,w:player.w-30,h:player.h-18};for(const o of items){if(o.type==='apple'&&intersects(hitbox,o)){score++;o.got=true;countEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('chiikawa-best',best)}}if(o.type==='stump'&&!o.hit&&intersects(hitbox,{x:o.x+15,y:o.y+18,w:o.w-30,h:o.h-18})){o.hit=true;running=false;cancelAnimationFrame(raf);statusEl.textContent='Run ended';message.querySelector('strong').textContent=`You collected ${score} apple${score===1?'':'s'}!`;message.querySelector('span:not(.message-emoji)').textContent='Press Start to try another run';startButton.textContent='Run again';message.classList.remove('hidden');canvas.classList.add('shake');setTimeout(()=>canvas.classList.remove('shake'),300)}}items=items.filter(o=>!o.got&&o.x>-160)}
  function draw(){const W=canvas.width,H=canvas.height,groundTop=isPortrait?760:420,hillY=isPortrait?590:275;ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c7ebd8');g.addColorStop(1,'#f6e9c9');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#a8d7ba';for(let i=0;i<(isPortrait?5:8);i++){const x=((i*(isPortrait?150:180)-world*.28)%(isPortrait?750:1100))-100;ctx.beginPath();ctx.arc(x,hillY,isPortrait?115:95,Math.PI,0);ctx.fill()}ctx.fillStyle='#8ccda7';ctx.fillRect(0,groundTop,W,H-groundTop);ctx.fillStyle='#76bb8d';for(let i=0;i<(isPortrait?12:18);i++){const x=((i*(isPortrait?55:75)-world)%(W+40));ctx.fillRect(x,groundTop,3,10)}items.forEach(o=>{if(o.x>W+20||o.x+o.w<0)return;if(o.type==='stump'&&stumpReady)ctx.drawImage(stumpSprite,stumpBounds.x,stumpBounds.y,stumpBounds.w,stumpBounds.h,o.x,o.y,o.w,o.h);else if(o.type!=='stump')ctx.drawImage(sprites[o.type],o.x,o.y,o.w,o.h)});ctx.save();ctx.translate(player.x,player.y);if(player.vy<0)ctx.rotate(-.08);ctx.drawImage(sprites.player,0,0,player.w,player.h);ctx.restore()}
  const setMobileDirection = (direction,event) => { if (event.cancelable) event.preventDefault(); if (running) { touchMoveDirection=direction; touchMoveTime=Infinity; } };
  const clearMobileDirection = event => { if (event.cancelable) event.preventDefault(); touchMoveDirection=0; touchMoveTime=0; };
  ['pointerdown','touchstart'].forEach(type=>{mobileLeft.addEventListener(type,e=>setMobileDirection(-1,e),{passive:false});mobileRight.addEventListener(type,e=>setMobileDirection(1,e),{passive:false})});
  ['pointerup','pointercancel','pointerleave','touchend','touchcancel'].forEach(type=>{mobileLeft.addEventListener(type,clearMobileDirection,{passive:false});mobileRight.addEventListener(type,clearMobileDirection,{passive:false})});
  canvas.addEventListener('touchstart',e=>{if(e.cancelable)e.preventDefault();const touch=e.changedTouches[0];touchStart={x:touch.clientX,y:touch.clientY}},{passive:false});
  canvas.addEventListener('touchend',e=>{if(e.cancelable)e.preventDefault();if(!running||!touchStart)return;const touch=e.changedTouches[0],dx=touch.clientX-touchStart.x,dy=touch.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)<28&&Math.abs(dy)<28){jump();return}if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>28){touchMoveDirection=dx>0?1:-1;touchMoveTime=.55}},{passive:false});
  canvas.addEventListener('touchcancel',e=>{touchStart=null;touchMoveDirection=0;touchMoveTime=0},{passive:false});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key==='ArrowUp'||e.key===' ')jump()});window.addEventListener('keyup',e=>keys[e.key]=false);startButton.addEventListener('click',()=>{reset();start()});resetButton.addEventListener('click',()=>{cancelAnimationFrame(raf);running=false;reset();message.querySelector('strong').textContent='Help Chiikawa gather apples!';message.querySelector('span:not(.message-emoji)').textContent='Press ↑ to jump · ← → to move';startButton.textContent='Start running';message.classList.remove('hidden')});reset();
})();
