// Local asset ingestion only; generation itself uses the built-in image_gen tool.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../../../..');
const [queue, slug, source] = process.argv.slice(2);
const directory = path.join(root, 'docs/design/note-library-v1');
const jobs = JSON.parse(fs.readFileSync(path.join(directory, `queue-${queue}.json`), 'utf8'));
const job = jobs.find((item) => item.slug === slug);
if (!['1','2','3'].includes(queue) || !job || !source) throw new Error('Invalid queue/slug/source');
const publicFile = path.join(root, 'apps/store/public/notes/labor-library-v1', `${slug}.webp`);
const master = path.join(directory, 'masters', `${slug}.png`);
(async () => {
  const metadata = await sharp(source).metadata();
  const stats = await sharp(source).stats();
  const alpha = stats.channels[3];
  if (!metadata.hasAlpha || !alpha || alpha.min !== 0 || alpha.max === 0) throw new Error('No genuine alpha');
  fs.copyFileSync(source, master);
  await sharp(source).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toFile(publicFile);
  const record = {slug,kind:job.kind,url:`/notes/labor-library-v1/${slug}.webp`,master:path.relative(root,master),width:640,height:640,hasAlpha:true,bytes:fs.statSync(publicFile).size};
  const manifest = path.join(directory, `manifest-${queue}.json`);
  const lock = `${manifest}.lock`;
  const started = Date.now();
  let handle;
  while (handle === undefined) {
    try { handle = fs.openSync(lock, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST' || Date.now()-started > 10000) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  try {
    const entries = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest,'utf8')) : [];
    const updated = [...entries.filter(item=>item.slug!==slug),record];
    fs.writeFileSync(`${manifest}.tmp`,JSON.stringify(updated,null,2));
    fs.renameSync(`${manifest}.tmp`,manifest);
    console.log(JSON.stringify({saved:slug,kind:job.kind,count:updated.length}));
  } finally { fs.closeSync(handle); fs.unlinkSync(lock); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
