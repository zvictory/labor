const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'../../../..');
const directory=path.join(root,'docs/design/note-library-v1');
const entries=[1,2,3].flatMap(queue=>{const file=path.join(directory,`manifest-${queue}.json`);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];}).sort((a,b)=>a.slug.localeCompare(b.slug));
const page=Number(process.argv[2]??0);const rows=entries.slice(page*30,(page+1)*30);if(!rows.length)throw new Error('No images for page');
const tile=224;const composites=[];
(async()=>{for(const [i,row]of rows.entries()){const x=i%5*tile,y=Math.floor(i/5)*tile;composites.push({input:await sharp(path.join(root,'apps/store/public',row.url)).resize(184,184,{fit:'inside'}).png().toBuffer(),left:x+20,top:y+8});const label=row.slug.slice(0,29).replace(/&/g,'&amp;').replace(/</g,'&lt;');composites.push({input:Buffer.from(`<svg width="224" height="30"><text x="112" y="16" text-anchor="middle" font-family="Arial" font-size="11" fill="#333">${label}${row.kind==='concept'?' · repr.':''}</text></svg>`),left:x,top:y+193});}const file=path.join(directory,`review-${page}.png`);await sharp({create:{width:tile*5,height:tile*Math.ceil(rows.length/5),channels:4,background:'#F4F1EA'}}).composite(composites).png().toFile(file);console.log(JSON.stringify({file,count:rows.length,total:entries.length}));})();
