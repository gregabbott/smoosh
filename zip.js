/*
origin repo
	https://github.com/pwasystem/zip/blob/main/LICENSE
	no license 
	https://archive.ph/hcbZA
	https://web.archive.org/web/0/raw.githubusercontent.com/pwasystem/zip/main/zip.js
below = after modification by GregAbbott 2022_1022 && 2022_1130,
//GA v 2023_0907_0852
*/
var new_zip=({name='',progress_text=false,progress_bar=false})=>{
	//ga: it fails if file/dir names contian non-ascii characters, so remove those.
var make_ascii_and_trim=x=>x.trim().replace(/[^\x00-\x7F]/g, "-"),
gl={//namespace saves passing everything around
	status_text_el:progress_text,
	status_bar_el:progress_bar,
	used_names:{},//2022_1130ga uniquePathPerFile
	zip:{
		unzipped_name: make_ascii_and_trim(name),
		/*2022_1024ga:
		if(no name &&fileS)names folder with the .zip file's name
		if(no name &&1File)the file zipped won't get placed in subfolder
		if(name given)any file(s) in zip will be unzipped into a folder named name
		e.g	zipped name can differ to unzipped.
		'zipped.zip' may unzip to 'extracted'*/
		pre_save_list: [],
		file: []
	}
},
hex2buf=h=>new Uint8Array(h.split(' ').map(x=>parseInt(x,16))),
z_reverse=e=>{
	let r=new Array;for(let t=0;t<e.length;t+=2)
	r[t]=e[t]+""+e[t+1];
	return r.filter((e=>e)).reverse().join(" ")
},
crc32=r=>{
	for(var t,a=[],e=0;e<256;e++){
		t=e;for(var o=0;o<8;o++)t=1&t?3988292384^t>>>1:t>>>1;a[e]=t
	}
	for(var v=-1,f=0;f<r.length;f++)v=v>>>8^a[255&(v^r[f])];
	return z_reverse(((-1^v)>>>0).toString(16).padStart(8,"0"))
},
str2hex=s=>[...new TextEncoder().encode(s)].map(x=>x.toString(16).padStart(2,'0')),
str2dec=s=>Array.from(new TextEncoder().encode(s)),
dec2bin=(dec,size)=>dec.toString(2).padStart(size,'0'),
bin2hex=b=>
	parseInt(b.slice(8),2).toString(16).padStart(2,'0')+' '+
	parseInt(b.slice(0,8),2).toString(16).padStart(2,'0'),
dataURItoUINT=uri=>{
	//convert base64 (jpg / png) data strings to writeable uint
	var byteStr = atob(uri.split(',')[1]),
	ab = new ArrayBuffer(byteStr.length),//to buffer
	ia = new Uint8Array(ab)//buffer to uintarray
	for (var i = 0; i < byteStr.length; i++) {
		ia[i] = byteStr.charCodeAt(i)
	}//toblob:return new Blob([ab])
	return [...ia]//uint
},
getModTime=date=>{
var t=new Date(date),
f=dec2bin,
y=f(t.getFullYear()-1980,7),
M=f(t.getMonth()+1,4),
d=f(t.getDate(),5),
h=f(t.getHours(),5),
m=f(t.getMinutes(),6),
s=f(Math.round(t.getSeconds()/2),5)
return bin2hex(''+h+m+s)+' '+bin2hex(''+y+M+d)
},
ensure_any_path_ends_with_slash=p=>p.length==0||p.endsWith('/')?p:p+'/',
str2zip=str=>[...new Uint8Array(str2dec(str))],
use_closest_available_name=({path,name,ext,n=''})=>{
	var base=name+(n==''?'':' ('+n+')')
	if(gl.used_names[path+base+ext]){
		return use_closest_available_name({
			path,name,ext,n:n==''?1:n++//increment
		})
	}
	gl.used_names[path+base+ext]=1//add to used names
	return base//available
},
if_extension_ensure_starts_with_dot=e=>e.length==0||e.startsWith('.')?e:'.'+e,
add_item=({kind})=>({path='',name='',ext='',content='',date=new Date()})=>{
	path=ensure_any_path_ends_with_slash(make_ascii_and_trim(path))
	name=make_ascii_and_trim(name.replaceAll('/',":"))
	ext=if_extension_ensure_starts_with_dot(make_ascii_and_trim(ext))
	if(name.length>0)name=use_closest_available_name({path,name,ext})
	gl.zip.pre_save_list.push({
		uintData:
			kind=='image'?dataURItoUINT(content)
			:str2zip(content),
		date:new Date(date),
		fileUrl:''+path+name+ext
	})
},
ms_to_mm_ss=ms=>new Date(ms).toISOString().slice(14,19),
setup_update_progress=n_total=>{
	var o={began:Date.now(),n_done:0}
	return ()=>{
		o.n_done++
		o.ms_gone =Date.now()-o.began
		o.p_done = o.n_done>=n_total?100:Math.floor(o.n_done/(n_total/100))
		o.n_todo = n_total-o.n_done
		o.avg=/*msPerItem*/o.ms_gone/o.n_done
		if(gl.status_text_el){
			gl.status_text_el.innerText=
			`Done: ${o.n_done} of ${n_total} (${o.p_done}%) in ${/*elapsed*/ms_to_mm_ss(o.ms_gone)}. `+
			`Left: ${o.n_todo} (~${ms_to_mm_ss(o.n_todo* (o.avg))}). `+
			`Average: ${ms_to_mm_ss(o.avg)} per item.`
		}
		if(gl.status_bar_el)gl.status_bar_el.style.width=Math.min(100,o.p_done)+'%'
	}
}
function get_zip(){
	let count=0,
	cdfh='',//central_directory_file_header
	directoryInit=0,
	offSetLocalHeader='00 00 00 00'
	var update_progress=false
	if(gl.status_text_el||gl.status_bar_el){
		update_progress=setup_update_progress(
			gl.zip.pre_save_list.length
		)
	}
	var main_path=ensure_any_path_ends_with_slash(make_ascii_and_trim(gl.zip.unzipped_name))
	gl.zip.pre_save_list.forEach(item=>{
		var full_path=main_path+item.fileUrl,
		size=z_reverse(parseInt(item.uintData.length).toString(16).padStart(8,'0')),
		nameFile=str2hex(full_path).join(' '),
		nameSize=z_reverse(full_path.length.toString(16).padStart(4,'0')),
		reused_piece=`${getModTime(item.date)} ${crc32(item.uintData)} `+
		`${size} ${size} ${nameSize} `
		fileHeaderBuffer=hex2buf(`50 4B 03 04 14 00 00 00 00 00 `+
		`${reused_piece}00 00 ${nameFile}`)
		directoryInit+=fileHeaderBuffer.length+item.uintData.length
		cdfh+=`50 4B 01 02 14 00 14 00 00 00 00 00 `+
		reused_piece+
		`00 00 00 00 00 00 01 00 20 00 00 00 `+
		`${offSetLocalHeader} ${nameFile} `
		offSetLocalHeader=z_reverse(directoryInit.toString(16).padStart(8,'0'))
		gl.zip.file.push(fileHeaderBuffer,new Uint8Array(item.uintData))
		count++
		if(update_progress){update_progress()}
	})
	cdfh=cdfh.trim()
	let entries=z_reverse(count.toString(16).padStart(4,'0')),
	dirSize=z_reverse(cdfh.split(' ').length.toString(16).padStart(8,'0')),
	dirInit=z_reverse(directoryInit.toString(16).padStart(8,'0')),
	centralDirectory=`50 4b 05 06 00 00 00 00 `+
	`${entries} ${entries} ${dirSize} ${dirInit} `+
	`00 00`
	gl.zip.file.push(hex2buf(cdfh),hex2buf(centralDirectory))
  return [...gl.zip.file]
}
function save(zippedName){
  let finished_zip= get_zip()
  let a = document.createElement('a')
	a.href = URL.createObjectURL(
		new Blob(finished_zip,{type:'application/octet-stream'})
	)
	a.download = zippedName+`.zip`
	a.click()
	a.remove()

}
gl.zip.add_text_file=add_item({kind:'text'})
gl.zip.add_image_file=add_item({kind:'image'})
gl.zip.add_folder=add_item({kind:'folder'})
gl.zip.get=get_zip//zip data without saving
gl.zip.save=save
return gl.zip
}