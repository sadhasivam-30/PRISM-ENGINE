/* Raymarched glass prism. The returned disposer owns every listener and GL resource. */
export function mountPrism(cv) {
  if (!cv) return () => {};
  const host = cv.closest('.prism-window'), stage = cv.closest('.clock-stage');
  const gl = cv.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) { host?.classList.add('prism-fallback-active'); return () => {}; }
  const FS = `precision highp float;
uniform vec2 uRes; uniform vec2 uPointer; uniform float uTime;
vec2 E,X,S; float base,yaw;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
vec3 spec(float t){
  vec3 c=vec3(.08,.92,1.);
  c=mix(c,vec3(.16,.48,1.),smoothstep(.0,.28,t));
  c=mix(c,vec3(.42,.25,1.),smoothstep(.28,.56,t));
  c=mix(c,vec3(.88,.2,.96),smoothstep(.56,.82,t));
  c=mix(c,vec3(1.,.36,.78),smoothstep(.82,1.,t)); return c;}
vec3 scene(vec2 p){
  vec3 col=vec3(.004,.009,.025)+vec3(.025,.075,.13)*exp(-length(p-vec2(.5,.2))*.7);
  vec2 sb=E-S; float hh=clamp(dot(p-S,sb)/dot(sb,sb),0.,1.); float d=seg(p,S,E);
  float beam=(exp(-d*d/.00006)*1.7+exp(-d*d/.003)*.22)*(.3+.7*hh);
  float d2=seg(p,E,X); float inner=exp(-d2*d2/.00005)*1.1+exp(-d2*d2/.002)*.18;
  col+=vec3(.55,.91,1.)*(beam+inner)+vec3(.3,.72,1.)*exp(-length(p-E)*7.)*.55;
  vec2 v=p-X; float r=length(v); float ang=atan(v.y,v.x); float t=(base+.18-ang)/.36;
  float m=smoothstep(-.04,.06,t)*smoothstep(1.04,.94,t); float mw=smoothstep(-.5,.1,t)*smoothstep(1.5,.9,t);
  vec3 sc=spec(clamp(t,0.,1.));
  float sh=.85+.15*sin(ang*140.+uTime*.4)*sin(ang*53.);
  col+=sc*m*(1.15/(1.+r*1.1))*smoothstep(0.,.12,r)*sh + sc*mw*.12/(1.+r*1.5);
  return col;}
float sdTri(vec2 p,float r){
  float k=1.7320508; p.x=abs(p.x)-r; p.y=p.y+r/k;
  if(p.x+k*p.y>0.) p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.;
  p.x-=clamp(p.x,-2.*r,0.); return -length(p)*sign(p.y);}
float map(vec3 p){
  float c=cos(yaw),s=sin(yaw); p.xz=vec2(c*p.x-s*p.z,s*p.x+c*p.z);
  float cz=cos(.14),sz=sin(.14); p.xy=vec2(cz*p.x-sz*p.y,sz*p.x+cz*p.y);
  vec2 d=vec2(sdTri(p.xy,.45),abs(p.z)-.62);
  return min(max(d.x,d.y),0.)+length(max(d,0.))-.012;}
vec3 nrm(vec3 p){vec2 e=vec2(.002,-.002);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-uRes)/uRes.y; float asp=uRes.x/uRes.y; float t=uTime;
  vec2 ctr=asp>1.?vec2(-.5*asp,.12):vec2(-.3*asp,.5);
  yaw=.55+.2*sin(t*.24)+uPointer.x*.1; base=-.45+.035*sin(t*.22);
  ctr+=uPointer*vec2(.045,.035);
  E=ctr+vec2(-.2,.03); X=ctr+vec2(.17,-.06); S=E+vec2(-2.6,.8);
  vec3 ro=vec3(0.,0.,5.), rd=normalize(vec3(uv-ctr,-2.2)); float tt=3.6; bool hit=false;
  for(int i=0;i<52;i++){float h=map(ro+rd*tt); if(h<.0015){hit=true;break;} tt+=h; if(tt>7.)break;}
  vec3 col; float alpha;
  if(hit){
    vec3 p=ro+rd*tt, n=nrm(p); vec2 o=n.xy;
    vec3 refr=vec3(scene(uv+o*.060).r,scene(uv+o*.070).g,scene(uv+o*.082).b);
    vec3 rf=reflect(rd,n);
    vec3 env=vec3(.025,.055,.1)+vec3(.8,.96,1.)*pow(max(dot(rf,normalize(vec3(-.6,.7,.5))),0.),24.)+vec3(.24,.42,1.)*pow(max(rf.y,0.),3.)*.42;
    float fr=.04+.96*pow(1.-max(dot(-rd,n),0.),4.);
    col=refr*vec3(.78,.94,1.)*(1.-fr*.8)*.92+env*fr*1.4+pow(1.-abs(dot(n,-rd)),6.)*.65*vec3(.35,.8,1.);
    alpha=.88;
  } else { col=scene(uv); alpha=clamp(max(max(col.r,col.g),col.b)*.62,0.,.42); }
  col=1.-exp(-col*1.25); col*=1.-.35*dot(uv/asp,uv/asp)*.5;
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+t)*43758.5453)-.5)*.02;
  gl_FragColor=vec4(col,alpha);}`;
  const shader = (type, source) => {
    const item = gl.createShader(type);
    gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      console.warn('PRISM shader:', gl.getShaderInfoLog(item)); gl.deleteShader(item); return null;
    }
    return item;
  };
  const vs = shader(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); host?.classList.add('prism-fallback-active'); return () => {}; }
  const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('PRISM program:', gl.getProgramInfoLog(program)); gl.deleteProgram(program); host?.classList.add('prism-fallback-active'); return () => {};
  }
  gl.useProgram(program); gl.clearColor(0, 0, 0, 0); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(program, 'uRes'), uT = gl.getUniformLocation(program, 'uTime'), uP = gl.getUniformLocation(program, 'uPointer');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0, disposed = false, contextLost = false, inView = true, pointerX = 0, pointerY = 0;
  let elapsed = 0, lastFrame = null;
  const size = () => {
    const rect = cv.getBoundingClientRect(), scale = Math.min(devicePixelRatio || 1, 1.5) * .78;
    const width = Math.max(2, Math.round(rect.width * scale)), height = Math.max(2, Math.round(rect.height * scale));
    if (cv.width !== width || cv.height !== height) { cv.width = width; cv.height = height; gl.viewport(0, 0, width, height); }
    if (still) draw(performance.now()); else schedule();
  };
  const draw = now => {
    frame = 0;
    if (disposed || contextLost || document.hidden || !inView) return;
    if (lastFrame !== null) elapsed += Math.min(now - lastFrame, 80);
    lastFrame = now;
    gl.useProgram(program); gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform2f(uP, pointerX, pointerY); gl.uniform1f(uT, still ? 0 : elapsed / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) frame = requestAnimationFrame(draw);
  };
  const schedule = () => {
    if (disposed || contextLost || document.hidden || !inView) return;
    if (still) draw(0); else if (!frame) frame = requestAnimationFrame(draw);
  };
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastFrame = null; }
    else schedule();
  };
  const pointer = event => {
    if (still || !stage) return;
    const rect = stage.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, 1 - (event.clientY - rect.top) / rect.height * 2));
  };
  const lost = event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; host?.classList.add('prism-fallback-active'); };
  const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(size);
  resized?.observe(cv); if (!resized) addEventListener('resize', size);
  const visibilityObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    inView = entries[0]?.isIntersecting ?? true;
    if (inView) schedule(); else { cancelAnimationFrame(frame); frame = 0; lastFrame = null; }
  });
  visibilityObserver?.observe(cv);
  document.addEventListener('visibilitychange', visibility);
  stage?.addEventListener('pointermove', pointer, { passive: true });
  cv.addEventListener('webglcontextlost', lost);
  gl.clear(gl.COLOR_BUFFER_BIT);
  host?.classList.remove('prism-fallback-active'); size(); schedule();
  return () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); frame = 0;
    resized?.disconnect(); visibilityObserver?.disconnect();
    if (!resized) removeEventListener('resize', size);
    document.removeEventListener('visibilitychange', visibility);
    stage?.removeEventListener('pointermove', pointer);
    cv.removeEventListener('webglcontextlost', lost);
    gl.deleteBuffer(buffer); gl.deleteProgram(program);
    host?.classList.add('prism-fallback-active');
  };
}
