// POTATO V6: local-only extraction. Raw uploaded files never leave the browser.
// PDF and Office parsers load on demand from pinned public CDNs.
const MAX_FILE_BYTES=10*1024*1024;
const MAX_EXTRACTED_CHARS=6500;
const CDN={
  zip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  pdf:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  worker:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
};
const loading=new Map();
function loadLibrary(kind,globalName){
  if(globalThis[globalName])return Promise.resolve(globalThis[globalName]);
  if(loading.has(kind))return loading.get(kind);
  const task=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=CDN[kind];script.async=true;script.crossOrigin='anonymous';
    script.onload=()=>globalThis[globalName]?resolve(globalThis[globalName]):reject(new Error('Không khởi tạo được thư viện đọc tài liệu.'));
    script.onerror=()=>reject(new Error('Không tải được thư viện đọc tài liệu. Kiểm tra kết nối mạng hoặc dùng TXT.'));
    document.head.appendChild(script);
  }).catch(error=>{loading.delete(kind);throw error;});
  loading.set(kind,task);return task;
}
function xmlTexts(xml,localName){
  const dom=new DOMParser().parseFromString(xml,'application/xml');
  if(dom.getElementsByTagName('parsererror').length)throw new Error('Nội dung XML trong file không hợp lệ.');
  const parts=[];
  for(const node of dom.getElementsByTagName('*')){
    if(node.localName===localName && node.textContent?.trim())parts.push(node.textContent.trim());
  }
  return parts.join(' ');
}
function truncateToReference(text){
  const clean=String(text||'').replace(/\r\n?/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
  return {text:clean.slice(0,MAX_EXTRACTED_CHARS),truncated:clean.length>MAX_EXTRACTED_CHARS,characters:clean.length};
}
export async function extractPresentationFile(file){
  if(!file)throw new Error('Hãy chọn một file để tải lên.');
  if(file.size>MAX_FILE_BYTES)throw new Error('File lớn hơn 10 MB. Hãy chọn một bản tài liệu gọn hơn.');
  if(file.size===0)throw new Error('File trống, hãy chọn lại.');
  const ext=file.name?.split('.').pop()?.toLowerCase()||'';
  if(!['txt','md','csv','pdf','docx','pptx'].includes(ext))throw new Error('Hỗ trợ .pdf, .docx, .pptx, .txt, .md và .csv.');
  let text='';
  if(['txt','md','csv'].includes(ext))text=await file.text();
  if(ext==='docx'||ext==='pptx'){
    const zipLib=await loadLibrary('zip','JSZip');
    let zip;
    try{zip=await zipLib.loadAsync(await file.arrayBuffer());}catch{throw new Error('Không đọc được file Office. Hãy kiểm tra file DOCX/PPTX có hợp lệ không.');}
    if(ext==='docx'){
      const documentXml=zip.file('word/document.xml');
      if(!documentXml)throw new Error('Không tìm được nội dung trong file Word.');
      text=xmlTexts(await documentXml.async('string'),'t');
    }else{
      const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
      if(names.length>100)throw new Error('Tài liệu vượt quá 100 slide. Vui lòng xuất bản rút gọn.');
      const slides=[];
      for(let i=0;i<names.length;i++){
        const xml=await zip.files[names[i]].async('string');
        slides.push(`Slide ${i+1}: ${xmlTexts(xml,'t')}`);
      }
      text=slides.join('\n\n');
    }
  }
  if(ext==='pdf'){
    const pdf=await loadLibrary('pdf','pdfjsLib');
    pdf.GlobalWorkerOptions.workerSrc=CDN.worker;
    let doc;
    try{doc=await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      if(doc.numPages>80)throw new Error('PDF có hơn 80 trang. Hãy tải bản tóm tắt hoặc dàn ý.');
      const pages=[];
      for(let i=1;i<=doc.numPages;i++){
        const page=await doc.getPage(i),content=await page.getTextContent();
        pages.push(content.items.map(item=>item.str||'').join(' '));
        if(pages.join(' ').length>MAX_EXTRACTED_CHARS+1000)break;
      }
      text=pages.join('\n\n');
    }catch(error){if(error?.message?.startsWith('PDF có hơn'))throw error;
      throw new Error('Không trích xuất được PDF. Nếu file là ảnh scan, hãy xuất sang TXT hoặc DOCX có văn bản.');
    }finally{try{await doc?.destroy?.();}catch{}}
  }
  const result=truncateToReference(text);
  if(result.text.length<15)throw new Error('Không tìm thấy đủ chữ trong tài liệu. Hãy tải file có văn bản, không phải ảnh scan.');
  return {...result,name:file.name,format:ext.toUpperCase(),size:file.size};
}
