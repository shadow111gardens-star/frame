import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {copyFileSync} from 'node:fs';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run only through Firestore emulators:exec.');
const tsx=fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs',import.meta.url));
for(const [args,report] of [
  [['--test','tests/designmdFirestore.test.ts'],null],
  [['--test','tests/firestore.rules.test.ts'],null],
  [['--test','tests/designReference.test.ts'],null],
  [['scripts/import-designmd-reference-index.ts','--emulator','--dry-run'],null],
  [['scripts/import-designmd-reference-index.ts','--emulator'],'created'],
  [['scripts/import-designmd-reference-index.ts','--emulator'],'rerun'],
] as const){
  const result=spawnSync(process.execPath,[tsx,...args],{stdio:'inherit',env:process.env});
  if(result.status!==0){process.exitCode=result.status??1;break;}
  if(report)copyFileSync('artifacts/designmd-reference-index-emulator-import-report.json',`artifacts/designmd-reference-index-emulator-${report}-report.json`);
}
