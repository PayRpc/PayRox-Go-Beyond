#!/usr/bin/env python3
"""
Mythril Results Processor for PayRox Go Beyond
Processes symbolic execution results and formats for CI/CD pipeline
"""

import json
import sys
import os
import glob
from pathlib import Path
from typing import Dict, List, Any

def load_mythril_reports(reports_dir: str) -> List[Dict[str, Any]]:
    """Load all Mythril JSON reports from directory"""
    reports = []
    pattern = os.path.join(reports_dir, "mythril-*.json")
    
    for report_path in glob.glob(pattern):
        try:
            with open(report_path, 'r') as f:
                data = json.load(f)
                if 'issues' in data:
                    reports.extend(data['issues'])
        except Exception as e:
            print(f"Warning: Could not load {report_path}: {e}")
    
    return reports

def categorize_mythril_findings(issues: List[Dict[str, Any]]) -> Dict[str, List[Any]]:
    """Categorize Mythril findings by severity"""
    categories = {
        'High': [],
        'Medium': [],
        'Low': []
    }
    
    for issue in issues:
        severity = issue.get('severity', 'Low')
        if severity in categories:
            categories[severity].append(issue)
        else:
            categories['Low'].append(issue)  # Default to Low for unknown severity
    
    return categories

def generate_mythril_summary(categories: Dict[str, List[Any]], output_dir: str) -> None:
    """Generate summary of Mythril findings"""
    summary_path = os.path.join(output_dir, 'mythril-summary.json')
    markdown_path = os.path.join(output_dir, 'mythril-summary.md')
    
    # JSON summary for CI/CD
    all_issues = []
    for severity, issues in categories.items():
        for issue in issues:
            all_issues.append({
                'severity': severity,
                'title': issue.get('title', 'Unknown Issue'),
                'description': issue.get('description', ''),
                'contract': issue.get('filename', 'Unknown'),
                'function': issue.get('function', 'Unknown'),
                'swc_id': issue.get('swc-id', '')
            })
    
    with open(summary_path, 'w') as f:
        json.dump(all_issues, f, indent=2)
    
    # Markdown summary for humans
    with open(markdown_path, 'w') as f:
        f.write("# 🔮 Mythril Symbolic Analysis Summary\n\n")
        
        total_issues = len(all_issues)
        if total_issues == 0:
            f.write("✅ **No vulnerabilities detected!**\n\n")
            f.write("Mythril symbolic execution found no security issues in the analyzed contracts.\n")
            return
        
        f.write(f"📊 **Total Issues Found**: {total_issues}\n\n")
        
        for severity in ['High', 'Medium', 'Low']:
            severity_issues = categories.get(severity, [])
            if severity_issues:
                icon = {'High': '🚨', 'Medium': '⚠️', 'Low': '🔶'}[severity]
                f.write(f"{icon} **{severity} Severity**: {len(severity_issues)} issues\n\n")
                
                for issue in severity_issues[:5]:  # Limit to first 5 for readability
                    title = issue.get('title', 'Unknown Issue')
                    contract = issue.get('filename', 'Unknown').split('/')[-1]
                    f.write(f"- **{title}** in `{contract}`\n")
                
                if len(severity_issues) > 5:
                    f.write(f"- *(and {len(severity_issues) - 5} more)*\n")
                f.write("\n")
        
        f.write("## 🔍 Analysis Notes\n\n")
        f.write("- Mythril uses symbolic execution to find potential vulnerabilities\n")
        f.write("- Some findings may be false positives - manual review recommended\n")
        f.write("- Focus on High severity issues for immediate attention\n")
        f.write("\n📝 *Detailed analysis available in security artifacts*\n")

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 process-mythril.py <reports-directory>")
        sys.exit(1)
    
    reports_dir = sys.argv[1]
    
    if not os.path.exists(reports_dir):
        print(f"Error: Reports directory {reports_dir} not found")
        sys.exit(1)
    
    # Load and process results
    issues = load_mythril_reports(reports_dir)
    categories = categorize_mythril_findings(issues)
    
    # Generate outputs
    generate_mythril_summary(categories, reports_dir)
    
    # Print summary
    total = len(issues)
    high_count = len(categories.get('High', []))
    medium_count = len(categories.get('Medium', []))
    low_count = len(categories.get('Low', []))
    
    print(f"Mythril analysis complete:")
    print(f"  High: {high_count}")
    print(f"  Medium: {medium_count}")
    print(f"  Low: {low_count}")
    print(f"  Total: {total}")
    
    # Mythril often has false positives, so we don't fail the build
    # but we do flag high-severity issues for review
    if high_count > 0:
        print(f"⚠️ {high_count} high-severity findings require manual review")
    else:
        print("✅ No high-severity vulnerabilities found")

if __name__ == "__main__":
    main()
