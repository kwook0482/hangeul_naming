const STORAGE_KEY = "hangul-naming-studio-v2";
const $ = (id) => document.getElementById(id);
const state = loadState();
let currentBatch = [];
let currentWish = "";

function loadState(){
  const empty={seen:[],selected:[],wish:"",preferences:{surname:"",type:"전체",syllables:"2"}};
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.seen) && Array.isArray(saved.selected))
      return {...empty,...saved,preferences:{...empty.preferences,...(saved.preferences||{})}};
    // 이전 버전(v1)의 추천·선택 기록을 새 버전으로 이어받습니다.
    const legacy=JSON.parse(localStorage.getItem("naming-studio-v1"));
    if(legacy && Array.isArray(legacy.seen) && Array.isArray(legacy.selected))
      return {...empty,seen:legacy.seen,selected:legacy.selected,wish:legacy.wish||""};
    return empty;
  } catch { return empty; }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const target = $('screen-'+name);
  if(target) target.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
function inferTone(text){
  const t=text.toLowerCase();
  const rules=[
    {keys:["맑","깨끗","청명","투명","순수"],tone:"맑음"},
    {keys:["따뜻","다정","사랑","포근","온화"],tone:"따뜻"},
    {keys:["자연","한국","우리말","꽃","하늘","바람"],tone:"자연"},
    {keys:["세련","현대","도시","감각"],tone:"세련"},
    {keys:["밝","명랑","활기","희망","긍정"],tone:"밝음"},
    {keys:["부드럽","여성","우아","예쁜","귀여운","고운"],tone:"부드러움"},
    {keys:["단정","차분","지적","고전","지혜"],tone:"단정"}
  ];
  return rules.filter(r=>r.keys.some(k=>t.includes(k))).map(r=>r.tone);
}
function shuffle(arr){
  const copy=[...arr];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function makeRecommendations(event){
  if(event) event.preventDefault();
  const wish=$('wish').value.trim() || state.wish || '';
  if(!wish){$('wish').focus();return;}
  currentWish=wish;state.wish=wish;
  state.preferences={surname:$('surname').value.trim(),type:$('name-type').value,syllables:$('syllables').value};
  const tones=inferTone(wish);
  let available=NAME_DATA.filter(item=>!state.seen.includes(item.name));
  if(state.preferences.syllables!=='전체'){
    const exact=available.filter(item=>Array.from(item.name).length===Number(state.preferences.syllables));
    if(exact.length) available=exact;
    else if(state.preferences.syllables==='3'){alert('현재 준비된 데이터에는 세 글자 이름이 많지 않습니다. 전체 글자 수로 다시 추천합니다.');$('syllables').value='전체';state.preferences.syllables='전체';}
  }
  if(!available.length){
    if(state.seen.length>=NAME_DATA.length){alert('준비된 이름을 모두 확인했습니다. 새로운 작명으로 다시 시작해 주세요.');return;}
    alert('현재 조건에 맞는 새로운 이름이 없습니다. 글자 수를 전체로 바꾸거나 새 작명을 시작해 주세요.');return;
  }
  const ranked=available.map(item=>{
    let score=tones.reduce((sum,t)=>sum+(item.tone.includes(t)?2:0),0);
    if(state.preferences.type==='현대적' && item.tone.includes('세련')) score+=1;
    if(state.preferences.type==='순우리말') score+=1;
    return {item,score};
  }).sort((a,b)=>b.score-a.score);
  const best=ranked[0].score;
  const pool=shuffle(ranked.filter(x=>x.score>=best-1));
  currentBatch=pool.slice(0,2).map(x=>x.item);
  currentBatch.forEach(item=>state.seen.push(item.name));
  saveState();renderResults();showScreen('results');
}
function renderResults(){
  const grid=$('name-grid');grid.innerHTML='';
  currentBatch.forEach((item,index)=>{
    const selected=state.selected.some(x=>x.name===item.name);
    const card=document.createElement('article');card.className='name-card';
    card.innerHTML=`<span class="recommend-badge">추천도 <b>★★★★★</b></span><h3></h3><p class="meaning"></p><div class="ornament">──── ✿ ────</div><p class="description"></p><button class="select-name ${selected?'selected':''}" type="button">${selected?'선택 완료 ✓':'마음에 담기 +'}</button>`;
    card.querySelector('h3').textContent=(state.preferences.surname||'')+item.name;
    card.querySelector('.meaning').textContent=item.meaning;
    card.querySelector('.description').textContent=item.description;
    card.querySelector('button').addEventListener('click',()=>toggleSelected(item));
    grid.appendChild(card);
  });
  $('counter').textContent=`추천한 이름 ${state.seen.length}개`;
  $('regenerate-button').disabled=state.seen.length>=NAME_DATA.length;
  $('more-button').disabled=state.seen.length>=NAME_DATA.length;
}
function toggleSelected(item){
  const index=state.selected.findIndex(x=>x.name===item.name);
  if(index>=0) state.selected.splice(index,1); else state.selected.push(item);
  saveState();renderResults();
}
function renderFinal(){
  const list=$('final-list');list.innerHTML='';
  if(!state.selected.length){list.innerHTML='<p class="empty-state">아직 선택한 이름이 없습니다. 추천 화면에서 마음에 드는 이름을 골라주세요.</p>';return;}
  state.selected.forEach((item,index)=>{
    const card=document.createElement('article');card.className='final-card';
    const name=document.createElement('h3');name.textContent=(state.preferences.surname||'')+item.name;
    const crown=document.createElement('div');crown.className='crown';crown.textContent=index===0?'♛ 최종 선택':'✿ 함께 담아둔 이름';
    const meaning=document.createElement('p');meaning.className='final-meaning';meaning.textContent=item.meaning;
    const details=document.createElement('div');details.className='final-details';
    const meaningBox=document.createElement('div');meaningBox.innerHTML='<strong>이름의 의미</strong>';
    const meaningText=document.createElement('span');meaningText.textContent=item.meaning;meaningBox.appendChild(meaningText);
    const featureBox=document.createElement('div');featureBox.innerHTML='<strong>이름의 특징</strong>';
    const featureText=document.createElement('span');featureText.textContent=item.description;featureBox.appendChild(featureText);
    details.append(meaningBox,featureBox);
    const reason=document.createElement('div');reason.className='reason-box';
    const reasonTitle=document.createElement('strong');reasonTitle.textContent='♥ 이름을 선택한 이유';
    const reasonText=document.createElement('span');reasonText.textContent=`'${currentWish||state.wish||'원하는 이름의 분위기'}'라는 바람과 어울리는 이름으로 골랐습니다.`;
    reason.append(reasonTitle,reasonText);
    card.append(crown,name,meaning,details,reason);list.appendChild(card);
  });
}
function openInfo(title,content){$('modal-title').textContent=title;$('modal-content').innerHTML=content;$('info-modal').hidden=false;}
function startNewSession(){
  if((state.seen.length||state.selected.length)&&!confirm('추천 이력과 선택 목록을 초기화하고 새 작명을 시작할까요?'))return;
  state.seen=[];state.selected=[];state.wish='';currentBatch=[];currentWish='';
  $('wish').value='';$('surname').value='';$('name-type').value='전체';$('syllables').value='2';saveState();showScreen('home');
}
$('start-button').addEventListener('click',()=>showScreen('input'));
$('brand-home').addEventListener('click',()=>showScreen('home'));
$('home-button').addEventListener('click',()=>showScreen('home'));
document.querySelectorAll('[data-go="home"]').forEach(b=>b.addEventListener('click',()=>showScreen('home')));
document.querySelectorAll('[data-go="input"]').forEach(b=>b.addEventListener('click',()=>showScreen('input')));
$('naming-form').addEventListener('submit',makeRecommendations);
$('regenerate-button').addEventListener('click',()=>{ $('wish').value=state.wish;makeRecommendations(); });
$('more-button').addEventListener('click',()=>{ $('wish').value=state.wish;makeRecommendations(); });
$('show-selected-button').addEventListener('click',()=>{if(!state.selected.length){alert('먼저 마음에 드는 이름 카드의 ‘마음에 담기’를 눌러주세요.');return;}renderFinal();showScreen('final');});
$('back-results').addEventListener('click',()=>showScreen('results'));
$('print-button').addEventListener('click',()=>{if(!state.selected.length){alert('먼저 이름을 선택해 주세요.');return;}window.print();});
$('print-bottom').addEventListener('click',()=>{if(!state.selected.length){alert('먼저 이름을 선택해 주세요.');return;}window.print();});
$('guide-button').addEventListener('click',()=>openInfo('서비스 안내','<p>원하는 이름의 분위기를 문장으로 입력하면, 준비된 한글 이름 데이터에서 어울리는 이름을 찾아드립니다.</p><p>추천 이름을 선택하면 최종 결과 화면에서 의미와 특징을 확인하고 인쇄할 수 있습니다.</p><p>이 서비스는 외부 AI 모델을 호출하지 않고 브라우저 안에서 작동합니다.</p>'));
$('faq-button').addEventListener('click',()=>openInfo('자주 묻는 질문','<p><b>Q. AI가 직접 새로운 이름을 만드는 건가요?</b><br>아니요. 준비된 이름 데이터와 키워드 규칙으로 추천합니다.</p><p><b>Q. 추천을 계속 받을 수 있나요?</b><br>준비된 이름 데이터가 남아 있는 동안 중복 없이 다시 추천할 수 있습니다.</p><p><b>Q. 선택한 이름은 저장되나요?</b><br>현재 사용 중인 브라우저에 저장됩니다. 다른 기기와 자동 동기화되지는 않습니다.</p>'));
$('close-modal').addEventListener('click',()=>{$('info-modal').hidden=true;});
$('info-modal').addEventListener('click',e=>{if(e.target===$('info-modal'))$('info-modal').hidden=true;});
document.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{$('wish').value=btn.dataset.prompt;$('wish').focus();}));
$('wish').value=state.wish||'';
if(state.preferences){$('surname').value=state.preferences.surname||'';$('name-type').value=state.preferences.type||'전체';$('syllables').value=state.preferences.syllables||'2';}
