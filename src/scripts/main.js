(function(){
  /* ---------- THEME ---------- */
  var root=document.documentElement,btn=document.getElementById('themeToggle');
  var media=window.matchMedia('(prefers-color-scheme: light)');
  function systemTheme(){return media.matches?'light':'dark';}
  function stored(){try{var v=localStorage.getItem('theme');return(v==='light'||v==='dark')?v:null;}catch(e){return null;}}
  function current(){return root.getAttribute('data-theme')||systemTheme();}
  function apply(t){
    root.setAttribute('data-theme',t);
    var light=t==='light';
    btn.setAttribute('aria-pressed',String(light));
    btn.setAttribute('aria-label',light?'Switch to dark theme':'Switch to light theme');
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',light?'#F1EBDD':'#0F0E12');
  }
  apply(stored()||root.getAttribute('data-theme')||systemTheme());
  btn.addEventListener('click',function(){
    var next=current()==='light'?'dark':'light';
    apply(next);
    try{localStorage.setItem('theme',next);}catch(e){}
  });
  var onSys=function(){if(!stored())apply(systemTheme());};
  if(media.addEventListener)media.addEventListener('change',onSys);

  /* ---------- CURSOR REVEAL ---------- */
  var c=document.getElementById('bg'),x=c.getContext('2d');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP=30,R=150,w,h,dpr,mx=-1,my=-1,tx=0,ty=0,lastMove=-9999,col='255,90,54',n=0;
  var grid=document.createElement('canvas'),PAD=24,PAR=12,rowOff=0,sy=0,waves=[];

  /* Static grid of faint circles, pre-rendered so it costs one drawImage per frame */
  function buildGrid(){
    grid.width=(w+PAD*2)*dpr;grid.height=(h+PAD*2+GAP)*dpr;
    var g2=grid.getContext('2d');g2.setTransform(dpr,0,0,dpr,PAD*dpr,PAD*dpr);g2.clearRect(-PAD,-PAD,w+PAD*2,h+PAD*2+GAP);
    for(var j=-1;j*GAP<h+PAD+GAP;j++){
      for(var i=-1;i*GAP<w+PAD;i++){
        var px=i*GAP+GAP/2,py=j*GAP+GAP/2,k=(((i*374761393)^((j+rowOff)*668265263))>>>0)%6;
        g2.beginPath();
        if(k===0){g2.arc(px,py,2.4,0,6.2832);g2.strokeStyle='rgba('+col+',.2)';g2.lineWidth=1;g2.stroke();}
        else{g2.arc(px,py,1.1,0,6.2832);g2.fillStyle='rgba('+col+',.18)';g2.fill();}
      }
    }
  }

  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;
    c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);
    buildGrid();
  }
  addEventListener('resize',size);size();

  addEventListener('pointermove',function(e){
    tx=e.clientX;ty=e.clientY;lastMove=performance.now();
    if(mx<0){mx=tx;my=ty;}
  },{passive:true});

  /* Text-aware mask: bright circles fade out wherever they would cross text */
  var rects=[],vis=[],rt;
  function collectRects(){
    rects=[];
    var oy0=window.pageYOffset||0,ox0=window.pageXOffset||0;
    document.querySelectorAll('main,.foot').forEach(function(scope){
      var tw=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,null),node;
      while((node=tw.nextNode())){
        if(!node.nodeValue.trim())continue;
        var par=node.parentElement;
        if(!par||par.closest('.card,.term,.nav'))continue;
        var rg=document.createRange();rg.selectNodeContents(node);
        var list=rg.getClientRects();
        for(var a=0;a<list.length;a++){
          var bx=list[a];if(bx.width<2)continue;
          rects.push({l:bx.left+ox0-6,r:bx.right+ox0+6,t:bx.top+oy0-4,b:bx.bottom+oy0+4});
        }
      }
    });
  }
  function scheduleRects(){clearTimeout(rt);rt=setTimeout(collectRects,60);}
  addEventListener('resize',scheduleRects);
  addEventListener('load',collectRects);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(collectRects);
  collectRects();
  function textMask(px,py){
    var m=1;
    for(var a=0;a<vis.length;a++){
      var q=vis[a],dx=Math.max(q.l-px,0,px-q.r),dy=Math.max(q.t-py,0,py-q.b);
      var dd=Math.sqrt(dx*dx+dy*dy);
      if(dd<22){var v=dd/22;v=v*v*(3-2*v);if(v<m)m=v;if(m<=0)break;}
    }
    return .1+.9*m;
  }

  /* Click splash: a ripple travels through the grid */
  addEventListener('pointerdown',function(e){
    tx=e.clientX;ty=e.clientY;lastMove=performance.now();
    if(mx<0){mx=tx;my=ty;}
    if(!reduce){waves.push({x:e.clientX,y:e.clientY,t0:performance.now()});if(waves.length>6)waves.shift();}
  },{passive:true});

  function readColor(){
    var v=getComputedStyle(root).getPropertyValue('--dot').trim();
    if(v&&v!==col){col=v;buildGrid();}
  }

  function draw(t){
    requestAnimationFrame(draw);
    if(document.hidden)return;
    if(n++%20===0)readColor();

    if(reduce){tx=w*.72;ty=h*.4;}
    else if(t-lastMove>2500){
      tx=w*.5+Math.sin(t*.0004)*w*.3;
      ty=h*.45+Math.sin(t*.00031+1)*h*.25;
    }
    if(mx<0){mx=tx;my=ty;}
    mx+=(tx-mx)*.14;my+=(ty-my)*.14;

    var ox=-(mx/w-.5)*2*PAR,oy=-(my/h-.5)*2*PAR;
    /* Scroll: the grid travels at about a third of the page speed, looping row by row */
    sy+=((reduce?0:(window.pageYOffset||0)*.35)-sy)*.12;
    var ro=Math.floor(sy/GAP);
    if(ro!==rowOff){rowOff=ro;buildGrid();}
    var frac=sy-ro*GAP;
    x.clearRect(0,0,w,h);
    x.drawImage(grid,ox-PAD,oy-PAD-frac,w+PAD*2,h+PAD*2+GAP);

    var gr=R*1.1,g=x.createRadialGradient(mx,my,0,mx,my,gr);
    g.addColorStop(0,'rgba('+col+',.07)');
    g.addColorStop(.45,'rgba('+col+',.025)');
    g.addColorStop(1,'rgba('+col+',0)');
    x.fillStyle=g;x.fillRect(mx-gr,my-gr,gr*2,gr*2);

    vis.length=0;
    var sY=window.pageYOffset||0;
    for(var vi=0;vi<rects.length;vi++){
      var rc=rects[vi];
      if(rc.b-sY>-40&&rc.t-sY<h+40)vis.push({l:rc.l,r:rc.r,t:rc.t-sY,b:rc.b-sY});
    }
    var dots=[];
    var i0=Math.max(-1,Math.floor((mx-ox-R)/GAP)),i1=Math.ceil((mx-ox+R)/GAP);
    var j0=Math.max(-1,Math.floor((my-oy-R+frac)/GAP)),j1=Math.ceil((my-oy+R+frac)/GAP);
    for(var j=j0;j<=j1;j++){
      for(var i=i0;i<=i1;i++){
        var px=i*GAP+GAP/2,py=j*GAP+GAP/2-frac;
        var d=Math.hypot(px+ox-mx,py+oy-my);
        if(d>R)continue;
        var f=1-d/R;f=f*f*(3-2*f);
        if(f<.02)continue;
        var k=(((i*374761393)^((j+rowOff)*668265263))>>>0)%6;
        var depth=1+.8*f;
        dots.push({x:px+ox*depth,y:py+oy*depth,f:f,ring:k===0});
      }
    }
    dots.sort(function(a,b){return a.f-b.f;});
    for(var m=0;m<dots.length;m++){
      var o=dots[m],km=textMask(o.x,o.y),ks=.4+.6*km;
      x.beginPath();
      if(o.ring){
        x.arc(o.x,o.y,(2+9*o.f)*ks,0,6.2832);
        x.strokeStyle='rgba('+col+','+(o.f*.9*km)+')';x.lineWidth=1;x.stroke();
      }else{
        var r=(.8+4.8*Math.pow(o.f,1.4))*ks;
        if(o.f>.55){
          x.fillStyle='rgba('+col+','+((o.f-.55)*.22*km)+')';
          x.arc(o.x,o.y,r*2.2,0,6.2832);x.fill();
          x.beginPath();
        }
        x.arc(o.x,o.y,r,0,6.2832);
        x.fillStyle='rgba('+col+','+(o.f*.95*km)+')';x.fill();
      }
    }

    for(var s=waves.length-1;s>=0;s--){
      var wv=waves[s],age=t-wv.t0;
      if(age>1500){waves.splice(s,1);continue;}
      var fade=1-age/1500;
      if(age<320){
        x.beginPath();x.arc(wv.x,wv.y,26+age*.18,0,6.2832);
        x.fillStyle='rgba('+col+','+(.1*(1-age/320))+')';x.fill();
      }
      for(var q=0;q<2;q++){
        var a0=age-q*150;
        if(a0<=0)continue;
        var rad=a0*.5,amp=(q?.4:.7)*fade,band=40;
        x.beginPath();x.arc(wv.x,wv.y,rad,0,6.2832);
        x.strokeStyle='rgba('+col+','+(.22*amp)+')';x.lineWidth=1.2;x.stroke();
        var si0=Math.max(-1,Math.floor((wv.x-ox-rad-band)/GAP)),si1=Math.min(Math.ceil(w/GAP)+1,Math.ceil((wv.x-ox+rad+band)/GAP));
        var sj0=Math.max(-1,Math.floor((wv.y-oy-rad-band+frac)/GAP)),sj1=Math.min(Math.ceil(h/GAP)+2,Math.ceil((wv.y-oy+rad+band+frac)/GAP));
        for(var jj=sj0;jj<=sj1;jj++){
          for(var ii=si0;ii<=si1;ii++){
            var qx=ii*GAP+GAP/2+ox,qy=jj*GAP+GAP/2-frac+oy;
            var e=Math.abs(Math.hypot(qx-wv.x,qy-wv.y)-rad);
            if(e>band)continue;
            var u=1-e/band;u=u*u*amp;
            var km2=textMask(qx,qy);
            x.beginPath();x.arc(qx,qy,(1.1+3.4*u)*(.4+.6*km2),0,6.2832);
            x.fillStyle='rgba('+col+','+(Math.min(1,u*.9)*km2)+')';x.fill();
          }
        }
      }
    }
  }
  requestAnimationFrame(draw);
})();
