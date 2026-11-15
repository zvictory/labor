// Current batch watcher. Exits after all requested assets are ingested.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const directory = path.join(root, 'docs/design/note-library-v1');
const total = JSON.parse(fs.readFileSync(path.join(directory, 'jobs.json'),'utf8')).length;
let previous = -1;
function update() {
  try {
    const count = [1,2,3].reduce((sum,queue)=>{
      const file=path.join(directory,`manifest-${queue}.json`);
      return sum+(fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).length:0);
    },0);
    if(count!==previous){
      const result=spawnSync(process.execPath,[path.join(__dirname,'sync-library.cjs')],{cwd:root,encoding:'utf8'});
      if(result.status!==0) throw new Error(result.stderr);
      process.stdout.write(result.stdout);
      previous=count;
    }
    if(count===total){clearInterval(timer);process.exitCode=0;}
  } catch(error){if(!(error instanceof SyntaxError)) console.error(error.message);}
}
const timer=setInterval(update,5000);
update();
