import * as fs from 'fs';
import * as path from 'path';
import { TemplateConfig, TemplateMetadata, DAppConfig } from '../types';

/**
 * @title Template Engine
 * @notice Template system for generating dApp scaffolding
 * @dev Handles template discovery, rendering, and dApp project creation
 */
export class TemplateEngine {
  private templates: Map<string, TemplateMetadata> = new Map();
  private templatesPath: string;

  constructor(templatesPath?: string) {
    this.templatesPath = templatesPath || path.join(__dirname, '..', 'templates');
    this.initialize();
  }

  private async initialize() {
    await this.scanTemplates();
  }

  /**
   * @notice Scan for available templates
   */
  private async scanTemplates() {
    try {
      if (!fs.existsSync(this.templatesPath)) {
        fs.mkdirSync(this.templatesPath, { recursive: true });
        return;
      }

      const entries = fs.readdirSync(this.templatesPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const templatePath = path.join(this.templatesPath, entry.name);
          const configPath = path.join(templatePath, 'template.json');
          
          if (fs.existsSync(configPath)) {
            const config: TemplateConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const files = this.getTemplateFiles(templatePath);
            
            this.templates.set(config.name, {
              config,
              path: templatePath,
              files
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scanning templates:', error);
    }
  }

  /**
   * @notice Get all files in a template directory recursively
   */
  private getTemplateFiles(templatePath: string): string[] {
    const files: string[] = [];
    
    const scan = (dir: string, prefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(prefix, entry.name);
        
        if (entry.isDirectory()) {
          scan(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    scan(templatePath);
    return files;
  }

  /**
   * @notice Create a new dApp from template
   * @param name Project name
   * @param options Creation options
   */
  async create(name: string, options: Partial<DAppConfig>): Promise<void> {
    const templateName = options.template;
    
    if (!templateName) {
      throw new Error('Template name is required');
    }

    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const outputPath = path.join(process.cwd(), name);
    
    if (fs.existsSync(outputPath)) {
      throw new Error(`Directory '${name}' already exists`);
    }

    try {
      fs.mkdirSync(outputPath, { recursive: true });
      
      // Copy template files
      await this.copyTemplate(template, outputPath, { name, ...options });
      
      console.log(`✅ dApp '${name}' created successfully from template '${templateName}'`);
      console.log(`📁 Project location: ${outputPath}`);
      console.log('\n📋 Next steps:');
      console.log(`   cd ${name}`);
      console.log('   npm install');
      console.log('   npm run dev');
      
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(outputPath)) {
        fs.rmSync(outputPath, { recursive: true, force: true });
      }
      throw error;
    }
  }

  /**
   * @notice Copy template files with variable substitution
   */
  private async copyTemplate(template: TemplateMetadata, outputPath: string, variables: any): Promise<void> {
    for (const file of template.files) {
      const sourcePath = path.join(template.path, file);
      const targetPath = path.join(outputPath, file);
      
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Read source file
      let content = fs.readFileSync(sourcePath, 'utf8');
      
      // Apply variable substitution
      content = this.processTemplate(content, variables);
      
      // Write to target
      fs.writeFileSync(targetPath, content);
    }
  }

  /**
   * @notice Process template with variable substitution
   * @dev Simple mustache-like template processing
   */
  private processTemplate(content: string, variables: any): string {
    let processed = content;
    
    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(pattern, String(value));
    }
    
    return processed;
  }

  /**
   * @notice List all available templates
   */
  list(): TemplateMetadata[] {
    return Array.from(this.templates.values());
  }

  /**
   * @notice Get template by name
   */
  get(name: string): TemplateMetadata | undefined {
    return this.templates.get(name);
  }

  /**
   * @notice Check if template exists
   */
  exists(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * @notice Get templates by category
   */
  getByCategory(category: string): TemplateMetadata[] {
    return Array.from(this.templates.values())
      .filter(template => template.config.category === category);
  }

  /**
   * @notice Validate template configuration
   */
  validateTemplate(templatePath: string): boolean {
    try {
      const configPath = path.join(templatePath, 'template.json');
      
      if (!fs.existsSync(configPath)) {
        console.error(`Template configuration not found: ${configPath}`);
        return false;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check required fields
      const required = ['name', 'description', 'category', 'contracts'];
      for (const field of required) {
        if (!config[field]) {
          console.error(`Template missing required field: ${field}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating template:', error);
      return false;
    }
  }
}
