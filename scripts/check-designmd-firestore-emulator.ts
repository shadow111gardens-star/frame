import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {copyFileSync} from 'node:fs';

if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run only through Firestore emulators:exec.');
const tsx=fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs',import.meta.url));
// Run files sequentially: the existing rules tests clear the emulator database.
for(const [args,report] of [
  [['--test','tests/designmdFirestore.test.ts'],null],
  [['--test','tests/firestore.rules.test.ts'],null],
  [['scripts/import-designmd-firestore.ts','--emulator','--dry-run'],'dry-run'],
  [['scripts/import-designmd-firestore.ts','--emulator'],'created'],
  [['scripts/import-designmd-firestore.ts','--emulator'],'rerun'],
] as const){
  const result=spawnSync(process.execPath,[tsx,...args],{stdio:'inherit',env:process.env});
  if(result.status!==0){process.exitCode=result.status??1;break;}
  if(report)copyFileSync('artifacts/designmd-firestore-emulator-report.json',`artifacts/designmd-firestore-emulator-${report}-report.json`);
}
