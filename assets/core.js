export const SCHEMA = 'waypoint.report.v1';
export function safeUrl(value) {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error('Use an HTTP or HTTPS URL without credentials.');
  return u.origin + u.pathname;
}
const str = (v, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
const finite = (v, max = 20000) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Number(v))) : 0;
const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const checkStatuses = {pass:'passed',passed:'passed',fail:'failed',failed:'failed',warning:'review',review:'review','not-tested':'not-tested'};
function imageData(value) { return typeof value === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 6000000 ? value : null; }
function nativeTarget(value){
  const x=obj(value),platform=str(x.platform,30).toLowerCase();
  if(!['android','ios'].includes(platform) || typeof x.appId!=='string' || !x.appId.trim() || x.appId.length>200)throw new Error('Native reports require an Android or iOS platform and an app identifier.');
  return {kind:'native',platform:platform==='ios'?'iOS':'Android',appId:x.appId.trim()};
}
function reportTarget(raw){
  if(raw.target?.kind==='native'){const target=nativeTarget(raw.target);return {target,url:`app://${target.platform.toLowerCase()}/${encodeURIComponent(target.appId)}`};}
  return {target:{kind:'web'},url:safeUrl(raw.url)};
}
function evidence(value) {
  const x=obj(value),rect=obj(x.rect||x.bounds||x.rectangle);
  return {description:str(x.description),screenshotId:str(x.screenshotId||x.id,100),rect:Object.keys(rect).length?{x:finite(rect.x),y:finite(rect.y),width:finite(rect.width),height:finite(rect.height)}:null};
}
export function normalizeReport(raw) {
  if (!raw || raw.schema !== SCHEMA || !Array.isArray(raw.findings) || raw.findings.length > 1000) throw new Error('This is not a supported Waypoint report.');
  const {url,target} = reportTarget(raw);
  const coverage=target.kind==='native'?{scope:'native-attached-session',realDeviceVerified:false,note:'Only commands against the attached Appium session. Device acceptance and complete functional or accessibility coverage are not certified.'}:{scope:'web-document',note:'Main-document checks and explicitly captured evidence. Mobile mode emulates Chrome; cross-browser, device and full accessibility coverage are not certified.'};
  const date = new Date(raw.createdAt);
  if (!Number.isFinite(date.getTime())) throw new Error('The report date is invalid.');
  const screenshot=imageData(raw.screenshot);
  const viewport=obj(raw.viewport),telemetry=obj(raw.telemetry);
  const screenshotDate=new Date(obj(raw.screenshotRef).capturedAt||raw.screenshotCapturedAt);
  const screenshotCapturedAt=Number.isFinite(screenshotDate.getTime())?screenshotDate.toISOString():null;
  const diagnostics=(values,type)=>Array.isArray(values)?values.slice(0,200).map(value=>{const x=obj(value);let u='';try{if(x.url)u=safeUrl(x.url);}catch{}return {level:str(x.level,20),message:str(x.message||x.text||x.error,1000),url:u,status:finite(x.status,599),type:str(x.type||type,60),timestamp:str(x.timestamp,60)};}):[];
  return {schema:SCHEMA,id:str(raw.id,100)||crypto.randomUUID(),url,target,coverage,title:str(raw.title,200),createdAt:date.toISOString(),viewport:{width:finite(viewport.width),height:finite(viewport.height)},screenshot,screenshotCapturedAt,screenshotRef:str(obj(raw.screenshot).id||obj(raw.screenshotRef).id||raw.screenshotRef,100),telemetry:{consoleErrors:diagnostics(telemetry.consoleErrors,'console'),networkFailures:diagnostics(telemetry.networkFailures,'network')},checks:Array.isArray(raw.checks)?raw.checks.slice(0,100).map(value=>{const x=obj(value);return {name:str(x.name,160),status:Object.hasOwn(checkStatuses,x.status)?checkStatuses[x.status]:'not-tested',detail:str(x.detail)};}):[],findings:raw.findings.map((value,i)=>{const x=obj(value);return {id:str(x.id,100)||`finding-${i}`,rule:str(x.rule||x.category,100),category:str(x.category||x.rule,100),title:str(x.title,200)||'Untitled finding',severity:['high','medium','low'].includes(x.severity)?x.severity:'low',kind:['confirmed','bug'].includes(x.kind)?'confirmed':'review',detail:str(x.detail),selector:str(x.selector,600),recommendation:str(x.recommendation),evidence:evidence(x.evidence),status:['open','resolved','dismissed'].includes(x.status)?x.status:'open'};})};
}
export function normalizeJourney(raw) {
  if (!raw || !Array.isArray(raw.steps) || !raw.steps.length || raw.steps.length > 100) throw new Error('A journey must contain between 1 and 100 steps.');
  const steps=raw.steps.map(value=>{
    const x=obj(value);
    if(x.type==='click' && typeof x.selector==='string' && x.selector.trim() && x.selector.length<=500) return {type:'click',selector:x.selector,label:str(x.label,120)};
    if(x.type==='clickText' && typeof x.text==='string' && x.text.trim() && x.text.length<=300) return {type:'clickText',text:x.text};
    if(x.type==='assertText' && typeof x.text==='string' && x.text.trim() && x.text.length<=300) return {type:'assertText',text:x.text};
    throw new Error('Executable journeys support clicks by name, recorded clicks, and visible text checks. Form values are never imported.');
  });
  let origin='';if(raw.origin) origin=new URL(safeUrl(raw.origin)).origin;
  let url='';if(raw.url)url=safeUrl(raw.url);if(!origin && url)origin=new URL(url).origin;
  const created=new Date(raw.createdAt || Date.now());
  const last=obj(raw.lastRun), lastDate=new Date(last.createdAt);
  const lastRun=Number.isFinite(lastDate.getTime())?{createdAt:lastDate.toISOString(),passed:last.passed===true,elapsedMs:finite(last.elapsedMs,3600000),results:Array.isArray(last.results)?last.results.slice(0,100).map(value=>{const x=obj(value);return {index:finite(x.index,99),type:str(x.type,30),label:str(x.label,160),status:str(x.status,40),detail:str(x.detail,1000)};}):[]}:null;
  return {schema:'waypoint.journey.v1',id:str(raw.id,100)||crypto.randomUUID(),title:str(raw.title||raw.name,160)||'Recorded journey',origin,url,createdAt:Number.isFinite(created.getTime())?created.toISOString():new Date().toISOString(),viewport:{width:finite(obj(raw.viewport).width),height:finite(obj(raw.viewport).height)},steps,lastRun};
}
export function parseHumanJourney(instructions) {
  if(typeof instructions!=='string' || instructions.length>30000) throw new Error('Add up to 100 short test instructions.');
  const lines=instructions.split(/\r?\n/).map(line=>line.trim().replace(/^\d+[.)]\s*/, '').replace(/^[-•]\s*/,'')).filter(Boolean);
  if(!lines.length || lines.length>100) throw new Error('Add between 1 and 100 steps.');
  function target(value,line) {
    let text=value.trim();
    if(text.startsWith('"')){try{text=JSON.parse(text);}catch{throw new Error(`Step ${line}: put the complete label inside double quotes.`);}}
    else if((text.startsWith("'")&&text.endsWith("'")) || (text.startsWith('“')&&text.endsWith('”')))text=text.slice(1,-1);
    if(typeof text!=='string' || !text.trim() || text.length>300 || /[\r\n]/.test(text)) throw new Error(`Step ${line}: use a visible label or text up to 300 characters.`);
    return text.trim();
  }
  return lines.map((line,i)=>{
    const click=line.match(/^(?:click|tap|press)\s+(?:on\s+)?(.+)$/i);
    if(click)return {type:'clickText',text:target(click[1],i+1)};
    const check=line.match(/^(?:check|expect|verify|assert)\s+(?:that\s+)?(.+?)(?:\s+(?:is|to be|should be)\s+visible)?$/i);
    if(check)return {type:'assertText',text:target(check[1],i+1)};
    throw new Error(`Step ${i+1}: write Click "button name" or Check "expected text" is visible. Use your connected AI agent for broader instructions.`);
  });
}
export function formatHumanJourney(journey) {
  const steps=Array.isArray(journey)?journey:journey?.steps||[];
  return steps.map(x=>x.type==='assertText'?`Check ${JSON.stringify(x.text)} is visible`:x.type==='clickText'?`Click ${JSON.stringify(x.text)}`:`Click ${JSON.stringify(x.label || x.selector)}`).join('\n');
}
export function markdownReport(reports) {
  const clean = x => String(x || '').replace(/[\r\n]+/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\\`*_{}\[\]()#+.!|]/g,'\\$&');
  return '# Waypoint frontend QA report\n\n' + reports.map(r => `## ${clean(r.title || r.url)}\n\nURL: ${clean(r.url)}\n\nChecked: ${r.createdAt}\n\nViewport: ${r.viewport.width} × ${r.viewport.height}\n\n` + r.findings.map(f=>`### ${clean(f.title)}\n\n${f.kind === 'confirmed'?'Observed failure':'Needs review'} · ${f.severity} · ${f.status}\n\n${clean(f.detail)}\n\nSuggested action: ${clean(f.recommendation)}\n\nElement: ${clean(f.selector)}\n`).join('\n') + '\nLimit: This is a page-level audit, not complete functional or accessibility certification.\n').join('\n');
}

// Imported observations are untrusted app content; retain only bounded visual evidence.
export function normalizeDesignSnapshot(raw) {
  if (!raw || raw.schema !== 'waypoint.design.v1' || !Array.isArray(raw.elements)) throw new Error('Choose a Waypoint design snapshot.');
  let address;
  try { address = new URL(raw.origin); } catch { throw new Error('The snapshot must identify its app origin.'); }
  if (!/^https?:$/.test(address.protocol) || address.username || address.password || address.pathname !== '/' || address.search || address.hash || raw.origin !== address.origin) throw new Error('The snapshot origin must be an HTTP or HTTPS origin without a path or credentials.');
  const width = raw.viewport?.width, height = raw.viewport?.height;
  if (![width,height].every(x=>typeof x==='number' && Number.isFinite(x) && x>0 && x<=10000)) throw new Error('The snapshot needs a valid viewport.');
  const date = new Date(raw.capturedAt);
  if (!raw.capturedAt || !Number.isFinite(date.getTime())) throw new Error('The snapshot needs its original capture date.');
  const clean = value => typeof value==='string' ? value.slice(0,600).replace(/https?:\/\/\S+|\bwww\.\S+/gi,'[link omitted]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email omitted]').replace(/\bBearer\s+[^\s,;]+/gi, '[secret omitted]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[secret omitted]').replace(/\b(?:sk-|gh[pousr]_|github_pat_)[A-Za-z0-9_-]+\b/g,'[secret omitted]').replace(/\b(?:token|password|secret|api[_ -]?key)\s*[:=]\s*\S+/gi,'[secret omitted]').replace(/\b[A-Za-z0-9_-]{32,}\b/g,'[identifier omitted]').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120) : '';
  const css = (value, pattern, limit=80) => typeof value==='string' && value.length<=limit && pattern.test(value) ? value : '';
  const colorPattern=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,%\s+\/-]+\)|transparent|currentcolor)$/i;
  const lengthPattern=/^(?:(?:-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw)?)(?:\s+|$)){1,4}$|^(?:normal|auto|none)$/i;
  const roles = new Set(['button','link','textbox','combobox','checkbox','radio','slider','spinbutton','switch','heading','navigation','main','img','region','dialog','banner','contentinfo','list','listitem','tab','tablist','menu','menuitem','form','search','alert','status','presentation','none']);
  const elements=[], ids=new Set(), tokens={colors:[],fonts:[],fontSizes:[],radii:[],spacing:[]};
  const token=(key,value)=>{if(value && tokens[key].length<24 && !tokens[key].includes(value))tokens[key].push(value);};
  let discarded=0;
  for (const item of raw.elements.slice(0,150)) {
    if (!item || typeof item!=='object' || !/^element-[1-9]\d{0,2}$/.test(item.id) || ids.has(item.id)) {discarded++;continue;}
    const b=item.bounds;
    if (!b || ![b.x,b.y,b.width,b.height].every(x=>typeof x==='number' && Number.isFinite(x)) || b.width<=0 || b.height<=0 || b.x<0 || b.y<0 || b.x>=width || b.y>=height || b.width>width || b.height>height || b.x+b.width>width+0.1 || b.y+b.height>height+0.1) {discarded++;continue;}
    const source = obj(item.style), style={};
    style.display=['block','inline','inline-block','flex','inline-flex','grid','inline-grid','table','list-item'].includes(source.display)?source.display:'block';
    style.layout=['flow','grid','flex-row','flex-column'].includes(source.layout)?source.layout:'flow';
    style.fontFamily=typeof source.fontFamily==='string' && !/url|https|@/i.test(source.fontFamily) ? clean(css(source.fontFamily,/^[\w\s,'".-]{1,120}$/,120)) : '';
    style.fontWeight=css(source.fontWeight,/^(?:[1-9]00|normal|bold)$/);
    for(const key of ['fontSize','lineHeight','borderRadius','gap','padding'])style[key]=css(source[key],lengthPattern);
    for(const key of ['color','backgroundColor','borderColor'])style[key]=css(source[key],colorPattern);
    const tag=typeof item.tag==='string' && /^[a-z][a-z0-9-]{0,23}$/.test(item.tag) ? item.tag : 'div';
    elements.push({id:item.id,parentId:ids.has(item.parentId)?item.parentId:null,tag,role:roles.has(item.role)?item.role:'',name:clean(item.name),kind:['control','heading','region','text','image'].includes(item.kind)?item.kind:'region',bounds:{x:b.x,y:b.y,width:Math.min(b.width,width-b.x),height:Math.min(b.height,height-b.y)},style});
    ids.add(item.id);
    for(const value of [style.color,style.backgroundColor,style.borderColor])token('colors',value);
    token('fonts',style.fontFamily);token('fontSizes',style.fontSize);token('radii',style.borderRadius);token('spacing',style.gap);token('spacing',style.padding);
  }
  const capture=obj(raw.capture);
  return {schema:'waypoint.design.v1',origin:address.origin,title:clean(raw.title),capturedAt:date.toISOString(),viewport:{width,height},elements,tokens,capture:{scanned:finite(capture.scanned,3000),emitted:elements.length,truncated:capture.truncated===true || raw.elements.length>150 || discarded>0,durationMs:finite(capture.durationMs,60000)},limitations:['Visible main document at one viewport only; no iframe, shadow DOM or offscreen coverage.','Only app origin retained; no form values, editable content, page paths, query strings, asset URLs, assets, stylesheets or original source code collected.','Static interface labels can contain user content; review evidence before exporting.','Observed appearance does not establish backend behavior or original implementation.']};
}
