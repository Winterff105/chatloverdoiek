/* Keep the ORIGINAL Messages composer above Android/iOS keyboards.
 * No private Messages code, DOM cloning, or chat-send handlers are replaced. */
(function(w){
  'use strict';
  if(w.__whateverMessagesKeyboardFix)return;
  w.__whateverMessagesKeyboardFix=true;
  const d=w.document,root=d.documentElement;
  const viewport=()=>w.visualViewport;
  let baseline=Math.max(w.innerHeight||0,viewport()?.height||0);
  let active=null,composer=null,chat=null,thread=null,saved=null;
  let lift=0,pending=false,blurTimer=0;
  // One stable focus flag keeps the app shell from resizing twice while
  // Android animates the IME and the visual viewport at different times.
  function keepShellStable(on){
    root.classList.toggle('wmc-messages-input-focused',!!on);
  }

  function visible(el){
    if(!el?.isConnected)return false;
    const style=w.getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden';
  }
  function findChatInput(el){
    if(!el?.matches?.('textarea,input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),[contenteditable="true"]'))return null;
    const app=el.closest('.messages-app');
    if(!app||!visible(app)||!visible(el)||!app.querySelector('#thread'))return null;
    const bounds=app.getBoundingClientRect();
    const field=el.getBoundingClientRect();
    // Don't move search, renaming, or configuration fields at the top.
    if(bounds.height<170||field.top<bounds.top+bounds.height*.32)return null;
    return app;
  }
  function findComposer(input,app){
    const appBox=app.getBoundingClientRect();
    let current=input.parentElement,choice=input;
    while(current&&current!==app){
      const r=current.getBoundingClientRect();
      if(r.height>175||r.width<100)break;
      if(r.height>=26&&r.bottom>appBox.top+appBox.height*.55)choice=current;
      current=current.parentElement;
    }
    return choice;
  }
  function restore(){
    if(composer&&saved){
      if(saved.translate)composer.style.setProperty('translate',saved.translate);
      else composer.style.removeProperty('translate');
      if(saved.zIndex)composer.style.setProperty('z-index',saved.zIndex);
      else composer.style.removeProperty('z-index');
    }
    if(thread&&saved){
      if(saved.scrollPaddingBottom)thread.style.setProperty('scroll-padding-bottom',saved.scrollPaddingBottom);
      else thread.style.removeProperty('scroll-padding-bottom');
    }
    root.classList.remove('wmc-messages-keyboard');
    keepShellStable(false);
    root.style.removeProperty('--wmc-main-input-rise');
    active=null;composer=null;chat=null;thread=null;saved=null;lift=0;
  }
  function attach(input,app){
    if(active===input&&composer?.isConnected)return;
    restore();
    active=input;chat=app;
    keepShellStable(true);
    composer=findComposer(input,app);
    thread=app.querySelector('#thread');
    saved={
      translate:composer.style.getPropertyValue('translate'),
      zIndex:composer.style.getPropertyValue('z-index'),
      scrollPaddingBottom:thread?.style.getPropertyValue('scroll-padding-bottom')||''
    };
  }
  function update(){
    pending=false;
    if(!active||d.activeElement!==active||!active.isConnected||!visible(active)){
      if(active)restore();
      baseline=Math.max(w.innerHeight||0,viewport()?.offsetTop+viewport()?.height||0);
      return;
    }
    const vv=viewport();
    const visibleBottom=vv?vv.offsetTop+vv.height:w.innerHeight;
    // Baseline stays at the full-height value while an input is focused:
    // Android can shrink innerHeight AND visualViewport simultaneously.
    baseline=Math.max(baseline,w.innerHeight||0,visibleBottom);
    // Hysteresis avoids on/off toggles as the Android keyboard finishes its
    // opening animation (and the browser address bar adjusts its own height).
    const keyboardOpen=baseline-visibleBottom>(lift>0?60:100);
    // Align the ACTUAL input controls rather than the bottom of their wrapper.
    // The wrapper can include large safe-area padding, making it look as though
    // the typing bar is floating far above the keyboard.
    const controls=[active,...composer.querySelectorAll('button,textarea,[contenteditable="true"]')];
    let controlsBottom=active.getBoundingClientRect().bottom;
    for(const control of controls){
      if(visible(control))controlsBottom=Math.max(controlsBottom,control.getBoundingClientRect().bottom);
    }
    const naturalBottom=controlsBottom+lift;
    const maxLift=Math.max(0,baseline*.7);
    const nextLift=keyboardOpen
      ?Math.min(maxLift,Math.max(0,Math.ceil(naturalBottom-visibleBottom+3)))
      :0;
    // Ignore 1px IME rounding noise instead of repainting every frame.
    lift=Math.abs(nextLift-lift)<2?lift:nextLift;
    // Use the individual translate property: existing composer transforms,
    // input focus, send buttons and caret are left intact.
    if(lift>0){
      composer.style.setProperty('translate','0 '+(-lift)+'px');
      composer.style.setProperty('z-index','20');
    }else{
      if(saved.translate)composer.style.setProperty('translate',saved.translate);
      else composer.style.removeProperty('translate');
      if(saved.zIndex)composer.style.setProperty('z-index',saved.zIndex);
      else composer.style.removeProperty('z-index');
    }
    if(thread){
      if(lift>0)thread.style.setProperty('scroll-padding-bottom',Math.round(lift+4)+'px');
      else if(saved.scrollPaddingBottom)thread.style.setProperty('scroll-padding-bottom',saved.scrollPaddingBottom);
      else thread.style.removeProperty('scroll-padding-bottom');
      // Do not force-scroll the entire thread on focus: that causes a full
      // black repaint during the native keyboard opening animation.
    }
    root.classList.toggle('wmc-messages-keyboard',lift>0);
    root.style.setProperty('--wmc-main-input-rise',lift+'px');
  }
  function schedule(){
    if(pending)return;
    pending=true;
    w.requestAnimationFrame(update);
  }
  d.addEventListener('focusin',e=>{
    const app=findChatInput(e.target);
    if(!app)return;
    w.clearTimeout(blurTimer);
    attach(e.target,app);
    schedule();
    // Some Android keyboards report their final viewport after focusin.
    w.setTimeout(schedule,100);
    w.setTimeout(schedule,300);
  },true);
  d.addEventListener('focusout',e=>{
    if(e.target!==active)return;
    w.clearTimeout(blurTimer);
    blurTimer=w.setTimeout(()=>{
      const next=d.activeElement,nextApp=findChatInput(next);
      if(nextApp){attach(next,nextApp);schedule();}
      else restore();
    },160);
  },true);
  viewport()?.addEventListener('resize',schedule,{passive:true});
  viewport()?.addEventListener('scroll',schedule,{passive:true});
  w.addEventListener('resize',schedule,{passive:true});
  w.addEventListener('orientationchange',()=>{
    if(!active)baseline=Math.max(w.innerHeight||0,viewport()?.height||0);
    schedule();
  });
})(window);
