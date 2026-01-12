#!/usr/bin/env node
/**
 * Lightweight SSR/Module Check
 * Uses Node.js to import modules and catch basic errors
 * WITHOUT launching a browser
 */

import { createServer } from 'vite';

async function checkModules() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   MODULE IMPORT VALIDATION                ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  try {
    // Create Vite server in SSR mode
    const server = await createServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    console.log('1. Testing critical module imports...');

    const modulesToTest = [
      '/src/pages/Priorities.tsx',
      '/src/lib/api.ts',
      '/src/lib/priorities-types.ts',
      '/src/contexts/AuthContext.tsx'
    ];

    for (const modulePath of modulesToTest) {
      try {
        await server.ssrLoadModule(modulePath);
        console.log(`   ✅ ${modulePath}`);
      } catch (error) {
        console.log(`   ❌ ${modulePath}`);
        console.log(`      Error: ${error.message}`);
        await server.close();
        process.exit(1);
      }
    }

    console.log('');
    console.log('✅ All modules load successfully');

    await server.close();
    process.exit(0);

  } catch (error) {
    console.log('');
    console.log('❌ Module validation failed:');
    console.log(error.message);
    process.exit(1);
  }
}

checkModules();
