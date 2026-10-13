import type {QualityIssue} from './designQuality';
/** Captures are evidence, not a reason to spend another request. */
export function materialRenderedDefects(issues:QualityIssue[]){
  return issues.filter(issue=>issue.severity==='error'||issue.code==='navigation'||issue.code==='contrast');
}
