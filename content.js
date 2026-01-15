function removeEls(d, arr){
	return arr.filter((i)=>{return i!==d});
}

function checker(lstChk){
	let validate=true;
	let slSp=lstChk.split('/');
	if (slSp.length === 1){
		return false;
	}else{
		let lspc=lstChk.split('://');
		if (lspc[0] === ""){
			return false;
		}

		if (lspc[lspc.length-1] === ""){
			return false;
		}
		let lspcj=lspc.join('').split('/');
		if (lspcj.length !== removeEls("", lspcj).length){
			return false;
		}
		
	}
	return validate;
}

function setupEvents(){
	window.addEventListener('pointerdown',(e)=>{
		let t=e.target;
		if(t.tagName==='A'){
			let fourB=(e.buttons===4)?true:false;
			if(fourB || e.buttons===1){
				e.preventDefault();
				e.stopPropagation();
				/*if(fourB){// new tab
					window.open(t.href,"_blank");
				}*/
			}
		}
	});
	window.addEventListener('click',(e)=>{
		let t=e.target;
		if(t.tagName==='A' && !t.href.startsWith('data:') ){
			if(checker(t.href)===true){
				let lc=(e.button===0)?true:false;
				let altLc=(e.altKey && lc)?true:false;
				if(!altLc){
					e.preventDefault();
					e.stopPropagation();
				}
				if(lc && !altLc){
					let nm=( e.shiftKey && (!(e.shiftKey && ( e.ctrlKey || e.altKey ) )) )?'':'_blank'; //new window is ''
					nm=( e.shiftKey || e.ctrlKey  )?nm:'_self';
					window.open(t.href, nm);
				}
			}
		}
	});
}

function restore_options()
{
	if(typeof chrome.storage==='undefined'){
		restore_options();
	}else{
		chrome.storage.sync.get(null, function(items){
			if (Object.keys(items).length != 0){
				//console.log(items);
				
				if(!!items.ovrA && typeof  items.ovrA!=='undefined'){
					if(items.ovrA==true){
						setupEvents();
					}
				}
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
	}, function()
	{
		console.log('Default options saved.');
		restore_options();
	});
		});

}

restore_options();



