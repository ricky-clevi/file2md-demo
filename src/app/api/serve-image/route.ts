import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// Serve images from temporary storage with security checks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    const session = searchParams.get('session');
    
    if (!imagePath || !session) {
      return new NextResponse('Missing parameters', { status: 400 });
    }
    
    // Security: validate session format (should be timestamp-based)
    if (!/^\d+-[a-zA-Z0-9]+$/.test(session)) {
      return new NextResponse('Invalid session', { status: 403 });
    }
    
    // Extract timestamp from session and check if it's recent (within 1 hour)
    const timestamp = parseInt(session.split('-')[0]);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    if (now - timestamp > maxAge) {
      // Clean up expired session files asynchronously
      const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
      const sessionImageDir = path.join(tempDir, `${session}-images`);
      
      // Fire and forget cleanup (don't await to avoid blocking response)
      import('fs/promises').then(async (fs) => {
        try {
          if (existsSync(sessionImageDir)) {
            await fs.rm(sessionImageDir, { recursive: true, force: true });
            console.log(`Cleaned up expired session: ${session}`);
          }
        } catch (error) {
          console.error(`Failed to cleanup session ${session}:`, error);
        }
      }).catch(() => {}); // Ignore cleanup errors
      
      return new NextResponse('Session expired', { status: 410 });
    }
    
    // Security: sanitize image path to prevent directory traversal
    const safePath = path.basename(imagePath);
    if (safePath !== imagePath || safePath.includes('..')) {
      return new NextResponse('Invalid path', { status: 403 });
    }
    
    // Construct full path within temp directory structure
    const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
    let fullImagePath = path.join(tempDir, `${session}-images`, safePath);
    
    console.log('Serve image debug:', {
      session,
      imagePath,
      safePath,
      tempDir,
      fullImagePath,
      fileExists: existsSync(fullImagePath)
    });
    
    // Check if file exists
    if (!existsSync(fullImagePath)) {
      // Try alternative paths that file2md might use
      const alternativePaths = [
        path.join(tempDir, `${session}-images`, 'images', safePath), // nested images folder
        path.join(tempDir, session, 'images', safePath), // different session structure
        path.join(tempDir, session, safePath), // direct in session folder
      ];
      
      console.log('Trying alternative paths:', alternativePaths);
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        if (existsSync(altPath)) {
          foundPath = altPath;
          console.log('Found image at alternative path:', altPath);
          break;
        }
      }
      
      if (!foundPath) {
        // List contents of temp directory for debugging
        try {
          const fs = await import('fs/promises');
          const tempContents = await fs.readdir(tempDir);
          console.log('Temp directory contents:', tempContents);
          
          // Try to find session directories
          const sessionDirs = tempContents.filter(item => item.includes(session.split('-')[0]));
          console.log('Session-related directories:', sessionDirs);
        } catch (listError) {
          console.error('Error listing temp directory:', listError);
        }
        
        return new NextResponse('Image not found', { status: 404 });
      }
      
      // Use the found alternative path
      fullImagePath = foundPath;
    }
    
    // Read and serve the image
    const imageBuffer = await readFile(fullImagePath);
    
    // Determine content type based on file extension
    const ext = path.extname(safePath).toLowerCase();
    let contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    
    return new NextResponse(imageBuffer as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Session': session, // For debugging
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}