try {

async function createOffscreen() {
  await chrome.offscreen.createDocument({
	url: 'offscreen.html',
	reasons: ['BLOBS'],
	justification: 'Keep service worker running',
  }).catch(() => {});
}

function createOffscreen2() {
	if(createOffscreen!==null){
		createOffscreen();
		createOffscreen=null;
	}
}

chrome.runtime.onStartup.addListener(createOffscreen2);
createOffscreen2();
	
function getUrl(tab) {
	return (tab.url == "" && !!tab.pendingUrl && typeof tab.pendingUrl !== 'undefined' && tab.pendingUrl != '') ? tab.pendingUrl : tab.url;
}

function removeRuns(arr){
	let c=arr[0];
	let out=[arr[0]];
	let len=arr.length;
	let i=1;
	if(arr.length>0){
		while(i<len){
			let a=arr[i];
			if(a!==c){
				out.push(a);
				c=a;
			}
			i++;
		}
	}
	return out;
}

function isChrTab(tu) {
	return ( (tu.startsWith('chrome://') && tu!=='chrome://newtab/') || tu.startsWith('chrome-extension://') ||  (tu.startsWith('about:') && !tu.startsWith('about:blank') ) )?true:false;
}

function isSimilarURL(url1, url2) {
    try {
        const u1 = new URL(url1);
        const u2 = new URL(url2);
        return (
                 u1.hostname === u2.hostname && 
                 u1.pathname === u2.pathname
               );
    } catch(e) {
        return url1 === url2;
    }
}

var f_queue=[]; 
var prg=false;

var blacklist=[];
var whitelist=[];
var aggressive_disc=false;
var ac_tab={cu:null, op:null, ls:null};

function set__ac_tab(tab){
	ac_tab.ls=ac_tab.cu;
	ac_tab.cu=tab.id;
	ac_tab.op=(tab.openerTabId!==null && typeof tab.openerTabId!=='undefined')?tab.openerTabId:null;
}

async function setActiveTab(id,nm){
	return new Promise(function(resolve) {
		if(id===null || typeof id==='undefined'){
			chrome.tabs.query({active: true, currentWindow:true},(tabs)=>{ if (!chrome.runtime.lastError) {
				set__ac_tab(tabs[0]);
				}
				resolve();
			});
		}else{
			chrome.tabs.get(id, function(tab) { if (!chrome.runtime.lastError) {
								set__ac_tab(tab);
								let ix=tbs.findIndex((t)=>{return t.id===id;}); if(ix>=0){
									tbs[ix].fcns.push(nm);
									if(!tbs[ix].disc.includes('ineligible')){
										if(!tbs[ix].disc.includes('1st_act')){
											tbs[ix].disc.push('1st_act');
										}else{
											tbs[ix].disc.push('ineligible');
										}
									}
								}
						}	
						resolve();
				});
		}
	});
}

(async ()=>{ await setActiveTab(); })();

var tbo=JSON.stringify({id:-3, op_id:-2,urls:[], op_url:null, disc: [], fcns: []});
var tbs=[];

function removeEls(d, array){
	var newArray = [];
	for (let i = 0; i < array.length; i++)
	{
		if (array[i] != d)
		{
			newArray.push(array[i]);
		}
	}
	return newArray;
}

/*function arr_match(a,b,strict){
	let m=false;
	if(a.length>0 && b.length>0){
		for (let i = 0, len=b.length; i < len; i++){
			if(a.includes(b[i])   && ( (strict===true && a.length===1) || (strict===false) )  ){
				m=true;
				break;
			}
		}
	}
	return m;
}*/

function findIndexTotalInsens(string, substring, index) {
    string = string.toLocaleLowerCase();
    substring = substring.toLocaleLowerCase();
    for (let i = 0; i < string.length ; i++) {
        if ((string.includes(substring, i)) && (!(string.includes(substring, i + 1)))) {
            index.push(i);
            break;
        }
    }
    return index;
}

function blacklistMatch(array, t) {
    var found = false;
	var blSite='';
    if (!((array.length == 1 && array[0] == "") || (array.length == 0))) {
        ts = t.toLocaleLowerCase();
        for (var i = 0; i < array.length; i++) {
            let spl = array[i].split('*');
            spl = removeEls("", spl);

            var spl_mt = [];
            for (let k = 0; k < spl.length; k++) {
                var spl_m = [];
                findIndexTotalInsens(ts, spl[k], spl_m);

                spl_mt.push(spl_m);


            }

            found = true;

            if ((spl_mt.length == 1) && (typeof spl_mt[0][0] === "undefined")) {
                found = false;
            } else if (!((spl_mt.length == 1) && (typeof spl_mt[0][0] !== "undefined"))) {

                for (let m = 0; m < spl_mt.length - 1; m++) {

                    if ((typeof spl_mt[m][0] === "undefined") || (typeof spl_mt[m + 1][0] === "undefined")) {
                        found = false;
                        m = spl_mt.length - 2; //EARLY TERMINATE
                    } else if (!(spl_mt[m + 1][0] > spl_mt[m][0])) {
                        found = false;
                    }
                }

            }
            blSite = (found) ? array[i] : blSite;
            i = (found) ? array.length - 1 : i;
        }
    }
    //console.log(found);
    return [found,blSite];

}

function restore_options()
{
	if(typeof chrome.storage==='undefined'){
		restore_options();
	}else{
	chrome.storage.sync.get(null, function(items){
		
		if (Object.keys(items).length != 0)
		{

			if(!!items.bList && typeof  items.bList!=='undefined'){
				blacklist=items.bList.split('\n').join('').split(',');
			}		
			
			if(!!items.wList && typeof  items.wList!=='undefined'){
				whitelist=items.wList.split('\n').join('').split(',');
			}		
			if(!!items.aggDisc && typeof  items.aggDisc!=='undefined'){
				aggressive_disc=items.aggDisc;
			}
			
			/*if(!!items.ovrA && typeof  items.ovrA!=='undefined'){
				overrideA=items.ovrA;
			}*/
		
		}else{
			save_options();
		}
	});
	}
}

function save_options()
{
		chrome.storage.sync.clear(function() {
				chrome.storage.sync.set(
				{
					bList: "",
					wList: "",
					aggDisc: false,
					ovrA: false
				}, function(){
					console.log('Default options saved.');
					restore_options();
				});
		});

}

function initialise(){
	chrome.tabs.query({}, function(tabs) { if (!chrome.runtime.lastError) {
			for (let t = 0; t < tabs.length; t++) {
				let tb=JSON.parse(tbo);
				tb.id=tabs[t].id;
				tb.urls.unshift(getUrl(tabs[t]));
				tb.disc.push('initial');
				if(aggressive_disc && tabs[t].discarded===true){
					tb.disc.push('ineligible');
				}
				tbs.push(tb);
			}
		}});
}

async function tabs_remove(d){
	return new Promise(function(resolve) {
			chrome.tabs.remove(d, ()=>{
				resolve();
			});
	});
}

async function tabs_update(d, obj){
	return new Promise(function(resolve) {
			chrome.tabs.update(d, obj, (tab)=>{
				resolve();
			});
	});
}

async function tabs_discard(d){
	return new Promise(function(resolve) {
				chrome.tabs.discard(d, function(tab){
						resolve();
				});
	});
}

async function replaceTabs(r,a){
	return new Promise(function(resolve) {
		ac_tab.ls=(ac_tab.ls===r)?a:ac_tab.ls;
		ac_tab.cu=(ac_tab.cu===r)?a:ac_tab.cu;
		ac_tab.op=(ac_tab.op===r)?a:ac_tab.op;
		for(let i=tbs.length-1; i>=0; i--){
			let tb=tbs[i];
			
			if(tb.id===r){
				tb.id=a;
			}
			if(tb.op_id===r){
				tb.op_id=a;
			}
		}
		resolve();
	});
}

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	fq_loop( async ()=>{ await replaceTabs(removedTabId,addedTabId); });
});


