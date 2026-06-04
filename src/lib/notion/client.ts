import { Client } from '@notionhq/client';

// Server-side only — never import this in client components
export function getNotionClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token || token.startsWith('secret_YOUR')) {
    throw new Error('NOTION_TOKEN is not configured. Add it to your .env.local and Vercel environment variables.');
  }
  return new Client({ auth: token });
}

export function getContentDbId() {
  const id = process.env.NOTION_CONTENT_DB_ID;
  if (!id || id.startsWith('YOUR_')) {
    throw new Error('NOTION_CONTENT_DB_ID is not configured. Add it to your .env.local and Vercel environment variables.');
  }
  return id;
}
