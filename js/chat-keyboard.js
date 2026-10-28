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
      for(const [name,value,priority] of saved.threadStyles){
        if(value)thread.style.setProperty(name,value,priority);
        else thread.style.removeProperty(name);
      }
    }
    root.classList.remove('wmc-messages-keyboard');
    root.style.removeProperty('--wmc-main-input-rise');
    active=null;composer=null;chat=null;thread=null;saved=null;lift=0;
  }
  function attach(input,app){
    if(active===input&&composer?.isConnected)return;
    restore();
    active=input;chat=app;
    composer=findComposer(input,app);
    thread=app.querySelector('#thread');
    saved={
      translate:composer.style.getPropertyValue('translate'),
      zIndex:composer.style.getPropertyValue('z-index'),
      threadStyles:['scroll-padding-bottom','max-height','min-height','overflow-y']
        .map(name=>[name,thread?.style.getPropertyValue(name)||'',
          thread?.style.getPropertyPriority(name)||''])
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
    // The browser may have already lifted the footer when its layout viewport
    // shrinks. Do NOT count the wrapper's buttons / safe-area padding: their
    // bottoms can be tens of pixels below the actual input field.
    const keyboardOpen=baseline-visibleBottom>(lift!==0?60:100);
    const actualBottom=active.getBoundingClientRect().bottom;
    // Undo only our own previous displacement to learn where the input
    // would be after native reflow. Positive lift = up; negative = down.
    const naturalBottom=actualBottom+lift;
    const gap=5;
    const maxRise=Math.round(baseline*.7);
    // If the platform already raises the input too far, allow a small
    // downward correction instead of insisting on upward-only movement.
    const maxDrop=96;
    const desired=keyboardOpen
      ?Math.max(-maxDrop,Math.min(maxRise,Math.round(naturalBottom-visibleBottom+gap)))
      :0;
    lift=Math.abs(desired-lift)<=1?lift:desired;
    // The CSS individual translate leaves the original transform intact.
    if(lift!==0){
      composer.style.setProperty('translate','0 '+(-lift)+'px');
      composer.style.setProperty('z-index','20');
    }else{
      if(saved.translate)composer.style.setProperty('translate',saved.translate);
      else composer.style.removeProperty('translate');
      if(saved.zIndex)composer.style.setProperty('z-index',saved.zIndex);
      else composer.style.removeProperty('z-index');
    }
    if(thread){
      if(keyboardOpen){
        // The original adapter moved only the composer, leaving the message
        // history behind it. Cap the actual scroll area at the lifted composer.
        const threadBox=thread.getBoundingClientRect();
        const composerTop=composer.getBoundingClientRect().top;
        const messageBottom=Math.min(visibleBottom-8,composerTop-8);
        const available=Math.round(messageBottom-threadBox.top);
        const nearLatest=thread.scrollHeight-thread.scrollTop-thread.clientHeight<96;
        thread.style.setProperty('max-height',Math.max(56,available)+'px','important');
        thread.style.setProperty('min-height','0','important');
        thread.style.setProperty('overflow-y','auto','important');
        thread.style.setProperty('scroll-padding-bottom','8px');
        // Keep the latest message visible only if the user was already
        // reading the end of the conversation; don't interrupt older reading.
        if(nearLatest){
          const current=thread;
          w.requestAnimationFrame(()=>{
            if(current.isConnected&&active===d.activeElement)
              current.scrollTop=current.scrollHeight;
          });
        }
      }else{
        for(const [name,value,priority] of saved.threadStyles){
          if(value)thread.style.setProperty(name,value,priority);
          else thread.style.removeProperty(name);
        }
      }
    }
    root.classList.toggle('wmc-messages-keyboard',keyboardOpen);
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
