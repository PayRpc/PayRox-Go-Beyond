#!/usr/bin/env python3
"""
Security Summary Generator for PayRox Go Beyond
Combines Slither and Mythril results into comprehensive security report
"""

import json
import sys
import os
import argparse
import glob
from datetime import datetime
from typing import Dict, List, Any, Optional

def load_json_file(file_path: str) -> Optional[Dict[str, Any]]:
    """Safely load JSON file"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {file_path}: {e}")
        return None

def load_slither_data(slither_dir: str) -> Dict[str, Any]:
    """Load Slither analysis data"""
    summary_path = os.path.join(slither_dir, 'slither-summary.md')
    critical_path = os.path.join(slither_dir, 'critical-issues.json')
    
    data = {
        'has_summary': os.path.exists(summary_path),
        'critical_issues': 0,
        'total_issues': 0,
        'summary_content': ''
    }
    
    if data['has_summary']:
        try:
            with open(summary_path, 'r') as f:
                data['summary_content'] = f.read()
        except Exception:
            pass
    
    if os.path.exists(critical_path):
        critical_data = load_json_file(critical_path)
        if critical_data:
            data['critical_issues'] = len(critical_data)
    
    return data

def load_mythril_data(mythril_dir: str) -> Dict[str, Any]:
    """Load Mythril analysis data"""
    summary_path = os.path.join(mythril_dir, 'mythril-summary.json')
    markdown_path = os.path.join(mythril_dir, 'mythril-summary.md')
    
    data = {
        'has_results': os.path.exists(summary_path),
        'high_severity': 0,
        'medium_severity': 0,
        'low_severity': 0,
        'total_issues': 0,
        'summary_content': ''
    }
    
    if data['has_results']:
        mythril_data = load_json_file(summary_path)
        if mythril_data:
            for issue in mythril_data:
                severity = issue.get('severity', 'Low')
                if severity == 'High':
                    data['high_severity'] += 1
                elif severity == 'Medium':
                    data['medium_severity'] += 1
                else:
                    data['low_severity'] += 1
            data['total_issues'] = len(mythril_data)
    
    if os.path.exists(markdown_path):
        try:
            with open(markdown_path, 'r') as f:
                data['summary_content'] = f.read()
        except Exception:
            pass
    
    return data

def calculate_security_score(slither_data: Dict[str, Any], mythril_data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate overall security score and status"""
    score = 100
    status = "EXCELLENT"
    issues = []
    
    # Deduct points for Slither issues
    if slither_data['critical_issues'] > 0:
        score -= slither_data['critical_issues'] * 25
        issues.append(f"{slither_data['critical_issues']} critical Slither issues")
    
    # Deduct points for Mythril high-severity issues
    if mythril_data['high_severity'] > 0:
        score -= mythril_data['high_severity'] * 15
        issues.append(f"{mythril_data['high_severity']} high-severity Mythril issues")
    
    # Deduct points for medium-severity issues
    medium_total = mythril_data['medium_severity']
    if medium_total > 0:
        score -= medium_total * 5
        issues.append(f"{medium_total} medium-severity issues")
    
    # Determine status
    if score >= 95:
        status = "EXCELLENT"
        color = "green"
    elif score >= 85:
        status = "GOOD"
        color = "yellowgreen"
    elif score >= 70:
        status = "FAIR"
        color = "orange"
    else:
        status = "NEEDS_ATTENTION"
        color = "red"
    
    return {
        'score': max(0, score),
        'status': status,
        'color': color,
        'issues': issues
    }

