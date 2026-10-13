import {githubSource,importGithubDesignMd} from './designmdGithubImport';
try{
  const source=await githubSource('artifacts/awesome-design-md-source',process.argv.includes('--refresh'));
  const manifest=await importGithubDesignMd({source,outputDirectory:'data/designmd-github'});
  console.info(JSON.stringify({repository:manifest.repository,commit:manifest.commit,complete:manifest.complete,...manifest.counts,outputDirectory:'data/designmd-github',errors:manifest.errors,licensingIssues:manifest.licensingIssues},null,2));
  if(!manifest.complete)process.exitCode=1;
}catch(error){console.error('GitHub DesignMD import failed:',error instanceof Error?error.message:String(error));process.exitCode=1;}
