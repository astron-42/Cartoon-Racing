// 卡通竞速 · 主循环 / 状态机 / 输入 / 声音 / 存档
// 状态机 (PRD R6): 选择中 select · 章节加载中 loading · 发车倒计时 countdown · 进行中 racing · 暂停中 paused · 结算中 results

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  accel: ['ArrowUp', 'KeyW'],
  brake: ['ArrowDown', 'KeyS'],
  pause: ['Escape', 'KeyP'],
  sound: ['KeyM'],
  restart: ['KeyR']
};

// 版面最小宽度 (见 shell.html 的 body/#app min-width:760px): 视口更窄时画面不压缩, 由文档横向滚动查看
const MIN_VIEW_W = 760;
function viewW(root) { return Math.max(MIN_VIEW_W, (root && root.clientWidth) || window.innerWidth); }
function viewH(root) { return (root && root.clientHeight) || window.innerHeight; }

class Engine {
  constructor(muted) {
    this.ctx = null;
    this.muted = !!muted;
  }
  ensure() {
    if (this.ctx) { this.resume(); return this.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 70;
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 71;
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(lp);
    lp.connect(master);
    // 振荡器等浏览器真的放行音频 (拿到用户手势) 再启动, 否则会在控制台反复刷
    // "The AudioContext was not allowed to start" 警告
    this.started = false;
    this.ctx = ctx; this.osc = osc; this.osc2 = osc2; this.engineGain = gain; this.lp = lp; this.master = master;
    this.resume();
    return ctx;
  }
  resume() {
    const c = this.ctx;
    if (!c) return;
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
    if (c.state === 'running' && !this.started) {
      try { this.osc.start(); this.osc2.start(); this.started = true; } catch (e) {}
    }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }
  update(speed, grass, active) {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') { this.resume(); if (this.ctx.state !== 'running') return; }
    const t = this.ctx.currentTime;
    const target = active ? 0.035 + Math.min(0.09, Math.abs(speed) / 340) : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.06);
    const f = 58 + Math.abs(speed) * 6.4;
    this.osc.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2.frequency.setTargetAtTime(f * (grass ? 1.6 : 1.01), t, 0.05);
    this.lp.frequency.setTargetAtTime(grass ? 420 : 1500, t, 0.08);
  }
  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    if (this.ctx.state !== 'running') return;   // 还没拿到音频权限就别开新振荡器, 免得控制台刷警告
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g);
    g.connect(this.master);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.25 : vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

class Game {
  constructor(root) {
    this.root = root;
    this.progress = this.loadProgress();
    this.sel = {
      vehicle: VEHICLES[this.progress.vehicle] ? this.progress.vehicle : DEFAULT_VEHICLE,
      chapter: this.progress.chapter || 'ch1'
    };
    this.keys = new Set();
    this.state = 'select';
    this.world = null;
    this.player = null;
    this.accum = 0;
    this.fps = 60;
    this.errors = [];
    this.prevLaps = 0;
    this.uiStep = 1;          // 发车准备向导的当前步骤 (1 章节 / 2 车辆)
    this.lastCount = null;
    this.muted = this.progress.muted === true;
    this.engine = new Engine(this.muted);
  }

  // ---------- 发车准备向导 (参照 Kâğıt Kart 的 4 步排版) ----------
  selectData() {
    return { vehicle: this.sel.vehicle, chapter: this.sel.chapter, step: this.uiStep };
  }
  openSelect(step) {
    if (typeof step === 'number') this.uiStep = Math.min(2, Math.max(1, step));
    this.state = 'select';
    this.hud.setRaceHudVisible(false);
    this.hud.screen('select', this.selectData());
  }
  // ← → 在当前步骤里切换选项
  cycleSel(dir) {
    if (this.uiStep === 1) {
      const keys = chapterKeys();   // 八章全部开放 (旧的"通关解锁"规则已删, 现在选章节是自由选择)
      let i = keys.indexOf(this.sel.chapter); i = (i + dir + keys.length) % keys.length;
      this.sel.chapter = keys[i];
      this.scene.setChapter(this.sel.chapter);
    } else {
      const vk = Object.keys(VEHICLES);
      let i = vk.indexOf(this.sel.vehicle); i = (i + dir + vk.length) % vk.length;
      this.sel.vehicle = vk[i];
    }
    this.saveProgress();
    this.openSelect();
  }
  confirmSel() {
    if (this.uiStep < 2) this.openSelect(this.uiStep + 1);
    else this.startRace();
  }
  // 菜单/结算界面的键盘操作: Enter 确认 · Esc 返回 · ← → 切换
  menuKeys(e) {
    const c = e.code;
    const enter = c === 'Enter' || c === 'NumpadEnter';
    this.engine.ensure();
    if (this.state === 'select') {
      if (enter) { this.confirmSel(); return true; }
      if (c === 'Escape') { if (this.uiStep > 1) this.action('prevstep'); return true; }
      if (c === 'ArrowLeft') { this.cycleSel(-1); return true; }
      if (c === 'ArrowRight') { this.cycleSel(1); return true; }
      return false;
    }
    if (this.state === 'results' && enter) { this.startRace(); return true; }
    if (this.state === 'help' || this.state === 'records') {
      if (enter || c === 'Escape') { this.action('back'); return true; }
    }
    return false;
  }

