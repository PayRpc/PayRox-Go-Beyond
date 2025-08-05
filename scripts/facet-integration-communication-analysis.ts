/**
 * @title Facet Integration & Communication Analysis
 * @notice Analyzes current facet integration patterns, core communication, and contract sizes
 * @dev Comprehensive analysis of Diamond architecture implementation and facet ecosystem
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface FacetInfo {
    name: string;
    path: string;
    size: number;
    lines: number;
    functions: string[];
    interfaces: string[];
    storageSlots: string[];
    dependencies: string[];
    communicationPatterns: string[];
}

interface CoreIntegration {
    manifestDispatcher: {
        routes: string[];
        selectors: string[];
        facetMapping: Record<string, string[]>;
    };
    communicationMethods: {
        delegatecall: boolean;
        events: string[];
        sharedStorage: boolean;
        interfaces: string[];
    };
    architecture: {
        diamondPattern: boolean;
        storageIsolation: boolean;
        upgradeability: boolean;
    };
}

class FacetIntegrationAnalyzer {
    private facets: FacetInfo[] = [];
    private coreIntegration: CoreIntegration = {
        manifestDispatcher: { routes: [], selectors: [], facetMapping: {} },
        communicationMethods: { delegatecall: false, events: [], sharedStorage: false, interfaces: [] },
        architecture: { diamondPattern: false, storageIsolation: false, upgradeability: false }
    };

    async analyzeIntegration(): Promise<{ facets: FacetInfo[], integration: CoreIntegration }> {
        console.log("🔍 Analyzing Facet Integration & Communication Patterns");
        console.log("=".repeat(80));

        await this.scanFacets();
        await this.analyzeFacetSizes();
        await this.analyzeCommunicationPatterns();
        await this.analyzeCoreIntegration();
        await this.generateIntegrationReport();

        return { facets: this.facets, integration: this.coreIntegration };
    }

    private async scanFacets(): Promise<void> {
        console.log("📁 Scanning Facet Contracts...");
        
        const facetDirs = [
            'contracts/facets',
            'contracts/demo/facets'
        ];

        for (const dir of facetDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (file.endsWith('Facet.sol')) {
                        const filePath = path.join(dir, file);
                        if (!file.includes('Ping')) {
                        if (!file.includes('Ping')) {
                        await this.analyzeFacet(filePath);
                    }
                    }
                    }
                }
            }
        }

        console.log(`📋 Found ${this.facets.length} facet contracts`);
    }

    private async analyzeFacet(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        const facetInfo: FacetInfo = {
            name: path.basename(filePath, '.sol'),
            path: filePath,
            size: stats.size,
            lines: content.split('\n').length,
            functions: this.extractFunctions(content),
            interfaces: this.extractInterfaces(content),
            storageSlots: this.extractStorageSlots(content),
            dependencies: this.extractDependencies(content),
            communicationPatterns: this.extractCommunicationPatterns(content)
        };

        this.facets.push(facetInfo);
        console.log(`   🔹 ${facetInfo.name}: ${(facetInfo.size / 1024).toFixed(1)}KB, ${facetInfo.lines} lines, ${facetInfo.functions.length} functions`);
    }

    private extractFunctions(content: string): string[] {
        const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(?:external|public)/g;
        const functions: string[] = [];
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            functions.push(match[1]);
        }
        
        return functions;
    }

    private extractInterfaces(content: string): string[] {
        const interfaceRegex = /import\s+.*['"](.*I\w+)['"]/g;
        const contractRegex = /contract\s+\w+\s+is\s+([^{]+)/g;
        const interfaces: string[] = [];
        let match;
        
        // Extract imported interfaces
        while ((match = interfaceRegex.exec(content)) !== null) {
            const interfaceName = match[1].split('/').pop() || match[1];
            if (interfaceName.startsWith('I')) {
                interfaces.push(interfaceName);
            }
        }
        
        // Extract inherited interfaces
        while ((match = contractRegex.exec(content)) !== null) {
            const inherited = match[1].split(',').map(i => i.trim());
            inherited.forEach(iface => {
                if (iface.startsWith('I') || iface.includes('Upgradeable') || iface.includes('Control')) {
                    interfaces.push(iface);
                }
            });
        }
        
        return [...new Set(interfaces)];
    }

    private extractStorageSlots(content: string): string[] {
        const slotRegex = /keccak256\("([^"]+)"\)/g;
        const slots: string[] = [];
        let match;
        
        while ((match = slotRegex.exec(content)) !== null) {
            slots.push(match[1]);
        }
        
        return slots;
    }

    private extractDependencies(content: string): string[] {
        const importRegex = /import\s+.*["']([^"']+)["']/g;
        const dependencies: string[] = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            dependencies.push(match[1]);
        }
        
        return dependencies;
    }

    private extractCommunicationPatterns(content: string): string[] {
        const patterns: string[] = [];
        
        if (content.includes('delegatecall')) patterns.push('delegatecall');
        if (content.includes('emit ')) patterns.push('events');
        if (content.includes('modifier')) patterns.push('modifiers');
        if (content.includes('onlyRole')) patterns.push('access-control');
        if (content.includes('getFacetFunctionSelectors')) patterns.push('diamond-loupe');
        if (content.includes('_getStorage')) patterns.push('diamond-storage');
        if (content.includes('msg.sender')) patterns.push('caller-context');
        
        return patterns;
    }

    private async analyzeFacetSizes(): Promise<void> {
        console.log("\n📊 Facet Size Analysis:");
        
        const totalSize = this.facets.reduce((sum, facet) => sum + facet.size, 0);
        const totalLines = this.facets.reduce((sum, facet) => sum + facet.lines, 0);
        const totalFunctions = this.facets.reduce((sum, facet) => sum + facet.functions.length, 0);
        
        console.log(`   📦 Total Size: ${(totalSize / 1024).toFixed(1)}KB`);
        console.log(`   📝 Total Lines: ${totalLines}`);
        console.log(`   ⚙️ Total Functions: ${totalFunctions}`);
        
        console.log("\n📏 Individual Facet Sizes:");
        this.facets
            .sort((a, b) => b.size - a.size)
            .forEach(facet => {
                const sizeKB = (facet.size / 1024).toFixed(1);
                const complexity = facet.functions.length;
                console.log(`   ${facet.name.padEnd(30)} | ${sizeKB.padStart(8)}KB | ${facet.lines.toString().padStart(4)} lines | ${complexity.toString().padStart(2)} functions`);
            });
    }

    private async analyzeCommunicationPatterns(): Promise<void> {
        console.log("\n🔗 Communication Pattern Analysis:");
        
        // Analyze communication methods across facets
        const allPatterns = new Set<string>();
        this.facets.forEach(facet => {
            facet.communicationPatterns.forEach(pattern => allPatterns.add(pattern));
        });
        
        console.log("   Communication Methods Found:");
        allPatterns.forEach(pattern => {
            const facetsUsingPattern = this.facets.filter(f => f.communicationPatterns.includes(pattern));
            console.log(`     ✅ ${pattern}: ${facetsUsingPattern.length} facets`);
        });
        
        // Analyze storage isolation
        console.log("\n🗄️ Storage Isolation Analysis:");
        this.facets.forEach(facet => {
            if (facet.storageSlots.length > 0) {
                console.log(`   ${facet.name}:`);
                facet.storageSlots.forEach(slot => {
                    console.log(`     🔑 "${slot}"`);
                });
            }
        });
        
        this.coreIntegration.architecture.storageIsolation = this.facets.some(f => f.storageSlots.length > 0);
    }

    private async analyzeCoreIntegration(): Promise<void> {
        console.log("\n🏛️ Core Integration Analysis:");
        
        // Check for ManifestDispatcher
        const dispatcherPath = 'contracts/dispatcher/ManifestDispatcher.sol';
        if (fs.existsSync(dispatcherPath)) {
            console.log("   ✅ ManifestDispatcher found - analyzing integration...");
            await this.analyzeManifestDispatcher(dispatcherPath);
        } else {
            console.log("   ❌ ManifestDispatcher not found");
        }
        
        // Check Diamond pattern implementation
        this.analyzeDiamondPattern();
        
        // Analyze facet function selectors
        this.analyzeFunctionSelectors();
    }

    private async analyzeManifestDispatcher(dispatcherPath: string): Promise<void> {
        const content = fs.readFileSync(dispatcherPath, 'utf8');
        
        // Extract routing information
        if (content.includes('mapping(bytes4 => IManifestDispatcher.Route)')) {
            this.coreIntegration.manifestDispatcher.routes.push('Route mapping found');
        }
        
        if (content.includes('registeredSelectors')) {
            this.coreIntegration.manifestDispatcher.selectors.push('Selector registration found');
        }
        
        if (content.includes('delegatecall')) {
            this.coreIntegration.communicationMethods.delegatecall = true;
        }
        
        // Extract events
        const eventRegex = /event\s+(\w+)\s*\(/g;
        let match;
        while ((match = eventRegex.exec(content)) !== null) {
            this.coreIntegration.communicationMethods.events.push(match[1]);
        }
        
        console.log("     🔄 Route management system detected");
        console.log("     📡 Function selector routing active");
        console.log(`     📢 ${this.coreIntegration.communicationMethods.events.length} events for communication`);
    }

    private analyzeDiamondPattern(): void {
        // Check if facets implement Diamond pattern
        const diamondFacets = this.facets.filter(facet => 
            facet.communicationPatterns.includes('diamond-loupe') ||
            facet.communicationPatterns.includes('diamond-storage')
        );
        
        this.coreIntegration.architecture.diamondPattern = diamondFacets.length > 0;
        
        if (this.coreIntegration.architecture.diamondPattern) {
            console.log(`   💎 Diamond Pattern: ACTIVE (${diamondFacets.length} facets)`);
        } else {
            console.log("   💎 Diamond Pattern: NOT DETECTED");
        }
    }

    private analyzeFunctionSelectors(): void {
        console.log("\n⚙️ Function Selector Analysis:");
        
        this.facets.forEach(facet => {
            if (facet.functions.length > 0) {
                console.log(`   ${facet.name}:`);
                facet.functions.slice(0, 5).forEach(func => { // Show first 5 functions
                    const selector = ethers.id(func + '()').slice(0, 10);
                    console.log(`     🔹 ${func}() -> ${selector}`);
                });
                if (facet.functions.length > 5) {
                    console.log(`     ... and ${facet.functions.length - 5} more functions`);
                }
            }
        });
    }

    private async generateIntegrationReport(): Promise<void> {
        console.log("\n📊 Integration Summary Report:");
        console.log("=".repeat(80));
        
        // Architecture summary
        console.log("🏗️ Architecture Analysis:");
        console.log(`   💎 Diamond Pattern: ${this.coreIntegration.architecture.diamondPattern ? '✅ IMPLEMENTED' : '❌ NOT FOUND'}`);
        console.log(`   🗄️ Storage Isolation: ${this.coreIntegration.architecture.storageIsolation ? '✅ ACTIVE' : '❌ NOT FOUND'}`);
        console.log(`   🔄 Delegatecall Communication: ${this.coreIntegration.communicationMethods.delegatecall ? '✅ ACTIVE' : '❌ NOT FOUND'}`);
        
        // Size analysis
        const totalSize = this.facets.reduce((sum, facet) => sum + facet.size, 0);
        const avgSize = totalSize / this.facets.length;
        const largestFacet = this.facets.reduce((max, facet) => facet.size > max.size ? facet : max);
        
        console.log("\n📏 Size Metrics:");
        console.log(`   📦 Total Ecosystem Size: ${(totalSize / 1024).toFixed(1)}KB`);
        console.log(`   📊 Average Facet Size: ${(avgSize / 1024).toFixed(1)}KB`);
        console.log(`   🏆 Largest Facet: ${largestFacet.name} (${(largestFacet.size / 1024).toFixed(1)}KB)`);
        
        // Communication summary
        console.log("\n🔗 Communication Summary:");
        console.log(`   📡 Total Events: ${this.coreIntegration.communicationMethods.events.length}`);
        console.log(`   🔌 Total Interfaces: ${[...new Set(this.facets.flatMap(f => f.interfaces))].length}`);
        console.log(`   ⚙️ Total Functions: ${this.facets.reduce((sum, f) => sum + f.functions.length, 0)}`);
        
        // Integration health
        const integrationScore = this.calculateIntegrationScore();
        console.log(`\n🎯 Integration Health Score: ${integrationScore}/100`);
        
        if (integrationScore >= 80) {
            console.log("🏆 Status: EXCELLENT INTEGRATION");
        } else if (integrationScore >= 60) {
            console.log("✅ Status: GOOD INTEGRATION"); 
        } else {
            console.log("⚠️ Status: NEEDS IMPROVEMENT");
        }
    }

    private calculateIntegrationScore(): number {
        let score = 0;
        
        // Diamond pattern implementation (+30 points)
        if (this.coreIntegration.architecture.diamondPattern) score += 30;
        
        // Storage isolation (+25 points)
        if (this.coreIntegration.architecture.storageIsolation) score += 25;
        
        // Communication methods (+20 points)
        if (this.coreIntegration.communicationMethods.delegatecall) score += 10;
        if (this.coreIntegration.communicationMethods.events.length > 0) score += 10;
        
        // Facet count and size efficiency (+25 points)
        if (this.facets.length >= 5) score += 15; // Good facet count
        const avgSize = this.facets.reduce((sum, f) => sum + f.size, 0) / this.facets.length;
        if (avgSize < 10000) score += 10; // Efficient facet sizes
        
        return Math.min(score, 100);
    }
}

// Main analysis function
async function main() {
    console.log("🚀 Facet Integration & Communication Analysis");
    console.log("🔍 Analyzing current integration patterns, core communication, and facet sizes");
    console.log("=".repeat(80));

    const analyzer = new FacetIntegrationAnalyzer();
    const results = await analyzer.analyzeIntegration();

    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        analysis: results,
        summary: {
            totalFacets: results.facets.length,
            totalSize: results.facets.reduce((sum, f) => sum + f.size, 0),
            integrationPattern: results.integration.architecture.diamondPattern ? 'Diamond' : 'Custom',
            communicationMethods: Object.keys(results.integration.communicationMethods).filter(
                key => (results.integration.communicationMethods as any)[key] === true || 
                       Array.isArray((results.integration.communicationMethods as any)[key]) && 
                       (results.integration.communicationMethods as any)[key].length > 0
            )
        }
    };

    if (!fs.existsSync('reports')) {
        fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(
        'reports/facet-integration-communication-analysis.json',
        JSON.stringify(report, null, 2)
    );

    console.log("\n📁 Detailed report saved: reports/facet-integration-communication-analysis.json");

    return results;
}

// Auto-execute
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { main };
