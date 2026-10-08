/* PRISM 3D background: raymarched glass prism + chromatic refraction + volumetric spectrum fan (raw WebGL, no libraries) */
(() => {
  const cv = document.getElementById('gl'); if (!cv) return;
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }); if (!gl) return;
  const FS = `precision highp float;
uniform vec2 uRes; uniform float uTime;
vec2 E,X,S; float base,yaw;
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
vec3 spec(float t){
  vec3 c=vec3(1.,.08,.08);
  c=mix(c,vec3(1.,.5,.04),smoothstep(0.,.17,t)); c=mix(c,vec3(1.,.95,.1),smoothstep(.17,.33,t));
  c=mix(c,vec3(.1,1.,.3),smoothstep(.33,.5,t)); c=mix(c,vec3(.1,.55,1.),smoothstep(.5,.67,t));
  c=mix(c,vec3(.3,.18,1.),smoothstep(.67,.83,t)); c=mix(c,vec3(.72,.2,1.),smoothstep(.83,1.,t)); return c;}
vec3 scene(vec2 p){
  vec3 col=vec3(.012,.016,.04)+vec3(.05,.035,.11)*exp(-length(p-vec2(.5,.2))*.7);
  vec2 sb=E-S; float hh=clamp(dot(p-S,sb)/dot(sb,sb),0.,1.); float d=seg(p,S,E);
  float beam=(exp(-d*d/.00006)*1.7+exp(-d*d/.003)*.22)*(.3+.7*hh);
  float d2=seg(p,E,X); float inner=exp(-d2*d2/.00005)*1.1+exp(-d2*d2/.002)*.18;
  col+=vec3(1.,.98,.95)*(beam+inner)+vec3(1.,.95,.9)*exp(-length(p-E)*7.)*.5;
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
  yaw=.55+.32*sin(t*.3); base=-.45+.05*sin(t*.3);
  E=ctr+vec2(-.2,.03); X=ctr+vec2(.17,-.06); S=E+vec2(-2.6,.8);
  vec3 ro=vec3(0.,0.,5.), rd=normalize(vec3(uv-ctr,-2.2)); float tt=3.6; bool hit=false;
  for(int i=0;i<60;i++){float h=map(ro+rd*tt); if(h<.0015){hit=true;break;} tt+=h; if(tt>7.)break;}
  vec3 col;
  if(hit){
    vec3 p=ro+rd*tt, n=nrm(p); vec2 o=n.xy;
    vec3 refr=vec3(scene(uv+o*.060).r,scene(uv+o*.070).g,scene(uv+o*.082).b);
    vec3 rf=reflect(rd,n);
    vec3 env=vec3(.07,.08,.13)+vec3(.9)*pow(max(dot(rf,normalize(vec3(-.6,.7,.5))),0.),24.)+vec3(.35,.5,.9)*pow(max(rf.y,0.),3.)*.35;
    float fr=.04+.96*pow(1.-max(dot(-rd,n),0.),4.);
    col=refr*vec3(.93,.98,1.)*(1.-fr*.8)*.92+env*fr*1.4+pow(1.-abs(dot(n,-rd)),6.)*.5*vec3(.8,.9,1.);
  } else col=scene(uv);
  col=1.-exp(-col*1.25); col*=1.-.35*dot(uv/asp,uv/asp)*.5;
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+t)*43758.5453)-.5)*.02;
  gl_FragColor=vec4(col,1.);}`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { console.warn('PRISM shader:', gl.getShaderInfoLog(o)); return null; } return o; };
  const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  const pg = gl.createProgram(); gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg); if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return; gl.useProgram(pg);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pg, 'uRes'), uT = gl.getUniformLocation(pg, 'uTime');
  const size = () => { const k = Math.min(devicePixelRatio || 1, 1.5) * .75; cv.width = Math.max(2, innerWidth * k | 0); cv.height = Math.max(2, innerHeight * k | 0); gl.viewport(0, 0, cv.width, cv.height); };
  size(); addEventListener('resize', size); document.body.classList.add('gl');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now();
  (function frame() {
    if (!document.hidden && !document.body.classList.contains('metal')) { gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, still ? 2 : (performance.now() - t0) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    if (!still) requestAnimationFrame(frame); else setTimeout(frame, 500);
  })();
})();
