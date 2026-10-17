(() => {
  const G = window.__game;
  const chs = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'];
  const dims = { pit: [48, -2.0, 11.8], 'stand-a': [31, -0.5, 9.6], 'stand-b': [31, -0.5, 9.6], 'stand-c': [31, -0.5, 9.6], windmill: [7, -3.0, 3.0] };
  const out = [];
  for (const ch of chs) {
    G.startRace(ch);
    const t = G.track, hw = t.halfWidth;
    const facs = [];
    G.scene.decor.children.forEach(grp => {
      const tag = grp.userData && grp.userData.facility; if (!tag) return;
      const d = dims[tag];
      const pr = t.project(grp.position.x, grp.position.z);
      const sgn = pr.lateral >= 0 ? 1 : -1;
      const p0 = t.sample(pr.s);
      let minLat = Infinity, worst = null;
      for (let i = 0; i <= 10; i++) {
        const u = -d[0]/2 + d[0]*i/10;
        for (let j = 0; j <= 4; j++) {
          const dd = d[1] + (d[2]-d[1])*j/4;
          const px = grp.position.x + p0.nx*sgn*dd + p0.tx*u;
          const pz = grp.position.z + p0.nz*sgn*dd + p0.tz*u;
          const lat = Math.abs(t.project(px, pz).lateral);
          if (lat < minLat) { minLat = lat; worst = [dd, u]; }
        }
      }
      let R = Infinity;
      for (let dd = -d[0]/2 - 2; dd <= d[0]/2 + 2; dd += 2) { const k = t.curvatureAt(pr.s + dd); if (k > 0) R = Math.min(R, 1/k); }
      facs.push(tag + ' s=' + (100*pr.s/t.total).toFixed(1) + '% lat0=' + Math.abs(pr.lateral).toFixed(1) + ' clear=' + (minLat - hw).toFixed(2) + ' R=' + (R===Infinity?'inf':R.toFixed(0)));
    });
    out.push(ch + ' len=' + t.total.toFixed(0) + ' hw=' + hw.toFixed(1) + ' :: ' + (facs.join(' | ') || 'NONE'));
  }
  return out.join('\n');
})()