  loadProgress() {
    try { return JSON.parse(localStorage.getItem('paper-racing/progress') || '{}') || {}; }
    catch (e) { return {}; }
  }
  saveProgress() {
    this.progress.vehicle = this.sel.vehicle;
    this.progress.chapter = this.sel.chapter;
    this.progress.muted = this.muted;
    try { localStorage.setItem('paper-racing/progress', JSON.stringify(this.progress)); } catch (e) {}
  }

  boot() {
    this.diagEl = document.getElementById('diag');
    try {
      this.bootInner();
    } catch (e) {
      this.reportError(e, 'boot');
    }
  }

  bootInner() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(viewW(this.root), viewH(this.root));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.root.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.trackKey = chapterByKey(this.sel.chapter).layout || 'valley';
    this.track = buildTrack(this.trackKey);
    const mid = this.track.sample(this.track.total * 0.5);
    this.trackCenter = { x: mid.x, z: mid.z };
    this.scene = new PaperScene({ track: this.track, renderer: renderer, chapter: this.sel.chapter, quality: 'high' });
    this.hud = new Hud(this.root, {
      track: this.track,
      sel: this.sel,
      progress: this.progress,
      onAction: (a, v) => this.action(a, v)
    });
    this.hud.setRaceHudVisible(false);
    this.bindInput();
    const self = this;
    window.addEventListener('resize', function () {
      const w = viewW(self.root), h = viewH(self.root);
      renderer.setSize(w, h);
      self.scene.resize(w, h);
    });
    window.addEventListener('error', function (e) {
      self.reportError(e.error || e.message || e);
    });
    window.__game = this;
    const hash = location.hash + location.search;
    this.demo = /auto|demo/.test(hash);
    // 2026-10 改版: 删掉「翻书」这一步, 打开页面直接进发车准备向导
    this.state = 'select';
    const ms = /step=(\d)/.exec(hash);
    this.openSelect(ms ? parseInt(ms[1], 10) : 1);
    if (!/auto|diag|records/.test(hash) && this.diagEl) this.diagEl.style.display = 'none';
    if (/records/.test(hash)) this.hud.screen('records', {});
    if (/help/.test(hash)) this.hud.screen('help');
    if (/flow/.test(hash)) {
      // 调试: 自动走一遍发车准备向导 (章节 -> 车辆 -> 发车), 结果写进诊断行
      const self = this;
      const fch = hash.match(/ch=?(ch\d)/);   // #flow&ch=ch5: 从第 5 章开始走向导, 用来验证换章换赛道/换小地图
      if (fch && CHAPTERS.some(c => c.key === fch[1])) {
        self.sel.chapter = fch[1];
        self.scene.setChapter(fch[1]);
        self.hud.screen('select', self.selectData());
      }
      let guard = 0;
      const tick = setInterval(function () {
        guard++;
        if (guard > 60) { clearInterval(tick); return; }
        if (self.state === 'select') { self.confirmSel(); return; }
        if (self.state === 'countdown' || self.state === 'racing' || self.state === 'results') {
          clearInterval(tick);
          if (self.diagEl) {
            self.diagEl.style.display = 'block';
            var line = 'flow OK state=' + self.state + ' chapter=' + self.sel.chapter + ' vehicle=' + self.sel.vehicle;
            self.diagEl.setAttribute('data-flow', line);   // 诊断行每帧会被 updateDiag 覆盖, 用属性留存
            self.diagEl.textContent = line;
          }
        }
      }, 300);
    }
    if (/auto/.test(hash)) {
      this.sel.vehicle = /grip/.test(hash) ? 'grip' : (/rush/.test(hash) ? 'rush' : DEFAULT_VEHICLE);
      const cm = hash.match(/ch=?(ch\d)/);
      this.sel.chapter = cm ? cm[1] : 'ch1';
      if (!CHAPTERS.some(c => c.key === this.sel.chapter)) this.sel.chapter = CHAPTERS[0].key;
      this.hud.screen(null);
      this.startRace();
      if (/intro/.test(hash)) this.introHold = 999;
      if (/noin/.test(hash)) { this.introHold = 0; this.hud.screen(null); }   // 调试: 跳过序章卡片
      const wm = hash.match(/warp=(\d+)/);
      if (wm) this.warp(parseInt(wm[1], 10));
      if (/pause/.test(hash)) this.pause();
    }
    if (/press=(\d+)/.test(hash)) {
      // 调试: 用真实键盘事件走一遍「打开页面 → ← → 选章节 → Enter → Enter 发车」
      // (= 玩家在浏览器里的操作路径), 用来验证换章后小地图/赛道是否跟着换
      const self = this;
      const presses = parseInt(RegExp.$1, 10);
      let k = 0;
      const t = setInterval(function () {
        if (k < presses) {
          k++;
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
          return;
        }
        clearInterval(t);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));   // 步骤1 → 步骤2
        setTimeout(function () {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); // 步骤2 → 发车
          if (/noin/.test(hash)) { self.introHold = 0; self.hud.screen(null); }
          const wm = hash.match(/warp=(\d+)/);
          if (wm) self.warp(parseInt(wm[1], 10));
        }, 300);
      }, 200);
    }
    const loop = function (t) {
      try {
        self.frame(t);
      } catch (e) {
        self.reportError(e, 'frame');
      }
      self.rafId = requestAnimationFrame(loop);
    };
    this.lastT = performance.now();
    requestAnimationFrame(loop);
  }

  bindInput() {
    const self = this;
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (self.menuKeys(e)) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
        return;
      }
      self.keys.add(e.code);
      if (KEYMAP.pause.indexOf(e.code) >= 0) {
        if (self.state === 'racing') self.pause(); else if (self.state === 'paused') self.resume();
      } else if (KEYMAP.sound.indexOf(e.code) >= 0) {
        self.muted = !self.muted;
        self.engine.setMuted(self.muted);
        self.saveProgress();
        self.hud.toast(self.muted ? '静音' : '声音开');
      } else if (KEYMAP.restart.indexOf(e.code) >= 0) {
        if (self.state === 'racing' || self.state === 'paused' || self.state === 'results') self.startRace();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
      self.engine.ensure();
    });
    window.addEventListener('keyup', function (e) { self.keys.delete(e.code); });
    window.addEventListener('blur', function () { self.keys.clear(); });
  }

  action(a, v) {
    if (a === 'records') { this.hud.screen('records', {}); return; }
    if (a === 'mute') {
      this.muted = !this.muted;
      this.engine.setMuted(this.muted);
      this.saveProgress();
      this.hud.toast(this.muted ? '静音' : '声音开');
      if (this.state === 'paused') this.hud.screen('pause', { muted: this.muted });
      return;
    }
    if (a === 'step') { this.openSelect(parseInt(v, 10) || 1); return; }
    if (a === 'nextstep') { this.confirmSel(); return; }
    if (a === 'prevstep') {
      if (this.state === 'select') {
        if (this.uiStep > 1) this.openSelect(this.uiStep - 1);
      } else this.action('back');
      return;
    }
    if (a === 'vehicle') { if (VEHICLES[v]) { this.sel.vehicle = v; this.saveProgress(); this.openSelect(2); } return; }
    if (a === 'chapter') {
      if (chapterKeys().indexOf(v) < 0) return;   // 八章全开, 只挡非法值
      this.sel.chapter = v;
      this.scene.setChapter(this.sel.chapter);
      this.saveProgress();
      this.openSelect(2);
      return;
    }
    if (a === 'start') { this.startRace(); return; }
    if (a === 'help') { this.hud.screen('help'); this.helpReturn = this.state; return; }
    if (a === 'back') {
      if (this.state === 'select') { this.openSelect(); return; }
      this.hud.screen(this.state === 'racing' || this.state === 'paused' ? 'pause' : 'select', this.sel);
      return;
    }
    if (a === 'resume') { this.resume(); return; }
    if (a === 'again') { this.startRace(); return; }
    if (a === 'next') {
      const keys = chapterKeys();
      const i = keys.indexOf(this.sel.chapter);
      this.sel.chapter = keys[Math.min(keys.length - 1, i + 1)];
      this.saveProgress();
      this.startRace();
      return;
    }
    if (a === 'select') { this.teardown(); this.openSelect(2); return; }
    if (a === 'chapters') { this.teardown(); this.openSelect(1); return; }
  }

  teardown() {
    for (const g of this.scene.kartMeshes.values()) this.scene.scene.remove(g);
    this.scene.kartMeshes.clear();
    this.world = null;
    this.player = null;
    this.engine.update(0, false, false);
  }

  startRace(chapterKey) {
    if (chapterKey) this.sel.chapter = chapterKey;
    const lk = chapterByKey(this.sel.chapter).layout || 'valley';
    if (lk !== this.trackKey) {
      this.trackKey = lk;
      this.track = buildTrack(lk);
      const mid = this.track.sample(this.track.total * 0.5);
      this.trackCenter = { x: mid.x, z: mid.z };
      this.scene.setTrack(this.track);
    }
    // 小地图始终按「本场比赛真正使用的赛道」重画, 并在卡片上标出章节名,
    // 这样界面上的形状与赛道上跑的形状必然一致, 也不会认不出是哪一章
    this.hud.setTrack(this.track);
    const chOfRace = chapterByKey(this.sel.chapter);
    this.hud.setMapLabel('第 ' + (CHAPTERS.indexOf(chOfRace) + 1) + ' 章 · ' + chOfRace.name);
    this.teardown();
    // 玩家每一场随机抽一位车手外观 (只有外观, 没有数值)
    this.sel.racer = RACERS[Math.floor(Math.random() * RACERS.length) % RACERS.length].key;
    this.world = new World({
      track: this.track,
      vehicle: this.sel.vehicle,
      racer: this.sel.racer,
      chapter: this.sel.chapter,
      seed: 1 + Math.floor(Math.random() * 99999),
      laps: RACE.laps
    });
    this.player = this.world.karts[0];
    for (const k of this.world.karts) this.scene.createKart(k);
    this.scene.setChapter(this.sel.chapter);
    const p = this.player;
    const h = p.heading;
    this.scene.camPos.set(p.x - Math.sin(h) * 9, 4.2, p.z - Math.cos(h) * 9);
    this.scene.camLook.set(p.x, 1, p.z);
    this.state = 'countdown';
    this.accum = 0;
    this.finishHold = -1;
    this.prevLaps = 0;
    this.lastCount = null;
    this.hud.setRaceHudVisible(true);
    const ch = chapterByKey(this.sel.chapter);
    this.introHold = 2.6;
    const veh = vehicleByKey(this.sel.vehicle);
    this.hud.screen('intro', {
      name: ch.name,
      desc: ch.desc || '',
      index: CHAPTERS.indexOf(ch) + 1,
      vehicleLabel: veh.name,
      trackName: ch.trackName || ''
    });
    this.engine.ensure();
    this.engine.resume();
    this.saveProgress();
  }

  // 调试用: 以固定步长快进 N 秒 (截图/回归用, 不影响正常游玩)
  warp(seconds) {
    if (!this.world) return;
    const n = Math.min(60 * 60 * 10, Math.round(seconds / RACE.dt));
    for (let i = 0; i < n; i++) {
      this.applyInput();
      this.world.step(RACE.dt);
      this.tickRace();
      if (this.state !== 'racing' && this.state !== 'countdown') break;
    }
    this.accum = 0;
  }

  pause() {
    if (this.state !== 'racing' && this.state !== 'countdown') return;
    this.pausePrev = this.state;
    this.state = 'paused';
    this.hud.screen('pause', { muted: this.muted });
  }
  resume() {
    if (this.state !== 'paused') return;
    this.state = this.pausePrev || 'racing';
    this.hud.screen(null);
  }

  applyInput() {
    const p = this.player;
    if (!p) return;
    const k = this.keys;
    const dn = function (list) { for (const c of list) if (k.has(c)) return true; return false; };
    const locked = this.state === 'countdown';
    if (this.demo && !locked) {
      perfectLine(this.world, p);
      return;
    }
    const steer = steerFromKeys(KEYMAP.left, KEYMAP.right, k);   // A/← = 左转: heading 增大 (与 AI 同一约定); k = 按下的键码集合
    p.input.steer = steer;
    p.input.throttle = !locked && dn(KEYMAP.accel);
    p.input.brake = !locked && dn(KEYMAP.brake);
  }

  frame(t) {
    const self = this;
    const raw = (t - this.lastT) / 1000;
    this.lastT = t;
    const dt = Math.max(0, Math.min(0.05, raw || 0.016));
    if (this.introHold > 0) {
      this.introHold -= dt;
      if (this.introHold <= 0) { this.introHold = 0; if (this.state === 'countdown' || this.state === 'racing') this.hud.screen(null); }
    }
    this.frames = (this.frames || 0) + 1;
    this.fps = this.fps * 0.9 + (1 / Math.max(0.0001, dt)) * 0.1;
    const stepping = (this.state === 'racing' || this.state === 'countdown') && this.introHold <= 0;
    if (stepping && this.world) {
      this.accum += dt;
      let steps = 0;
      while (this.accum >= RACE.dt && steps < 6) {
        this.applyInput();
        this.world.step(RACE.dt);
        this.accum -= RACE.dt;
        steps++;
        this.tickRace();
        if (this.state !== 'racing' && this.state !== 'countdown') break;
      }
      if (steps >= 6) this.accum = 0;
    }
    const visualDt = stepping ? dt : 0;
    if (this.world && this.player) {
      this.scene.update(visualDt, this.world, this.player);
      this.hud.update(this.world, this.player, this.state);
      this.engine.update(this.player.speed, this.player.onGrass, stepping);
      this.updateDiag();
    } else {
      this.idleView(dt);
      this.updateDiag();
    }
    this.renderer.render(this.scene.scene, this.scene.camera);
  }

  reportError(e, where) {
    const msg = String((e && e.message) || e);
    const st = (e && e.stack) ? String(e.stack).split('\n').slice(1, 4).join(' <- ').replace(/\s+/g, ' ') : '';
    const line = (where ? where + ': ' : '') + msg + (st ? ' @ ' + st : '');
    this.errors.push(line);
    if (this.diagEl) this.diagEl.textContent = 'ERR ' + this.errors.slice(-2).join(' | ');
    if (this.errors.length > 12) this.errors = this.errors.slice(-12);
  }

  tickRace() {
    const w = this.world;
    const p = this.player;
    if (this.state === 'countdown') {
      const n = Math.max(0, Math.min(3, Math.ceil(w.countdown)));
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n > 0) {
          this.hud.countdown(String(n));
          this.engine.blip(520 + (3 - n) * 90, 0.16, 'triangle', 0.3);
        }
      }
      if (this.lastCount === 0 || this.lastCount === null) this.hud.countdown('出发!');
    }
    if (w.phase === 'racing' && this.state === 'countdown') {
      this.state = 'racing';
      this.hud.countdown('出发!');
      this.engine.blip(880, 0.34, 'square', 0.28);
      const self = this;
      setTimeout(function () { self.hud.countdown(null); }, 700);
    }
    if (p.laps !== this.prevLaps) {
      this.prevLaps = p.laps;
      if (p.laps > 0 && !p.finished) {
        this.hud.flash('第 ' + (p.laps + 1) + ' 圈 · 上圈 ' + fmtTime(p.lapTimes[p.lapTimes.length - 1]));
        this.engine.blip(700, 0.2, 'triangle', 0.26);
      }
    }
    // 玩家冲线后不立刻弹结算: 先让 AI 跑完冲刺窗口(15 秒仿真或全员完赛), 名次才有意义
    if (this.state === 'racing' && p.finished && this.finishHold < 0) {
      this.finishHold = 15;
      this.hud.flash('冲线！等待其他车手完赛…');
    }
    if (this.state === 'racing' && this.finishHold >= 0) {
      this.finishHold -= RACE.dt;
      let allDone = true;
      for (const k of w.karts) if (!k.finished) { allDone = false; break; }
      if (allDone || this.finishHold <= 0) this.showResults();
    }
  }

  showResults() {
    const w = this.world;
    const p = this.player;
    this.state = 'results';
    this.finishHold = 0;
    this.hud.countdown(null);
    this.hud.setRaceHudVisible(false);
    const list = w.rank();
    const arr = Array.isArray(list) ? list : w.karts.slice().sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); });
    const rows = arr.map(function (k, i) {
      return {
        rank: i + 1,
        name: k.isPlayer ? '玩家' : k.racer.name,
        time: k.finishTime,
        bestLap: k.bestLap,
        laps: k.laps,
        me: !!k.isPlayer,
        finished: !!k.finished
      };
    });
    const ch = chapterByKey(this.sel.chapter);
    const veh = vehicleByKey(this.sel.vehicle);
    const bestKey = 'best_' + veh.key + '_' + this.sel.chapter;
    const prev = this.progress[bestKey];
    const newRecord = !!(p.bestLap && (!prev || p.bestLap < prev));
    if (newRecord) {
      this.progress[bestKey] = p.bestLap;
      this.hud.toast('刷新本场最佳单圈 ' + fmtTime(p.bestLap));
    }
    if (!this.progress.cleared) this.progress.cleared = {};
    this.progress.cleared[this.sel.chapter] = true;
    this.saveProgress();
    const keys = chapterKeys();
    const hasNext = keys.indexOf(this.sel.chapter) < keys.length - 1;
    this.hud.screen('results', {
      rows: rows,
      rank: p.rank,
      chapterName: ch.name || '',
      trackName: ch.trackName || '',
      vehicleLabel: veh.name,
      laps: w.laps,
      newRecord: newRecord,
      hasNext: hasNext
    });
    this.engine.blip(520, 0.5, 'sine', 0.3);
    this.engine.update(0, false, false);
  }

  idleView(dt) {
    this.scene.updateMenu(dt, this.state === 'select');
  }

  // 玩家车身当前颜色 (调试用: 应等于所选车辆色, 否则说明车辆色没接上车模)
  bodyHex(p) {
    const g = p && this.scene ? this.scene.kartMeshes.get(p) : null;
    if (!g) return '-';
    let out = '-';
    g.traverse(function (o) { if (out === '-' && o.material && o.material.color) out = o.material.color.getHexString(); });
    return out;
  }

  updateDiag() {
    if (!this.diagEl) return;
    const info = this.renderer.info;
    const p = this.player;
    if (!this.glInfo) {
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      this.glInfo = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'webgl';
    }
    const w = this.world;
    const s = 'gl=' + this.glInfo + ' state=' + this.state + ' ch=' + (w && w.chapter ? w.chapter.key : '-') +
      ' fps=' + this.fps.toFixed(0) + ' tris=' + info.render.triangles + ' calls=' + info.render.calls + ' n=' + (this.frames || 0) +
      (w && p ? ' phase=' + w.phase + ' t=' + w.time.toFixed(2) + ' lap=' + p.laps + '/' + w.laps +
        ' rank=' + p.rank + ' v=' + p.speed.toFixed(1) + ' s=' + p.s.toFixed(0) +
        ' lat=' + p.lateral.toFixed(2) + ' resp=' + p.respawnCount +
        ' veh=' + (p.vehicle ? p.vehicle.key : '-') + ' body=' + this.bodyHex(p) : '') +
      ' mt=' + (this.hud && this.hud.track ? Math.round(this.hud.track.total) : -1) + ' tt=' + Math.round(this.track.total) +
      ' mm=' + (this.hud && this.hud.mapPts ? Math.round(this.hud.mapPts.total) : -1) + ' msig=' + (this.hud && this.hud.mapPts ? this.hud.mapPts.sig : -1) +
      (this.errors.length ? ' ERR=' + this.errors.slice(-2).join(' | ') : '');
    this.diagEl.textContent = s;
  }
}

const game = new Game(document.getElementById('app'));
game.boot();