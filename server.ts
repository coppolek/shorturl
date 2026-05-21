import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";

let db: ReturnType<typeof getFirestore> | null = null;
try {
  const fgConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(fgConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(fgConfigPath, 'utf-8'));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully");
  }
} catch (e) {
  console.error("Failed to load Firebase config", e);
}

// In-memory store fallback if Firebase is not connected
const urlStore = new Map<string, { originalUrl: string; views: number; createdAt: Date; metadata?: any }>();

function generateId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fetchMetadata(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PuulpBot/1.0; +http://puulp.it)',
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    let image = $('meta[property="og:image"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    
    let domain = '';
    try {
      const parsedUrl = new URL(url);
      domain = parsedUrl.hostname;
      
      if (image && !image.startsWith('http')) {
        if (image.startsWith('/')) {
          image = `${parsedUrl.protocol}//${parsedUrl.host}${image}`;
        } else {
          image = `${parsedUrl.protocol}//${parsedUrl.host}/${image}`;
        }
      }
    } catch(e) {}
    
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    
    return { title: title.trim(), image, description: description.trim(), domain, favicon };
  } catch (error) {
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch(e) {}
    const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
    return { title: domain, image: '', description: '', domain, favicon };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup Vite early so we can use it for SSR / OG tag injection
  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  app.use(express.json());

  // API routes FIRST
  app.post("/api/shorten", async (req, res) => {
    const { url, customTitle, customDescription, customImage } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: "Invalid URL. Must start with http or https." });
    }

    const fetchedMetadata = await fetchMetadata(url);
    const metadata = {
      ...fetchedMetadata,
      ...(customTitle ? { title: customTitle } : {}),
      ...(customDescription ? { description: customDescription } : {}),
      ...(customImage ? { image: customImage } : {})
    };

    const id = generateId();
    
    try {
      if (db) {
        await setDoc(doc(db, 'links', id), {
          originalUrl: url,
          views: 0,
          createdAt: new Date().toISOString(),
          metadata: metadata || null
        });
      } else {
        urlStore.set(id, {
          originalUrl: url,
          views: 0,
          createdAt: new Date(),
          metadata: metadata || undefined
        });
      }
    } catch (dbError) {
      console.error("Database write error:", dbError);
      return res.status(500).json({ error: "Failed to save the URL. Please try again." });
    }

    res.json({ id, originalUrl: url });
  });

  app.get("/api/links/:id", async (req, res) => {
    const { id } = req.params;
    
    if (db) {
      const docSnap = await getDoc(doc(db, 'links', id));
      if (docSnap.exists()) {
        return res.json(docSnap.data());
      }
      return res.status(404).json({ error: "Link not found" });
    }

    const linkData = urlStore.get(id);

    if (!linkData) {
      return res.status(404).json({ error: "Link not found" });
    }

    res.json(linkData);
  });

  app.post("/api/links/:id/track", async (req, res) => {
    const { id } = req.params;
    
    if (db) {
      const docRef = doc(db, 'links', id);
      try {
        await updateDoc(docRef, { views: increment(1) });
        const docSnap = await getDoc(docRef);
        return res.json({ success: true, views: docSnap.data()?.views || 1 });
      } catch (err) {
        return res.status(404).json({ error: "Link not found" });
      }
    }

    const linkData = urlStore.get(id);
    if (linkData) {
      linkData.views += 1;
      res.json({ success: true, views: linkData.views });
    } else {
      res.status(404).json({ error: "Link not found" });
    }
  });

  app.get("/api/stats", (req, res) => {
    // Simple stats endpoint
    const stats = Array.from(urlStore.entries()).map(([id, data]) => ({
      id,
      originalUrl: data.originalUrl,
      views: data.views,
      createdAt: data.createdAt,
      metadata: data.metadata
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
    res.json({ stats });
  });

  app.post("/api/links/batch", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid request" });
    }

    if (db) {
      const stats = await Promise.all(ids.map(async id => {
        const docSnap = await getDoc(doc(db!, 'links', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id,
            originalUrl: data.originalUrl,
            views: data.views,
            createdAt: new Date(data.createdAt),
            metadata: data.metadata
          };
        }
        return null;
      }));
      const validStats = stats.filter((item): item is NonNullable<typeof item> => item !== null);
      validStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return res.json({ stats: validStats });
    }

    const stats = ids.map(id => {
      const data = urlStore.get(id);
      if (data) {
        return {
          id,
          originalUrl: data.originalUrl,
          views: data.views,
          createdAt: data.createdAt,
          metadata: data.metadata
        };
      }
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    stats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // newest first
    res.json({ stats });
  });

  // Dynamic OpenGraph handler for shortened links
  app.get("/:id([a-zA-Z0-9]{4,8})", async (req, res, next) => {
    const { id } = req.params;
    let linkData: any = null;

    if (db) {
      const docSnap = await getDoc(doc(db, 'links', id));
      if (docSnap.exists()) {
        linkData = docSnap.data();
      }
    } else {
      linkData = urlStore.get(id);
    }

    if (!linkData || !linkData.metadata) {
      return next(); // Fallback to normal SPA delivery
    }

    const { metadata } = linkData;
    let template = "";

    try {
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
      }

      const $ = cheerio.load(template);
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      
      // Inject primary URL tag
      if ($('meta[property="og:url"]').length) {
        $('meta[property="og:url"]').attr('content', fullUrl);
      } else {
        $('head').append(`<meta property="og:url" content="${fullUrl}">`);
      }
      
      if (metadata.title) {
        $('title').text(metadata.title);
        if ($('meta[property="og:title"]').length) {
          $('meta[property="og:title"]').attr('content', metadata.title);
        } else {
          $('head').append(`<meta property="og:title" content="${metadata.title}">`);
        }
        $('meta[name="twitter:title"]').remove();
        $('head').append(`<meta name="twitter:title" content="${metadata.title}">`);
      }
      
      if (metadata.description) {
        if ($('meta[name="description"]').length) {
          $('meta[name="description"]').attr('content', metadata.description);
        } else {
          $('head').append(`<meta name="description" content="${metadata.description}">`);
        }
        if ($('meta[property="og:description"]').length) {
          $('meta[property="og:description"]').attr('content', metadata.description);
        } else {
          $('head').append(`<meta property="og:description" content="${metadata.description}">`);
        }
        $('meta[name="twitter:description"]').remove();
        $('head').append(`<meta name="twitter:description" content="${metadata.description}">`);
      }
      
      if (metadata.image) {
        if ($('meta[property="og:image"]').length) {
          $('meta[property="og:image"]').attr('content', metadata.image);
        } else {
          $('head').append(`<meta property="og:image" content="${metadata.image}">`);
        }
        $('meta[name="twitter:card"]').remove();
        $('meta[name="twitter:image"]').remove();
        $('head').append(`<meta name="twitter:card" content="summary_large_image">`);
        $('head').append(`<meta name="twitter:image" content="${metadata.image}">`);
      }
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end($.html());
    } catch (e) {
      console.error('Error injecting OG tags:', e);
      next();
    }
  });

  // Vite middleware for development
  if (vite) {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
