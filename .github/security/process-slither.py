#!/usr/bin/env python3
"""
Slither Results Processor for PayRox Go Beyond
Filters and categorizes security findings for CI/CD pipeline
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any

def load_slither_report(report_path: str) -> Dict[str, Any]:
    """Load Slither JSON report"""
    try:
        with open(report_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading Slither report: {e}")
        return {}

def categorize_findings(results: Dict[str, Any]) -> Dict[str, List[Any]]:
    """Categorize findings by severity"""
    categories = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': [],
        'informational': []
    }
    
    if 'results' not in results:
        return categories
    
    for detector in results['results']['detectors']:
        impact = detector.get('impact', '').lower()
        confidence = detector.get('confidence', '').lower()
        
        # Critical: High impact + High confidence
        if impact == 'high' and confidence == 'high':
            categories['critical'].append(detector)
        # High: High impact + Medium confidence OR Medium impact + High confidence
        elif (impact == 'high' and confidence == 'medium') or \
             (impact == 'medium' and confidence == 'high'):
            categories['high'].append(detector)
        # Medium: Medium impact + Medium confidence OR High impact + Low confidence
        elif (impact == 'medium' and confidence == 'medium') or \
             (impact == 'high' and confidence == 'low'):
            categories['medium'].append(detector)
        # Low: Low impact OR Low confidence
        elif impact == 'low' or confidence == 'low':
            categories['low'].append(detector)
        else:
            categories['informational'].append(detector)
    
    return categories

def generate_summary_markdown(categories: Dict[str, List[Any]], output_dir: str) -> None:
    """Generate markdown summary of findings"""
    summary_path = os.path.join(output_dir, 'slither-summary.md')
    
    total_findings = sum(len(findings) for findings in categories.values())
    
    with open(summary_path, 'w') as f:
        f.write("# 🐍 Slither Security Analysis Summary\n\n")
        
        if total_findings == 0:
            f.write("✅ **No security issues found!**\n\n")
            f.write("The PayRox Go Beyond contracts passed all Slither security checks.\n")
            return
        
        f.write(f"📊 **Total Findings**: {total_findings}\n\n")
        
        # Critical findings
        if categories['critical']:
            f.write(f"🚨 **Critical Issues**: {len(categories['critical'])}\n")
            for finding in categories['critical']:
                f.write(f"- **{finding['check']}**: {finding['description']}\n")
            f.write("\n")
        
        # High severity findings
        if categories['high']:
            f.write(f"⚠️ **High Severity**: {len(categories['high'])}\n")
            for finding in categories['high']:
                f.write(f"- **{finding['check']}**: {finding['description']}\n")
            f.write("\n")
        
        # Medium severity findings
        if categories['medium']:
            f.write(f"🔶 **Medium Severity**: {len(categories['medium'])}\n")
            for finding in categories['medium']:
                f.write(f"- **{finding['check']}**: {finding['description']}\n")
            f.write("\n")
        
        # Low severity findings
        if categories['low']:
            f.write(f"🔷 **Low Severity**: {len(categories['low'])}\n")
            f.write(f"*(Note: {len(categories['low'])} low-severity findings - see full report for details)*\n\n")
        
        # Recommendations
        f.write("## 🔧 Recommendations\n\n")
        if categories['critical']:
            f.write("1. **Immediate Action Required**: Address all critical issues before deployment\n")
        if categories['high']:
            f.write("2. **High Priority**: Review and fix high-severity findings\n")
        if categories['medium']:
            f.write("3. **Medium Priority**: Consider fixing medium-severity findings\n")
        
        f.write("\n📝 *Full detailed report available in security artifacts*\n")

def save_critical_issues(categories: Dict[str, List[Any]], output_dir: str) -> None:
    """Save critical issues to separate JSON for CI/CD failure checks"""
    critical_path = os.path.join(output_dir, 'critical-issues.json')
    
    with open(critical_path, 'w') as f:
        json.dump(categories['critical'], f, indent=2)

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 process-slither.py <slither-report.json>")
        sys.exit(1)
    
    report_path = sys.argv[1]
    output_dir = os.path.dirname(report_path)
    
    if not os.path.exists(report_path):
        print(f"Error: Report file {report_path} not found")
        sys.exit(1)
    
    # Load and process results
    results = load_slither_report(report_path)
    categories = categorize_findings(results)
    
    # Generate outputs
    generate_summary_markdown(categories, output_dir)
    save_critical_issues(categories, output_dir)
    
    # Print summary
    total = sum(len(findings) for findings in categories.values())
    print(f"Slither analysis complete:")
    print(f"  Critical: {len(categories['critical'])}")
    print(f"  High: {len(categories['high'])}")
    print(f"  Medium: {len(categories['medium'])}")
    print(f"  Low: {len(categories['low'])}")
    print(f"  Total: {total}")
    
    # Exit with appropriate code
    if categories['critical']:
        print("❌ Critical issues found - failing build")
        sys.exit(1)
    else:
        print("✅ No critical issues found")
        sys.exit(0)

if __name__ == "__main__":
    main()