chrome.windows.onCreated.addListener((window) => {
    fq_loop( async ()=>{ await windowProc(window); });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	fq_loop( async ()=>{ await setActiveTab(activeInfo.tabId,'activated'); });
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo){
	(async () => {
		tbs=tbs.filter((t)=>{return t.id!==tabId;});
    })();
});

async function windowProc(window){
	return new Promise(function(resolve) {
		if (window.type==='popup'){
		chrome.tabs.query({windowId: window.id}, function(tabs) {
				let xmp=false;
				for (let t = 0; t < tabs.length; t++) {
					let t_url=getUrl(tabs[t]);
					let chr_tab=isChrTab(t_url);
					let isWl=blacklistMatch(whitelist,t_url);
					if(chr_tab || isWl[0]){
						xmp=true;
						break;
					}
			}
			if(!xmp){
				chrome.windows.remove(window.id,()=>{resolve();});
			}else{
				resolve();
			}
	});
	}else{
		resolve();
	}
	});
}

chrome.windows.onCreated.addListener((window) => {
	fq_loop( async ()=>{ await windowProc(window); });
});

async function rem_disc(b,d,n,tb,dbg,op_host,tb_host){
	return new Promise(function(resolve) {
		if(b){	
			(async ()=>{ await tabs_remove(d); })();
			printDebug('TAB REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
		}else if(!n){
			if( op_host!==null && op_host!==tb_host ){
				chrome.tabs.move(tb.id, {index: ( (tb.index<=1)?tb.index:tb.index-1 ) });
			}
			(async ()=>{ await tabs_discard(d); })();
			printDebug('TAB DISCARDED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
		}else{
			printDebug('TAB NOT DISCARDED OR REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
		}
		resolve();
	});
}

async function tabDiscrd(details,ix,noDiscard,dbg){
return new Promise(function(resolve) {
	chrome.tabs.get(details.tabId, function(tab) { if (!chrome.runtime.lastError) {

					let isBl=blacklistMatch(blacklist,details.url);
					let isWl=blacklistMatch(whitelist,details.url);
					let op_exist=(tab.openerTabId!==null && typeof tab.openerTabId!=='undefined')?true:false; 
					let tb=tbs[ix]; //new tab - duplicate(?) of original tab
					let op_host=(tb.op_url===null)?tb.op_url:tb.op_url.split('/')[2];
					let tb_host=dbg[0].split('/')[2];
			 if(!isWl[0]){
						if(op_exist){
										
										let dupl=false;
										let og_ix=tbs.findIndex((t)=>{return t.id===tab.openerTabId;});
																				
										if(	(  ( tbs[og_ix].urls[0].split('/')[2]!==op_host ) && (ac_tab.cu!==tb.id || ac_tab.ls===tb.op_id)  ) || ( isSimilarURL(getUrl(tab),tb.op_url) ) ){
											dupl=true;
										}
										
								if(dupl){
										let isWl2=null;
										isWl2=blacklistMatch(whitelist,tbs[ix].urls[0]);
									if( isWl2[0]===false){
											if(ac_tab.cu!==details.tabId){
												(async ()=>{ 
													await tabs_update(details.tabId,{highlighted: true});
													await tabs_update(tab.openerTabId,{highlighted: false});
												})();
											}
											
											chrome.tabs.get(tab.openerTabId, function(tab_op) { if (!chrome.runtime.lastError) {
													(async ()=>{ 
														await rem_disc(isBl[0],tab.openerTabId,false,tab_op,[getUrl(tab_op),tbs[og_ix],details,ac_tab],op_host,tb_host);
													})();
											}});

									}else{
										printDebug('TAB NOT DISCARDED OR REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
									}
									
								}else{
									let isWl2=null;
										isWl2=blacklistMatch(whitelist,tbs[ix].op_url);
									if( isWl2[0]===false && ( ac_tab.cu!==tab.openerTabId || aggressive_disc ) ){
										
										
										(async ()=>{ 
											await tabs_update(tab.openerTabId,{highlighted: true});
											await tabs_update(details.tabId,{highlighted: false});
											await rem_disc(isBl[0],details.tabId,noDiscard,tab,dbg,op_host,tb_host);
										})();
										
									}else{
										printDebug('TAB NOT DISCARDED OR REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
									}
							}
						}else if( !aggressive_disc || ac_tab.cu!==ac_tab.ls){
							if(ac_tab.ls!==details.tabId){
								(async ()=>{ await tabs_update(ac_tab.ls,{highlighted: true}); })();
							}
							
							(async ()=>{ 
								await tabs_update(details.tabId,{highlighted: false});
								await rem_disc(isBl[0],details.tabId,noDiscard,tab,dbg,op_host,tb_host); 
							})();
								
					}else{
						printDebug('TAB NOT DISCARDED OR REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
					}
			}else{
				printDebug('TAB NOT DISCARDED OR REMOVED: '+dbg[0],dbg[1],dbg[2],dbg[3]);
			}
			
		if(!noDiscard){
						if(!tbs[ix].disc.includes('ineligible')){
							tbs[ix].disc.push('ineligible');
						}
		}

}

			resolve();
}); 
});
}

function printDebug(s,a,d,c){
	console.group(s);
	console.log(JSON.stringify(a));
	console.log(JSON.stringify(d));
	console.log(JSON.stringify(c));
	console.groupEnd();
}


async function wnd_chk(details, tt2, du){
	return new Promise(function(resolve) {
					chrome.tabs.get(details.tabId, function(tab) { if (!chrome.runtime.lastError) {
							chrome.windows.get(tab.windowId, {populate: true},function(window){  if (!chrome.runtime.lastError) {
									if(typeof window.tabs==='undefined' || window.tabs.length>1){						
										(async ()=>{ await tabDiscrd(details, ix,tt2,[du,tbs[ix],details,ac_tab]); })();	
									}
								}else{
									(async ()=>{ await tabDiscrd(details, ix,tt2,[du,tbs[ix],details,ac_tab]); })();
								}
							});	
					}
					resolve();
				});
	});
}

async function wnoc(details){
return new Promise(function(resolve) {
		ix=tbs.findIndex((t)=>{return (t.id)===(details.tabId);});
if(details.frameId==0){
		let du=details.url;
	if(ix>=0 && 
		(  (tbs[ix].disc.length>1 && tbs[ix].disc.at(-1)==='ineligible' && tbs[ix].disc.at(-2) !=='ineligible') ||
			( !tbs[ix].disc.includes('ineligible') )	
		)
	){
	if(aggressive_disc){
		
		if(	!tbs[ix].disc.includes('ineligible')  &&
				!tbs[ix].urls.at(-1).startsWith('about:') &&
				!tbs[ix].urls.at(-1).startsWith('chrome://') &&
				!tbs[ix].urls.at(-1).startsWith('chrome-extension://') &&
				tbs[ix].op_id!==-2 &&
				!du.startsWith('about:blank')
			){
				 (async ()=>{ await  wnd_chk(details, false, du); })();	
			}
	}else{
		//let tq=arr_match(details.transitionQualifiers,["server_redirect"],true);
		let tt=(["typed","auto_bookmark","manual_subframe","start_page","reload","keyword"].includes(details.transitionType))?true:false;
		let tt2=(["form_submit","keyword_generated","generated"].includes(details.transitionType))?true:false;

			let fcns_rr=removeRuns(tbs[ix].fcns);
			if(	!tbs[ix].disc.includes('ineligible')  &&
					!tt && 
					!tbs[ix].urls.at(-1).startsWith('about:') &&
					!du.startsWith('about:blank') &&
					tbs[ix].op_id!==-2 &&
					(fcns_rr[0]==='created' && fcns_rr[1]==='activated')
				){
					(async ()=>{ await  wnd_chk(details, tt2, du); })();
			}else{
				if(!tbs[ix].disc.includes('ineligible')){
					tbs[ix].disc.push('ineligible');
				}
				printDebug('NOT DISCARDED OR REMOVED: '+du,tbs[ix],details,ac_tab);		
			}
	}
	}else if(ix<0){
				printDebug('NOT DISCARDED OR REMOVED: '+du,'Not in tabs array!',details,ac_tab);	
	}
}
	resolve();
});
}

chrome.webNavigation.onCommitted.addListener((details) => {
			fq_loop( async ()=>{ await wnoc(details); });
});

async function onTabUpdated(tabId, changeInfo, tab,nm) {
	if(changeInfo.url){
		let ix=tbs.findIndex((t)=>{return (t.id)===(tabId);}); if(ix>=0){
			tbs[ix].fcns.push(nm);
			tbs[ix].urls.unshift(changeInfo.url);
		}	
	}
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	fq_loop( async ()=>{ await onTabUpdated(tabId, changeInfo, tab,'updated'); });
});

async function onTabCreated(tab,nm) {
	let tb=JSON.parse(tbo);
	tb.id=tab.id;
	tb.op_id=(tab.openerTabId!==null && typeof tab.openerTabId!=='undefined')?tab.openerTabId:-2;
	tb.urls.unshift(getUrl(tab));
	tb.disc.push('first');
	tb.fcns.push(nm);
	if(tb.op_id!==-2){
		chrome.tabs.get(tb.op_id, function(tab_op) { if (!chrome.runtime.lastError) {
			tb.op_url=getUrl(tab_op);
			tbs.push(tb);
		}});
	}else{
		tbs.push(tb);
	}
}

chrome.tabs.onCreated.addListener((tab)=>{
	fq_loop( async ()=>{ await onTabCreated(tab,'created'); });
});

restore_options();

initialise();

async function fq_loop(f){
	f_queue.push(f);
	if(prg===false){
		while(f_queue.length>0){
			prg=true;
			f_queue[0]();
			f_queue=f_queue.slice(1);
		}
		prg=false;
	}
}

} catch (e) {
  console.error(e);
}
