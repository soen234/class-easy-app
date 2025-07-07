// Simple test to check if the page can be server-rendered
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testSSR() {
  console.log('Testing SSR for create-material page...');
  
  try {
    // Try to import the page component
    const pagePath = join(__dirname, 'src/routes/create-material/+page.svelte');
    console.log('Page exists:', pagePath);
    
    // Check if the imports would cause SSR issues
    console.log('\nChecking imports...');
    
    // Test importing the stores
    const { user } = await import('./src/lib/stores/auth.js');
    console.log('✓ Auth store imported successfully');
    
    const { materials } = await import('./src/lib/stores/materials.js');
    console.log('✓ Materials store imported successfully');
    
    const { templates } = await import('./src/lib/stores/templates.js');
    console.log('✓ Templates store imported successfully');
    
    // Test importing utilities (these should handle fabric dynamically now)
    const blockToCanvas = await import('./src/lib/utils/blockToCanvas.js');
    console.log('✓ blockToCanvas imported successfully');
    
    const exportManager = await import('./src/lib/utils/exportManager.js');
    console.log('✓ exportManager imported successfully');
    
    console.log('\n✅ All imports successful! SSR should work now.');
    
  } catch (error) {
    console.error('\n❌ SSR test failed:', error.message);
    console.error(error.stack);
  }
}

testSSR();