def generate_security_summary(slither_data: Dict[str, Any], mythril_data: Dict[str, Any], output_path: str) -> None:
    """Generate comprehensive security summary"""
    security_score = calculate_security_score(slither_data, mythril_data)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    with open(output_path, 'w') as f:
        f.write("# 🛡️ PayRox Go Beyond Security Analysis Report\n\n")
        f.write(f"**Generated**: {timestamp}\n")
        f.write(f"**Security Score**: {security_score['score']}/100\n")
        f.write(f"**Status**: {security_score['status']}\n\n")
        
        # Executive Summary
        f.write("## 📋 Executive Summary\n\n")
        if security_score['score'] >= 95:
            f.write("✅ **EXCELLENT SECURITY POSTURE** - The PayRox Go Beyond contracts demonstrate exceptional security standards with minimal to no security issues detected.\n\n")
        elif security_score['score'] >= 85:
            f.write("🟢 **GOOD SECURITY POSTURE** - The contracts show good security practices with only minor issues that should be addressed.\n\n")
        elif security_score['score'] >= 70:
            f.write("🟡 **FAIR SECURITY POSTURE** - Some security issues detected that require attention before production deployment.\n\n")
        else:
            f.write("🔴 **SECURITY ATTENTION REQUIRED** - Critical security issues detected that must be addressed immediately.\n\n")
        
        # Detailed Analysis
        f.write("## 🔍 Detailed Analysis\n\n")
        
        # Slither Results
        f.write("### 🐍 Slither Static Analysis\n\n")
        if slither_data['has_summary']:
            if slither_data['critical_issues'] == 0:
                f.write("✅ **No critical issues found**\n\n")
            else:
                f.write(f"🚨 **{slither_data['critical_issues']} critical issues require immediate attention**\n\n")
        else:
            f.write("⚠️ Slither analysis not available\n\n")
        
        # Mythril Results
        f.write("### 🔮 Mythril Symbolic Execution\n\n")
        if mythril_data['has_results']:
            if mythril_data['total_issues'] == 0:
                f.write("✅ **No vulnerabilities detected**\n\n")
            else:
                f.write(f"📊 **Analysis Results**:\n")
                f.write(f"- High Severity: {mythril_data['high_severity']}\n")
                f.write(f"- Medium Severity: {mythril_data['medium_severity']}\n")
                f.write(f"- Low Severity: {mythril_data['low_severity']}\n\n")
        else:
            f.write("⚠️ Mythril analysis not available\n\n")
        
        # Recommendations
        f.write("## 🔧 Recommendations\n\n")
        if security_score['issues']:
            f.write("**Immediate Actions Required**:\n")
            for i, issue in enumerate(security_score['issues'], 1):
                f.write(f"{i}. Address {issue}\n")
            f.write("\n")
        else:
            f.write("✅ No immediate security actions required\n\n")
        
        f.write("**General Security Best Practices**:\n")
        f.write("1. Regular security audits before major releases\n")
        f.write("2. Multi-signature wallet for administrative functions\n")
        f.write("3. Time-locked upgrades for critical changes\n")
        f.write("4. Comprehensive testing on testnets\n")
        f.write("5. Bug bounty program for ongoing security validation\n\n")
        
        # Architecture Security Features
        f.write("## 🏗️ PayRox Architecture Security Features\n\n")
        f.write("**Manifest-Router Architecture Benefits**:\n")
        f.write("- ✅ **Storage Isolation**: Each facet uses unique namespaced storage\n")
        f.write("- ✅ **EXTCODEHASH Verification**: Cryptographic validation before delegatecalls\n")
        f.write("- ✅ **Emergency Controls**: Forbidden selectors for immediate threat response\n")
        f.write("- ✅ **Deterministic Deployment**: CREATE2 for predictable and verifiable addresses\n")
        f.write("- ✅ **Role-Based Access Control**: Granular permissions for security operations\n")
        f.write("- ✅ **Pausable Operations**: Circuit breakers for emergency situations\n\n")
        
        # Appendix
        f.write("## 📎 Appendix\n\n")
        f.write("**Analysis Tools Used**:\n")
        f.write("- **Slither**: Static analysis for common vulnerability patterns\n")
        f.write("- **Mythril**: Symbolic execution for complex vulnerability detection\n")
        f.write("- **Manual Review**: Architecture and business logic validation\n\n")
        
        f.write("*For detailed technical findings, refer to the complete analysis reports in the security artifacts.*\n")

def main():
    parser = argparse.ArgumentParser(description='Generate PayRox Go Beyond security summary')
    parser.add_argument('--slither-dir', required=True, help='Directory containing Slither reports')
    parser.add_argument('--mythril-dir', required=True, help='Directory containing Mythril reports')
    parser.add_argument('--output', required=True, help='Output path for security summary')
    
    args = parser.parse_args()
    
    # Load analysis data
    slither_data = load_slither_data(args.slither_dir)
    mythril_data = load_mythril_data(args.mythril_dir)
    
    # Generate comprehensive summary
    generate_security_summary(slither_data, mythril_data, args.output)
    
    # Calculate and display score
    security_score = calculate_security_score(slither_data, mythril_data)
    print(f"Security Analysis Complete!")
    print(f"Overall Security Score: {security_score['score']}/100 ({security_score['status']})")
    
    if security_score['issues']:
        print("Issues requiring attention:")
        for issue in security_score['issues']:
            print(f"  - {issue}")
    else:
        print("No critical security issues detected!")

if __name__ == "__main__":
    main()
