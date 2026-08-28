(() => {
  const canvas = document.getElementById('game'), gameArea = document.querySelector('.canvas-wrap'), ctx = canvas.getContext('2d');
  const countEl = document.getElementById('apple-count'), bestEl = document.getElementById('best-score'), livesEl = document.getElementById('lives-count');
  const message = document.getElementById('game-message');
  const startButton = document.getElementById('start-button'), fullscreenButton = document.getElementById('fullscreen-button'), musicButton = document.getElementById('music-button'), music = document.getElementById('game-music'), loseSfx = document.getElementById('lose-sfx'), hitSfx = document.getElementById('hit-sfx'), pickupSfx = document.getElementById('pickup-sfx'), jumpSfx = document.getElementById('jump-sfx'), codeSfx = document.getElementById('code-sfx');
  const mobileLeft = document.getElementById('mobile-left'), mobileRight = document.getElementById('mobile-right');
  const sprites = { player: new Image(), apple: new Image(), stump: new Image() };
  const stumpSprite = document.createElement('canvas');
  const appleSprite = document.createElement('canvas');
  const isPortrait = window.matchMedia('(max-aspect-ratio:1 / 1)').matches, isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const MUSIC_VOLUME = .35, MUSIC_LOOP_LEAD = .8, MUSIC_FADE_MS = 220; let musicLooping = false;
  music.volume = MUSIC_VOLUME;
  const loopMusicEarly = () => {
    if (musicLooping || !Number.isFinite(music.duration) || music.duration <= MUSIC_LOOP_LEAD || music.currentTime < music.duration - MUSIC_LOOP_LEAD) return;
    musicLooping = true;
    if (music.muted) { music.currentTime=0; musicLooping=false; return; }
    const fadeOutStart = performance.now();
    const fadeOut = now => {
      if (music.paused) { music.volume=MUSIC_VOLUME; musicLooping=false; return; }
      const progress = Math.min(1, (now-fadeOutStart)/MUSIC_FADE_MS); music.volume=MUSIC_VOLUME*(1-progress);
      if (progress < 1) { requestAnimationFrame(fadeOut); return; }
      music.currentTime=0; const fadeInStart=performance.now();
      const fadeIn = nextNow => { if (music.paused) { music.volume=MUSIC_VOLUME; musicLooping=false; return; } const nextProgress=Math.min(1,(nextNow-fadeInStart)/MUSIC_FADE_MS); music.volume=MUSIC_VOLUME*nextProgress; if(nextProgress<1)requestAnimationFrame(fadeIn);else musicLooping=false; };
      requestAnimationFrame(fadeIn);
    };
    requestAnimationFrame(fadeOut);
  };
  music.addEventListener('timeupdate',loopMusicEarly);
  canvas.width = isPortrait ? 540 : 960; canvas.height = isPortrait ? 900 : 500;
  const APPLE_W = isPortrait ? 40 : 100, APPLE_H = isPortrait ? 32 : 79, STUMP_W = 105, STUMP_H = 89, GROUND_Y = isPortrait ? 560 : 449, APPLE_GROUND_Y = GROUND_Y - APPLE_H, PLAYER_W = isPortrait ? 90 : 70, PLAYER_H = isPortrait ? 107 : 83, PLAYER_GROUND_Y = GROUND_Y - PLAYER_H;
  let stumpReady = false, stumpBounds = null, appleReady = false, appleBounds = null;
  sprites.player.src = 'assets/chiikawa.png'; sprites.apple.src = 'assets/apple.png'; sprites.stump.src = 'assets/stump.png';
  sprites.apple.onload = () => { appleSprite.width=sprites.apple.naturalWidth; appleSprite.height=sprites.apple.naturalHeight; const appleCtx=appleSprite.getContext('2d'); appleCtx.drawImage(sprites.apple,0,0); const data=appleCtx.getImageData(0,0,appleSprite.width,appleSprite.height).data; let minX=appleSprite.width,minY=appleSprite.height,maxX=0,maxY=0; for(let y=0;y<appleSprite.height;y++) for(let x=0;x<appleSprite.width;x++) if(data[(y*appleSprite.width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)} appleBounds={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}; appleReady=true; if(!running)draw(); };
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
  const keys = {}; const easterEgg = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','Enter']; let easterEggIndex = 0, mobileEggTaps = 0, cheatMode = localStorage.getItem('chiikawa-30-lives') === 'true'; let raf, last = 0, running = false, score = 0, lives = 3, best = Number(localStorage.getItem('chiikawa-best') || 0), world = 0, touchMoveDirection = 0, touchMoveTime = 0, touchStart = null, invulnerable = 0;
  let player, items;
  bestEl.textContent = best;
  function reset(){ score=0; lives=cheatMode?30:3; world=0; invulnerable=0; music.currentTime=0; music.volume=MUSIC_VOLUME; loseSfx.currentTime=0; hitSfx.currentTime=0; pickupSfx.currentTime=0; jumpSfx.currentTime=0; codeSfx.currentTime=0; player={x:isPortrait?55:120,y:PLAYER_GROUND_Y,w:PLAYER_W,h:PLAYER_H,vy:0,onGround:true}; items=isPortrait?[{type:'apple',x:190,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'apple',x:285,y:-80,w:APPLE_W,h:APPLE_H,fallSpeed:300},{type:'stump',x:365,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:500,y:-45,w:APPLE_W,h:APPLE_H,fallSpeed:360},{type:'apple',x:630,y:APPLE_GROUND_Y-70,w:APPLE_W,h:APPLE_H},{type:'apple',x:740,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'stump',x:810,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:950,y:-70,w:APPLE_W,h:APPLE_H,fallSpeed:330},{type:'apple',x:1080,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'apple',x:1240,y:APPLE_GROUND_Y-70,w:APPLE_W,h:APPLE_H}]:[{type:'apple',x:390,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'apple',x:480,y:-90,w:APPLE_W,h:APPLE_H,fallSpeed:230},{type:'stump',x:570,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:720,y:-60,w:APPLE_W,h:APPLE_H,fallSpeed:260},{type:'apple',x:755,y:APPLE_GROUND_Y-70,w:APPLE_W,h:APPLE_H},{type:'apple',x:830,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'stump',x:900,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H},{type:'apple',x:1010,y:-75,w:APPLE_W,h:APPLE_H,fallSpeed:250},{type:'apple',x:1090,y:APPLE_GROUND_Y,w:APPLE_W,h:APPLE_H},{type:'stump',x:1270,y:GROUND_Y-STUMP_H,w:STUMP_W,h:STUMP_H}]; countEl.textContent=0; livesEl.textContent=lives; draw(); }
  const activateCheat = () => { cheatMode=true; localStorage.setItem('chiikawa-30-lives','true'); lives=30; livesEl.textContent=lives; codeSfx.currentTime=0; codeSfx.play().catch(()=>{}); };
  const playMusic = () => { if (!music.muted) music.play().catch(()=>{}); };
  function start(){ if(running)return; running=true; message.classList.add('hidden'); playMusic(); if(isPortrait&&isTouchDevice&&gameArea.requestFullscreen&&!document.fullscreenElement)gameArea.requestFullscreen().catch(()=>{}); last=performance.now(); raf=requestAnimationFrame(loop); }
  function jump(){if(running&&player.onGround){player.vy=-650;player.onGround=false;jumpSfx.currentTime=0;jumpSfx.play().catch(()=>{})}}
  function intersects(a,b){return a.x<a.w+b.x&&a.x+a.w>b.x&&a.y<a.h+b.y&&a.y+a.h>b.y}
  function loop(now){const dt=Math.min((now-last)/1000,.035);last=now; update(dt); loopMusicEarly(); draw();if(running)raf=requestAnimationFrame(loop)}
  function update(dt){const speed=260; if(invulnerable>0)invulnerable-=dt;if(keys.ArrowLeft)player.x-=speed*dt;if(keys.ArrowRight)player.x+=speed*dt;if(touchMoveTime>0){player.x+=touchMoveDirection*speed*dt;touchMoveTime-=dt}player.x=Math.max(20,Math.min(canvas.width-player.w-20,player.x));player.vy+=1500*dt;player.y+=player.vy*dt;if(player.y>=PLAYER_GROUND_Y){player.y=PLAYER_GROUND_Y;player.vy=0;player.onGround=true} world+=dt*(keys.ArrowRight||touchMoveDirection>0?90:45);items.forEach(o=>{o.x-=dt*120;if(o.type==='apple'&&o.fallSpeed){o.y=Math.min(APPLE_GROUND_Y,o.y+o.fallSpeed*dt);if(o.y>=APPLE_GROUND_Y)o.fallSpeed=0}});if(items[items.length-1].x<canvas.width-30){const type=Math.random()>.7?'stump':'apple',falling=type==='apple'&&Math.random()>.18;items.push({type,x:items[items.length-1].x+150+Math.random()*100,y:type==='stump'?GROUND_Y-STUMP_H:falling?-(isPortrait?45:60):(Math.random()>.45?APPLE_GROUND_Y:APPLE_GROUND_Y-(isPortrait?70:60)),w:type==='stump'?STUMP_W:APPLE_W,h:type==='stump'?STUMP_H:APPLE_H,fallSpeed:falling?(isPortrait?360:260):0})}const hitbox={x:player.x+18,y:player.y+14,w:player.w-30,h:player.h-18};for(const o of items){if(o.type==='apple'&&intersects(hitbox,o)){score++;o.got=true;pickupSfx.currentTime=0;pickupSfx.play().catch(()=>{});countEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;localStorage.setItem('chiikawa-best',best)}}if(o.type==='stump'&&!o.hit&&invulnerable<=0&&intersects(hitbox,{x:o.x+20,y:o.y+26,w:o.w-40,h:o.h-28})){o.hit=true;hitSfx.currentTime=0;hitSfx.play().catch(()=>{});lives--;livesEl.textContent=lives;canvas.classList.add('shake');setTimeout(()=>canvas.classList.remove('shake'),300);if(lives>0){player.x=isPortrait?55:120;player.y=PLAYER_GROUND_Y;player.vy=0;player.onGround=true;touchMoveDirection=0;touchMoveTime=0;invulnerable=1.15}else{running=false;music.pause();loseSfx.currentTime=0;loseSfx.play().catch(()=>{});cancelAnimationFrame(raf);message.querySelector('strong').textContent=`You collected ${score} apple${score===1?'':'s'}!`;message.querySelector('span:not(.message-emoji)').textContent='Out of lives · press Start to try again';startButton.textContent='Run again';message.classList.remove('hidden')}}}items=items.filter(o=>!o.got&&o.x>-160)}
  function draw(){const W=canvas.width,H=canvas.height,groundTop=isPortrait?460:420,hillY=isPortrait?360:275;ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c7ebd8');g.addColorStop(1,'#f6e9c9');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#a8d7ba';for(let i=0;i<(isPortrait?5:8);i++){const x=((i*(isPortrait?150:180)-world*.28)%(isPortrait?750:1100))-100;ctx.beginPath();ctx.arc(x,hillY,isPortrait?115:95,Math.PI,0);ctx.fill()}ctx.fillStyle='#8ccda7';ctx.fillRect(0,groundTop,W,H-groundTop);ctx.fillStyle='#76bb8d';for(let i=0;i<(isPortrait?12:18);i++){const x=((i*(isPortrait?55:75)-world)%(W+40));ctx.fillRect(x,groundTop,3,10)}items.forEach(o=>{if(o.x>W+20||o.x+o.w<0)return;if(o.type==='stump'&&stumpReady)ctx.drawImage(stumpSprite,stumpBounds.x,stumpBounds.y,stumpBounds.w,stumpBounds.h,o.x,o.y,o.w,o.h);else if(o.type==='apple'&&appleReady)ctx.drawImage(appleSprite,appleBounds.x,appleBounds.y,appleBounds.w,appleBounds.h,o.x,o.y,o.w,o.h)});ctx.save();ctx.translate(player.x,player.y);if(player.vy<0)ctx.rotate(-.08);ctx.drawImage(sprites.player,0,0,player.w,player.h);ctx.restore()}
  let mobileBurstTimer;
  const setMobileDirection = (direction,event) => { if (event.cancelable) event.preventDefault(); if (running) { touchMoveDirection=direction; touchMoveTime=Infinity; if (event.currentTarget.setPointerCapture && event.pointerId !== undefined) event.currentTarget.setPointerCapture(event.pointerId); } };
  const clearMobileDirection = event => { if (event.cancelable) event.preventDefault(); touchMoveDirection=0; touchMoveTime=0; };
  const releaseMobileDirection = event => { if (event.cancelable) event.preventDefault(); if (running && touchMoveTime===Infinity) { touchMoveTime=.28; clearTimeout(mobileBurstTimer); mobileBurstTimer=setTimeout(()=>{touchMoveDirection=0;touchMoveTime=0},350); } else { touchMoveDirection=0; touchMoveTime=0; } };
  const tapMobileDirection = direction => { if (running) { touchMoveDirection=direction; touchMoveTime=.28; clearTimeout(mobileBurstTimer); mobileBurstTimer=setTimeout(()=>{touchMoveDirection=0;touchMoveTime=0},350); } };
  [mobileLeft,mobileRight].forEach((button,directionIndex)=>{const direction=directionIndex===0?-1:1;button.addEventListener('pointerdown',e=>setMobileDirection(direction,e),{passive:false});button.addEventListener('pointerup',releaseMobileDirection,{passive:false});button.addEventListener('pointercancel',clearMobileDirection,{passive:false});button.addEventListener('click',()=>tapMobileDirection(direction));['contextmenu','selectstart','dragstart'].forEach(type=>button.addEventListener(type,e=>e.preventDefault()))});
  gameArea.addEventListener('touchstart',e=>{if(e.target.closest('.mobile-controls')||e.target.closest('button'))return;if(e.cancelable)e.preventDefault();const touch=e.changedTouches[0];touchStart={x:touch.clientX,y:touch.clientY}},{passive:false});
  gameArea.addEventListener('touchend',e=>{if(e.target.closest('.mobile-controls')||e.target.closest('button'))return;if(e.cancelable)e.preventDefault();if(!running){if(!message.classList.contains('hidden')){mobileEggTaps++;if(mobileEggTaps>=10){activateCheat();mobileEggTaps=0}}return}if(!touchStart)return;const touch=e.changedTouches[0],dx=touch.clientX-touchStart.x,dy=touch.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)<28&&Math.abs(dy)<28){jump();return}if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>28){touchMoveDirection=dx>0?1:-1;touchMoveTime=.55}},{passive:false});
  gameArea.addEventListener('touchcancel',e=>{touchStart=null;touchMoveDirection=0;touchMoveTime=0},{passive:false});
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) { await document.exitFullscreen?.(); return; }
    if (gameArea.requestFullscreen) {
      try { await gameArea.requestFullscreen(); return; } catch {}
    }
    document.body.classList.toggle('game-fullscreen');
    fullscreenButton.textContent=document.body.classList.contains('game-fullscreen')?'×':'⛶';
    fullscreenButton.setAttribute('aria-label',document.body.classList.contains('game-fullscreen')?'Exit fullscreen':'Enter fullscreen');
  };
  musicButton.addEventListener('click',()=>{music.muted=!music.muted;music.volume=MUSIC_VOLUME;musicButton.textContent=music.muted?'🔇':'🔊';musicButton.setAttribute('aria-label',music.muted?'Unmute music':'Mute music');if(!music.muted)playMusic()});
  fullscreenButton.addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',()=>{fullscreenButton.textContent=document.fullscreenElement?'×':'⛶';fullscreenButton.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen')});
  window.addEventListener('keydown',e=>{if(e.repeat)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(key===easterEgg[easterEggIndex]){easterEggIndex++;if(easterEggIndex===easterEgg.length){if(!running)activateCheat();easterEggIndex=0}}else easterEggIndex=key===easterEgg[0]?1:0;if(['ArrowUp','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key==='ArrowUp'||e.key===' ')jump()});window.addEventListener('keyup',e=>keys[e.key]=false);startButton.addEventListener('click',()=>{mobileEggTaps=0;reset();start()});reset();
})();
